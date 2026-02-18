import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { Pixel } from "@/types/pixel";
import { API_ENDPOINTS } from "@/config/api";
import TeamBudget from "@/components/TeamBudget";
import Leaderboard from "@/components/Leaderboard";

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
  const [lastSetPixelDuration, setLastSetPixelDuration] = useState<number | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);

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

  const setPixel = async (x: number, y: number, team: number, red: number, green: number, blue: number) => {
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
        setSetPixelMessage(`✓ HTTP ${response.status}: ${result.message} (${result.duration}ms)`);
        setTimeout(() => setSetPixelMessage(null), 3000);
        // Fetch updated board state from backend (without showing loading spinner)
        fetchPixels("cache", false);
      } else {
        setLastSetPixelDuration(result.duration);
        
        // MS5: Auto-correct team if player is registered with another team
        if (result.registeredTeam !== undefined) {
          console.log(`[Frontend] Auto-correcting team to ${result.registeredTeam}`);
          setSelectedTeam(result.registeredTeam);
          setSetPixelMessage(`Team automatisch auf Team ${result.registeredTeam} gesetzt (Ihre Registrierung)`);
          setTimeout(() => setSetPixelMessage(null), 5000);
          return;
        }
        
        // Detaillierte Fehlermeldung mit allen verfügbaren Informationen
        const errorDetails = [
          `✗ HTTP ${result.httpStatus || response.status} ${result.statusText || ''}`,
          `Fehler: ${result.error}`,
          result.serverResponse ? `Server: ${result.serverResponse}` : null,
          `Dauer: ${result.duration}ms`
        ].filter(Boolean).join(' | ');
        
        setSetPixelMessage(errorDetails);
        console.error("Pixel setzen fehlgeschlagen:", result);
        setTimeout(() => setSetPixelMessage(null), 8000);
      }
    } catch (err) {
      console.error("Failed to set pixel:", err);
      setSetPixelMessage(`✗ Netzwerkfehler: ${String(err)}`);
      setTimeout(() => setSetPixelMessage(null), 8000);
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
        let message = `${playerStatus} Spieler registriert | ${teamStatus} ${teamName} registriert.`;
        if (details.length > 0) {
          message += `\n\n${details.join('\n')}`;
        }
        
        // Erfolg wenn beide OK sind ODER bereits registriert
        const playerOkOrRegistered = result.results.player.ok || 
          result.results.player.response?.includes("already registered") ||
          result.results.player.status === 409;
        const teamOkOrRegistered = result.results.team.ok || 
          result.results.team.response?.includes("already registered") ||
          result.results.team.status === 409;
        
        if (playerOkOrRegistered && teamOkOrRegistered) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5085';
          if (apiUrl.includes('localhost')) {
            message += `\n\nJetzt im Admin Panel (${apiUrl}/Admin) Team ${selectedTeam} auswählen und 'Start Game' klicken!`;
          }
        }
        
        setRegisterMessage(message);
      } else {
        setRegisterMessage(`✗ Registrierung fehlgeschlagen: ${result.error}`);
      }
    } catch (err) {
      setRegisterMessage(`✗ Fehler: ${String(err)}`);
    } finally {
      setRegistering(false);
      setTimeout(() => setRegisterMessage(null), 15000);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchPixels(method);

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
          // Aktualisiere Pixel-Farben direkt im DOM
          update.pixels.forEach((row: Pixel[], x: number) => {
            row.forEach((pixel: Pixel, y: number) => {
              const element = document.getElementById(`pixel-${x}-${y}`);
              if (element) {
                const { red, green, blue } = pixel.color;
                element.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
              }
            });
          });

          // Aktualisiere auch den State für initiales Rendering und andere UI-Elemente
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

    // Cleanup: Verbindung schließen beim Unmount
    return () => {
      console.log("Schließe SSE-Verbindung");
      eventSource.close();
    };
  }, []);

  const handleMethodChange = (newMethod: "parallel" | "sequential" | "cache") => {
    setMethod(newMethod);
    fetchPixels(newMethod);
  };

  const handlePixelClick = (pixel: Pixel) => {
    setSelectedPixel(pixel);
    // Set the clicked pixel with selected team (color is determined by backend)
    setPixel(pixel.x, pixel.y, selectedTeam, 0, 0, 0);
  };

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <main className="flex flex-col items-center gap-6 w-full max-w-6xl">
        <div className="w-full flex justify-between items-center">
          <h1 className="text-4xl font-bold text-black dark:text-zinc-50">
            Pixelboard
          </h1>
          <div className="flex items-center gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Angemeldet als: <span className="font-semibold">{session?.user?.name || session?.user?.email}</span>
            </p>
            <button
              onClick={() => {
                // Keycloak Federated Logout - auch die Keycloak-Session beenden
                const keycloakIssuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER || "http://localhost:18080/realms/pixelboard-test";
                const idToken = session?.idToken;
                const logoutUrl = `${keycloakIssuer}/protocol/openid-connect/logout` +
                  `?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}` +
                  (idToken ? `&id_token_hint=${idToken}` : "");

                // Erst lokale Session löschen, dann zu Keycloak-Logout weiterleiten
                signOut({ redirect: false }).then(() => {
                  window.location.href = logoutUrl;
                });
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>

        {/* SSE-Verbindungsstatus */}
        <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
          sseConnected
            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
            : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100"
        }`}>
          <div className={`w-2 h-2 rounded-full ${sseConnected ? "bg-green-600 animate-pulse" : "bg-red-600"}`}></div>
          <span className="text-sm font-medium">
            {sseConnected ? "Live-Updates aktiv (SSE)" : "Live-Updates getrennt"}
          </span>
        </div>

        {/* Methodenauswahl */}
        <div className="flex gap-4">
          <button
            onClick={() => handleMethodChange("cache")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              method === "cache"
                ? "bg-green-600 text-white"
                : "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            Cache (Backend)
          </button>
          <button
            onClick={() => handleMethodChange("parallel")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              method === "parallel"
                ? "bg-blue-600 text-white"
                : "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            Parallel
          </button>
          <button
            onClick={() => handleMethodChange("sequential")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              method === "sequential"
                ? "bg-blue-600 text-white"
                : "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            Sequentiell
          </button>
        </div>

        {/* Performance Statistiken */}
        <div className="w-full max-w-2xl p-6 rounded-lg shadow-lg border-2 border-blue-200 dark:border-blue-800">
          <h2 className="text-xl font-bold text-black dark:text-black">
            Performance Messungen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GET Request Dauer */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                GET alle Pixels (16x16 = 256)
              </p>
              <p className="text-2xl font-bold text-black-600 dark:text-white-400">
                {data ? `${data.duration}ms` : '-'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                Methode: {data?.method || '-'}
              </p>
            </div>

            {/* POST Request Dauer */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                POST einzelnes Pixel
              </p>
              <p className="text-2xl font-bold text-white-600 dark:text-white-400">
                {lastSetPixelDuration !== null ? `${lastSetPixelDuration}ms` : '-'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                Letzter Request
              </p>
            </div>
          </div>
        </div>

        {/* Team Budget & Leaderboard */}
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Budget */}
          <div className="lg:col-span-1">
            <TeamBudget teamId={selectedTeam} autoRefresh={true} refreshInterval={5000} />
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-2">
            <Leaderboard autoRefresh={true} refreshInterval={10000} />
          </div>
        </div>

        {/* Pixel setzen - Team auswählen */}
        <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">
            Pixel setzen
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Wählen Sie ein Team und klicken Sie auf ein Pixel, um es zu setzen. Die Farbe wird automatisch basierend auf dem Team zugewiesen.
          </p>

          {/* Team Auswahl */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Team (0-16):
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="16"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(parseInt(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
              <button
                onClick={registerTeam}
                disabled={registering}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors whitespace-nowrap"
              >
                {registering ? "Registriere..." : "Team Registrieren"}
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Wenn "Team X is not registered" erscheint, klicken Sie auf "Team Registrieren"
            </p>
          </div>

          {/* Registrierungs-Nachricht */}
          {registerMessage && (
            <div className={`mb-4 p-4 rounded-lg border-2 ${
              registerMessage.includes("✓")
                ? "bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-900 dark:text-blue-100"
                : "bg-red-50 dark:bg-red-950 border-red-500 text-red-900 dark:text-red-100"
            }`}>
              <p className="text-sm whitespace-pre-line">{registerMessage}</p>
            </div>
          )}

          {/* Status Nachricht */}
          {setPixelMessage && (
            <div className={`mt-4 p-4 rounded-lg border-2 ${
              setPixelMessage.includes("✓")
                ? "bg-green-50 dark:bg-green-950 border-green-500 text-green-900 dark:text-green-100"
                : "bg-red-50 dark:bg-red-950 border-red-500 text-red-900 dark:text-red-100"
            }`}>
              <div className="font-mono text-sm whitespace-pre-wrap break-all">
                {setPixelMessage}
              </div>
            </div>
          )}          
        </div>

        <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900 w-full">
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-300 border-t-blue-600"></div>
              <p className="text-zinc-600 dark:text-zinc-400">
                Lade Pixels ({method})...
              </p>
            </div>
          ) : error ? (
            <div className="text-red-600 dark:text-red-400">
              <p className="font-bold">Fehler beim Laden:</p>
              <p>{error}</p>
            </div>
          ) : data ? (
            <div className="flex flex-col gap-6">
              {/* Info Box */}
              <div className="flex flex-wrap gap-4 justify-center text-sm text-zinc-700 dark:text-zinc-300">
                <p>
                  <span className="font-semibold">Methode:</span> {data.method}
                </p>
                <p>
                  <span className="font-semibold">Dauer:</span> {data.duration}ms
                </p>
                <p>
                  <span className="font-semibold">Board:</span> {data.boardSize}x
                  {data.boardSize}
                </p>
              </div>

              {/* Pixel-Info bei Klick */}
              {selectedPixel && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    Ausgewähltes Pixel:
                  </p>
                  <p className="text-blue-800 dark:text-blue-200">
                    Position: ({selectedPixel.x}, {selectedPixel.y})
                  </p>
                  <p className="text-blue-800 dark:text-blue-200">
                    RGB: ({selectedPixel.color.red}, {selectedPixel.color.green},{" "}
                    {selectedPixel.color.blue})
                  </p>
                </div>
              )}

              {/* Graphische Darstellung des Pixelboards */}
              <div className="flex justify-center">
                <div className="board-container">
                  {data.pixels.map((row, x) =>
                    row.map((pixel, y) => (
                      <div
                        key={`${x}-${y}`}
                        id={`pixel-${x}-${y}`}
                        className="pixel"
                        style={{
                          backgroundColor: `rgb(${pixel.color.red}, ${pixel.color.green}, ${pixel.color.blue})`,
                        }}
                        onClick={() => handlePixelClick(pixel)}
                        title={`(${pixel.x}, ${pixel.y})`}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Textdarstellung */}
              <details className="border-t pt-4 border-zinc-200 dark:border-zinc-800">
                <summary className="cursor-pointer font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                  Textdarstellung (zum Aufklappen)
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 max-h-96 overflow-auto">
                  {data.pixels.flat().map((pixel, index) => (
                    <div
                      key={index}
                      className="text-xs p-2 rounded bg-zinc-100 dark:bg-zinc-800"
                    >
                      <p>
                        <span className="font-semibold">Position:</span> ({pixel.x}
                        ,{pixel.y})
                      </p>
                      <p>
                        <span className="font-semibold">RGB:</span> (
                        {pixel.color.red}, {pixel.color.green},{" "}
                        {pixel.color.blue})
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ) : (
            <p className="text-zinc-600 dark:text-zinc-400">Keine Daten</p>
          )}
        </div>
      </main>
    </div>
  );
}


