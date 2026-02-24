import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { Pixel } from "@/types/pixel";
import { API_ENDPOINTS } from "@/config/api";
import TeamBudget from "@/components/TeamBudget";
import Leaderboard from "@/components/Leaderboard";
import CompactTeamOverview from "@/components/CompactTeamOverview";
import Toast from "@/components/Toast";
import { TeamService } from "@/services/teamService";
import type { TeamInfo, TeamGameInfo } from "@/types/team";

interface PixelsResponse {
  pixels: Pixel[][];
  method: string;
  duration: number;
  boardSize: number;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<PixelsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"parallel" | "sequential" | "cache">("cache");
  const [selectedPixel, setSelectedPixel] = useState<Pixel | null>(null);
  const [selectedTeam, setSelectedTeam] = useState(3);
  const [setPixelMessage, setSetPixelMessage] = useState<string | null>(null);
  const [setPixelMessageType, setSetPixelMessageType] = useState<"success" | "error" | "info">("info");
  const [lastSetPixelDuration, setLastSetPixelDuration] = useState<number | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [registerMessageType, setRegisterMessageType] = useState<"success" | "error" | "info">("info");
  const [viewMode, setViewMode] = useState<"competitive" | "full">("competitive");
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [teamGameInfo, setTeamGameInfo] = useState<TeamGameInfo | null>(null);
  const [currentBudget, setCurrentBudget] = useState<number>(0);
  const [autoPaintMode, setAutoPaintMode] = useState<boolean>(false);
  const [pixelQueue, setPixelQueue] = useState<Array<{x: number, y: number}>>([]); 
  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);

  const fetchPixels = (fetchMethod: "parallel" | "sequential" | "cache" = method, showLoading: boolean = true) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    fetch(`${API_ENDPOINTS.pixels}?method=${fetchMethod}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((responseData: PixelsResponse) => {
        setData(responseData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch pixels:", err);
        setError(err.message);
        setLoading(false);
      });
  };

  const setPixel = async (x: number, y: number, team: number, red: number, green: number, blue: number): Promise<boolean> => {
    try {
      const response = await fetch("/api/setPixel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ x, y, team, red, green, blue }),
      });

      const result = await response.json();

      // Show server response with HTTP status and duration
      if (result.success) {
        setLastSetPixelDuration(result.duration);
        setSetPixelMessage(`Pixel gesetzt (${result.duration}ms)`);
        setSetPixelMessageType("success");
        setTimeout(() => setSetPixelMessage(null), 3000);
        
        // Budget reduzieren nach erfolgreichem POST
        setCurrentBudget(prev => Math.max(0, prev - 1));
        
        // Sofort refresh triggern für instant feedback
        fetchPixels(method, false);
        
        return true;
      } else {
        setLastSetPixelDuration(result.duration);
        
        // MS5: Auto-correct team if player is registered with another team
        if (result.registeredTeam !== undefined) {
          console.log(`[Frontend] Auto-correcting team to ${result.registeredTeam}`);
          setSelectedTeam(result.registeredTeam);
          setSetPixelMessage(`Team automatisch auf Team ${result.registeredTeam} gesetzt`);
          setSetPixelMessageType("info");
          setTimeout(() => setSetPixelMessage(null), 5000);
          return;
        }
        
        // Detaillierte Fehlermeldung mit allen verfügbaren Informationen
        const errorDetails = [
          `HTTP ${result.httpStatus || response.status}`,
          result.error,
          result.serverResponse,
        ].filter(Boolean).join('\n');
        
        setSetPixelMessage(errorDetails);
        setSetPixelMessageType("error");
        console.error("Pixel setzen fehlgeschlagen:", result);
        setTimeout(() => setSetPixelMessage(null), 8000);
        
        return false;
      }
    } catch (err) {
      console.error("Failed to set pixel:", err);
      setSetPixelMessage(`Netzwerkfehler: ${String(err)}`);
      setSetPixelMessageType("error");
      setTimeout(() => setSetPixelMessage(null), 8000);
      
      return false;
    }
  };

  const registerTeam = async () => {
    setRegistering(true);
    setRegisterMessage(null);
    
    try {
      // Team-Name: Nutze NEXT_PUBLIC_TEAM_NAME falls gesetzt, sonst "Team {nummer}"
      const teamName = process.env.NEXT_PUBLIC_TEAM_NAME || `Team ${selectedTeam}`;
      
      const response = await fetch("/api/register-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamName }),
      });

      const result = await response.json();

      if (result.success) {
        const playerStatus = result.results.player.ok ? "✓" : "✗";
        const teamStatus = result.results.team.ok ? "✓" : "✗";
        
        const details = [];
        if (!result.results.player.ok) {
          // Prüfe ob Spieler bereits registriert ist
          if (result.results.player.response?.includes("already registered") || 
              result.results.player.status === 409) {
            details.push(`Spieler: Bereits registriert (OK)`);
          } else {
            details.push(`Spieler: HTTP ${result.results.player.status} - ${result.results.player.response}`);
          }
        }
        if (!result.results.team.ok) {
          // Prüfe ob Team bereits registriert ist
          if (result.results.team.response?.includes("already registered") || 
              result.results.team.status === 409) {
            details.push(`Team: Bereits registriert (OK)`);
          } else {
            details.push(`Team: HTTP ${result.results.team.status} - ${result.results.team.response}`);
          }
        }
        
        const teamName = process.env.NEXT_PUBLIC_TEAM_NAME || `Team ${selectedTeam}`;
        let message = `Spieler registriert | ${teamName} registriert`;
        
        // Erfolg wenn beide OK sind ODER bereits registriert
        const playerOkOrRegistered = result.results.player.ok || 
          result.results.player.response?.includes("already registered") ||
          result.results.player.status === 409;
        const teamOkOrRegistered = result.results.team.ok || 
          result.results.team.response?.includes("already registered") ||
          result.results.team.status === 409;
        
        setRegisterMessage(message);
        setRegisterMessageType(playerOkOrRegistered && teamOkOrRegistered ? "success" : "info");
      } else {
        setRegisterMessage(`Registrierung fehlgeschlagen: ${result.error}`);
        setRegisterMessageType("error");
      }
    } catch (err) {
      setRegisterMessage(`Fehler: ${String(err)}`);
      setRegisterMessageType("error");
    } finally {
      setRegistering(false);
      setTimeout(() => setRegisterMessage(null), 15000);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchPixels(method);

    // Extrem schneller Auto-Refresh für fast-realtime (100ms)
    const refreshInterval = setInterval(() => {
      fetchPixels(method, false); // false = kein Loading-Spinner
    }, 100); // Alle 100ms = 10x pro Sekunde!

    // SSE-Verbindung aufbauen
    console.log("Baue SSE-Verbindung auf...");
    const eventSource = new EventSource("/api/sse-pixels");

    eventSource.onopen = () => {
      console.log("SSE-Verbindung hergestellt");
      setSseConnected(true);
    };

    eventSource.onmessage = (event) => {
      console.log("SSE-Update erhalten");
      try {
        const update = JSON.parse(event.data);
        if (update.pixels) {
          // Direkt DOM updaten für maximale Performance
          update.pixels.forEach((row: Pixel[], x: number) => {
            row.forEach((pixel: Pixel, y: number) => {
              const element = document.getElementById(`pixel-${x}-${y}`);
              if (element) {
                const { red, green, blue } = pixel.color;
                element.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
              }
            });
          });

          // State Update
          setData((prevData) => ({
            pixels: update.pixels,
            method: "sse",
            duration: prevData?.duration || 0,
            boardSize: update.pixels.length,
          }));
          setLoading(false);
        }
      } catch (err) {
        console.error("Fehler beim Parsen der SSE-Daten:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE-Fehler:", err);
      setSseConnected(false);
      // Bei Fehler versuchen wir es mit normalem Polling
      setError("SSE-Verbindung unterbrochen");
    };

    // Cleanup: Verbindung schließen und Interval stoppen beim Unmount
    return () => {
      console.log("Schließe SSE-Verbindung und Auto-Refresh");
      eventSource.close();
      clearInterval(refreshInterval);
    };
  }, []);

  const handleMethodChange = (newMethod: "parallel" | "sequential" | "cache") => {
    setMethod(newMethod);
    fetchPixels(newMethod);
  };

  const handlePixelClick = (pixel: Pixel) => {
    setSelectedPixel(pixel);
    
    // Validierung: Prüfe ob Teamfarbe geladen ist
    if (!teamInfo?.color) {
      setSetPixelMessage("Team-Farbe wird geladen...");
      setSetPixelMessageType("info");
      setTimeout(() => setSetPixelMessage(null), 2000);
      return;
    }
    
    const { red, green, blue } = teamInfo.color;
    
    // Optional: Warnung wenn Pixel visuell schon in eigener Farbe (aber trotzdem durchlassen)
    const isSameColor = pixel.color.red === red && 
                        pixel.color.green === green && 
                        pixel.color.blue === blue;
    
    if (isSameColor) {
      console.log(`[Info] Pixel (${pixel.x},${pixel.y}) scheint schon in Teamfarbe, versuche trotzdem...`);
      // Keine Blockierung - Server entscheidet
    }
    
    // Auto-Paint Mode: Zu Queue hinzufügen
    if (autoPaintMode) {
      // Prüfe ob Pixel bereits in Queue
      const isInQueue = pixelQueue.some(p => p.x === pixel.x && p.y === pixel.y);
      if (isInQueue) {
        setSetPixelMessage("Pixel bereits in Queue!");
        setSetPixelMessageType("info");
        setTimeout(() => setSetPixelMessage(null), 2000);
        return;
      }
      
      setPixelQueue(prev => [...prev, { x: pixel.x, y: pixel.y }]);
      setSetPixelMessage(`Pixel zur Queue hinzugefügt (${pixelQueue.length + 1} in Warteschlange)`);
      setSetPixelMessageType("info");
      setTimeout(() => setSetPixelMessage(null), 2000);
      return;
    }
    
    // Normal Mode: Validierung ob genug Budget
    if (currentBudget <= 0) {
      setSetPixelMessage("Kein Farbbudget mehr! Warte auf Regeneration...");
      setSetPixelMessageType("error");
      setTimeout(() => setSetPixelMessage(null), 3000);
      return;
    }
    
    // Alles OK: Pixel setzen
    setPixel(pixel.x, pixel.y, selectedTeam, red, green, blue);
  };

  // Load team color when selectedTeam changes
  useEffect(() => {
    const loadTeamInfo = async () => {
      const info = await TeamService.getTeamInfo(selectedTeam);
      if (info) {
        setTeamInfo(info);
        console.log(`Team ${selectedTeam} Farbe geladen: RGB(${info.color.red}, ${info.color.green}, ${info.color.blue})`);
      } else {
        setTeamInfo(null);
      }
    };
    loadTeamInfo();
  }, [selectedTeam]);

  // Load and refresh team game info (budget)
  useEffect(() => {
    const loadGameInfo = async () => {
      const gameInfo = await TeamService.getTeamGameInfo(selectedTeam);
      if (gameInfo) {
        setTeamGameInfo(gameInfo);
        setCurrentBudget(gameInfo.colorBudget);
        console.log(`Team ${selectedTeam} Budget: ${gameInfo.colorBudget}%`);
      }
    };
    
    loadGameInfo();
    
    // Refresh budget alle 5 Sekunden
    const interval = setInterval(loadGameInfo, 5000);
    return () => clearInterval(interval);
  }, [selectedTeam]);

  // Auto-Paint Queue Processor
  useEffect(() => {
    if (!autoPaintMode || pixelQueue.length === 0 || isProcessingQueue || currentBudget <= 0 || !teamInfo?.color) {
      return;
    }
    
    const processQueue = async () => {
      setIsProcessingQueue(true);
      
      const nextPixel = pixelQueue[0];
      const { red, green, blue } = teamInfo.color;
      
      console.log(`[Auto-Paint] Verarbeite Pixel (${nextPixel.x}, ${nextPixel.y}), Queue: ${pixelQueue.length}, Budget: ${currentBudget}`);
      
      const success = await setPixel(nextPixel.x, nextPixel.y, selectedTeam, red, green, blue);
      
      // Entferne Pixel aus Queue (egal ob erfolgreich oder nicht)
      setPixelQueue(prev => prev.slice(1));
      
      setIsProcessingQueue(false);
      
      if (success) {
        console.log(`[Auto-Paint] Pixel erfolgreich gesetzt, verbleibend: ${pixelQueue.length - 1}`);
      } else {
        console.log(`[Auto-Paint] Pixel setzen fehlgeschlagen, überspringe`);
      }
    };
    
    // Kurze Verzögerung zwischen Pixels um Server nicht zu überlasten
    const timeout = setTimeout(processQueue, 500);
    return () => clearTimeout(timeout);
  }, [autoPaintMode, pixelQueue, isProcessingQueue, currentBudget, teamInfo, selectedTeam]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("keycloak", { callbackUrl: window.location.href });
    }

    // MS4: Auto-set team from JWT token
    if (session && (session as any).team !== undefined) {
      const jwtTeam = parseInt((session as any).team);
      if (!isNaN(jwtTeam) && jwtTeam !== selectedTeam) {
        console.log(`[MS4] Auto-setting team from JWT token: ${jwtTeam}`);
        setSelectedTeam(jwtTeam);
      }
    }

    // JWT Token (id_token) in Konsole ausgeben für Aufgabe 5
    if (session?.idToken) {
      console.log("=== JWT ID Token ===");
      console.log(session.idToken);
      console.log("Decode auf https://jwt.io für Details");
    }
  }, [status, session]);

  // Auto-set method to cache in competitive mode
  useEffect(() => {
    if (viewMode === "competitive" && method !== "cache") {
      setMethod("cache");
      fetchPixels("cache", false);
    }
  }, [viewMode]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-300 border-t-blue-600"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Authentifizierung prüfen...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated (should redirect anyway)
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      {/* Toast Notifications */}
      {setPixelMessage && (
        <Toast
          message={setPixelMessage}
          type={setPixelMessageType}
          onClose={() => setSetPixelMessage(null)}
        />
      )}
      {registerMessage && (
        <Toast
          message={registerMessage}
          type={registerMessageType}
          onClose={() => setRegisterMessage(null)}
        />
      )}

      {/* Header */}
      <header className="bg-zinc-800/80 backdrop-blur-sm border-b border-zinc-700 sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">Pixelboard</h1>
            <div className={`px-3 py-1 rounded-full flex items-center gap-2 text-xs ${
              sseConnected ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"
            }`}>
              <div className={`w-2 h-2 rounded-full ${sseConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}></div>
              {sseConnected ? "Live" : "Offline"}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Mode Switch */}
            <div className="flex bg-zinc-700/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode("competitive")}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === "competitive" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Competitive
              </button>
              <button
                onClick={() => setViewMode("full")}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === "full" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Full
              </button>
            </div>
            
            <span className="text-sm text-zinc-400">{session?.user?.name || session?.user?.email}</span>
            <button
              onClick={() => {
                const keycloakIssuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER || "http://localhost:18080/realms/pixelboard-test";
                const idToken = session?.idToken;
                const logoutUrl = `${keycloakIssuer}/protocol/openid-connect/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}${idToken ? `&id_token_hint=${idToken}` : ""}`;
                signOut({ redirect: false }).then(() => window.location.href = logoutUrl);
              }}
              className="px-3 py-1 bg-red-600/80 hover:bg-red-600 rounded text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-screen-2xl mx-auto p-4 flex gap-4">
        {/* Sidebar - Team Overview (Competitive Mode) */}
        {viewMode === "competitive" && (
          <aside className="w-64 flex-shrink-0 space-y-4">
            <CompactTeamOverview currentTeamId={selectedTeam} autoRefresh={true} refreshInterval={5000} />
            
            {/* Quick Team Controls */}
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-700 p-3">
              <h3 className="text-sm font-bold mb-2">Dein Team</h3>
              <div className="space-y-2">
                <input
                  type="number"
                  min="0"
                  max="16"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                />
                <button
                  onClick={registerTeam}
                  disabled={registering}
                  className="w-full px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded transition-colors"
                >
                  {registering ? "..." : "Registrieren"}
                </button>
              </div>
            </div>

            {/* Auto-Paint Mode */}
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-700 p-3">
              <h3 className="text-sm font-bold mb-2">Auto-Paint Mode</h3>
              <button
                onClick={() => {
                  setAutoPaintMode(!autoPaintMode);
                  if (autoPaintMode) {
                    // Beim Deaktivieren Queue leeren?
                    if (pixelQueue.length > 0 && !confirm(`${pixelQueue.length} Pixel in Queue. Wirklich abbrechen?`)) {
                      return;
                    }
                    setPixelQueue([]);
                  }
                }}
                className={`w-full px-3 py-2 text-sm rounded transition-colors ${
                  autoPaintMode 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                }`}
              >
                {autoPaintMode ? "🟢 Auto-Paint AN" : "⚫ Auto-Paint AUS"}
              </button>
              
              {autoPaintMode && (
                <div className="mt-3 p-2 bg-zinc-800/50 rounded text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Queue:</span>
                    <span className="font-bold text-blue-400">{pixelQueue.length} Pixel</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Budget:</span>
                    <span className={`font-bold ${currentBudget > 0 ? "text-green-400" : "text-red-400"}`}>
                      {currentBudget}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Status:</span>
                    <span className={`font-bold ${
                      isProcessingQueue ? "text-yellow-400" : 
                      pixelQueue.length > 0 && currentBudget > 0 ? "text-green-400" : 
                      "text-zinc-500"
                    }`}>
                      {isProcessingQueue ? "Verarbeitet..." : 
                       pixelQueue.length > 0 && currentBudget > 0 ? "Läuft" :
                       pixelQueue.length > 0 ? "Warte auf Budget" :
                       "Bereit"}
                    </span>
                  </div>
                  {pixelQueue.length > 0 && (
                    <button
                      onClick={() => setPixelQueue([])}
                      className="w-full mt-2 px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded text-xs transition-colors"
                    >
                      Queue leeren
                    </button>
                  )}
                </div>
              )}
              
              <p className="mt-2 text-xs text-zinc-500">
                {autoPaintMode 
                  ? "Klicke Pixel um sie zur Queue zu fügen. Sie werden automatisch eingefärbt sobald Budget verfügbar." 
                  : "Aktiviere Auto-Paint um mehrere Pixel vorzumerken."}
              </p>
            </div>

            {/* Stats */}
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-700 p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">GET Request</span>
                <span className="font-mono text-zinc-200">{data?.duration || "-"}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">POST Request</span>
                <span className="font-mono text-zinc-200">{lastSetPixelDuration !== null ? `${lastSetPixelDuration}ms` : "-"}</span>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 space-y-4">
          {/* Full Mode - Leaderboard + Controls */}
          {viewMode === "full" && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <TeamBudget teamId={selectedTeam} autoRefresh={true} refreshInterval={5000} />
                </div>
                <div className="col-span-2">
                  <Leaderboard autoRefresh={true} refreshInterval={10000} />
                </div>
              </div>

              {/* Team Controls + Method Selection */}
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-700 p-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Team Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Team (0-16):</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max="16"
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(parseInt(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                      />
                      <button
                        onClick={registerTeam}
                        disabled={registering}
                        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded transition-colors"
                      >
                        {registering ? "..." : "Registrieren"}
                      </button>
                    </div>
                  </div>

                  {/* Method Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Lademethode:</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMethodChange("cache")}
                        className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                          method === "cache" ? "bg-green-600 text-white" : "bg-zinc-700 hover:bg-zinc-600"
                        }`}
                      >
                        Cache
                      </button>
                      <button
                        onClick={() => handleMethodChange("parallel")}
                        className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                          method === "parallel" ? "bg-blue-600 text-white" : "bg-zinc-700 hover:bg-zinc-600"
                        }`}
                      >
                        Parallel
                      </button>
                      <button
                        onClick={() => handleMethodChange("sequential")}
                        className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                          method === "sequential" ? "bg-blue-600 text-white" : "bg-zinc-700 hover:bg-zinc-600"
                        }`}
                      >
                        Sequential
                      </button>
                    </div>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-zinc-800/50 p-3 rounded">
                    <p className="text-xs text-zinc-400 mb-1">GET Request (alle Pixels)</p>
                    <p className="text-lg font-bold">{data?.duration || "-"}ms</p>
                    <p className="text-xs text-zinc-500">Methode: {data?.method || "-"}</p>
                  </div>
                  <div className="bg-zinc-800/50 p-3 rounded">
                    <p className="text-xs text-zinc-400 mb-1">POST Request (Pixel setzen)</p>
                    <p className="text-lg font-bold">{lastSetPixelDuration !== null ? `${lastSetPixelDuration}ms` : "-"}</p>
                  </div>
                </div>

                {/* Auto-Paint Controls (Full View) */}
                <div className="mt-4 bg-zinc-800/50 p-3 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold">Auto-Paint Mode</h4>
                    <button
                      onClick={() => {
                        setAutoPaintMode(!autoPaintMode);
                        if (autoPaintMode && pixelQueue.length > 0) {
                          if (!confirm(`${pixelQueue.length} Pixel in Queue. Wirklich abbrechen?`)) {
                            return;
                          }
                          setPixelQueue([]);
                        }
                      }}
                      className={`px-4 py-1 text-xs rounded transition-colors ${
                        autoPaintMode 
                          ? "bg-green-600 hover:bg-green-700 text-white" 
                          : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                      }`}
                    >
                      {autoPaintMode ? "🟢 AN" : "⚫ AUS"}
                    </button>
                  </div>
                  
                  {autoPaintMode && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Queue:</span>
                        <span className="font-bold text-blue-400">{pixelQueue.length} px</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Budget:</span>
                        <span className={`font-bold ${currentBudget > 0 ? "text-green-400" : "text-red-400"}`}>
                          {currentBudget}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Status:</span>
                        <span className={`font-bold text-xs ${
                          isProcessingQueue ? "text-yellow-400" : 
                          pixelQueue.length > 0 && currentBudget > 0 ? "text-green-400" : 
                          "text-zinc-500"
                        }`}>
                          {isProcessingQueue ? "⚙️ Processing" : 
                           pixelQueue.length > 0 && currentBudget > 0 ? "▶️ Läuft" :
                           pixelQueue.length > 0 ? "⏸️ Warte" :
                           "✓ Bereit"}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {autoPaintMode && pixelQueue.length > 0 && (
                    <button
                      onClick={() => setPixelQueue([])}
                      className="mt-2 px-3 py-1 bg-red-600/50 hover:bg-red-600 rounded text-xs transition-colors"
                    >
                      Queue leeren
                    </button>
                  )}
                  
                  <p className="mt-2 text-xs text-zinc-500">
                    {autoPaintMode 
                      ? "Klicke Pixel um sie zur Queue zu fügen. Sie werden automatisch eingefärbt sobald Budget verfügbar." 
                      : "Aktiviere Auto-Paint um mehrere Pixel vorzumerken und automatisch einfärben zu lassen."}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Board */}
          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-700 p-6">
            {loading ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-700 border-t-blue-600"></div>
                <p className="text-zinc-400">Lade Board...</p>
              </div>
            ) : error ? (
              <div className="text-red-400 text-center py-12">
                <p className="font-bold">Fehler</p>
                <p>{error}</p>
              </div>
            ) : data ? (
              <div className="flex flex-col items-center gap-4">
                <div className="board-container">
                  {data.pixels.map((row, x) =>
                    row.map((pixel, y) => (
                      <div
                        key={`${x}-${y}`}
                        className="pixel"
                        style={{
                          backgroundColor: `rgb(${pixel.color.red}, ${pixel.color.green}, ${pixel.color.blue})`,
                        }}
                        onClick={() => handlePixelClick(pixel)}
                      />
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}


