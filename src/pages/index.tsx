import { useEffect, useState } from "react";
import type { Pixel } from "@/types/pixel";
import { API_ENDPOINTS } from "@/config/api";

interface PixelsResponse {
  pixels: Pixel[][];
  method: string;
  duration: number;
  boardSize: number;
}

export default function Home() {
  const [data, setData] = useState<PixelsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"parallel" | "sequential" | "cache">("cache");
  const [selectedPixel, setSelectedPixel] = useState<Pixel | null>(null);
  const [selectedTeam, setSelectedTeam] = useState(3);
  const [setPixelMessage, setSetPixelMessage] = useState<string | null>(null);
  const [lastSetPixelDuration, setLastSetPixelDuration] = useState<number | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

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
        setSetPixelMessage(`HTTP ${response.status}: ${result.message} (${result.duration}ms)`);
        setTimeout(() => setSetPixelMessage(null), 3000);
        // Fetch updated board state from backend (without showing loading spinner)
        fetchPixels("cache", false);
      } else {
        setLastSetPixelDuration(result.duration);
        setSetPixelMessage(`HTTP ${response.status}: ${result.error} (${result.duration}ms)`);
        setTimeout(() => setSetPixelMessage(null), 5000);
      }
    } catch (err) {
      console.error("Failed to set pixel:", err);
      setSetPixelMessage(`Error: ${String(err)}`);
      setTimeout(() => setSetPixelMessage(null), 5000);
    }
  };

  useEffect(() => {
    // Set initial pixel (3, 3) with team 3 when page loads
    const initializePixel = async () => {
      await setPixel(3, 3, 3, 0, 0, 0);
    };

    // Initial fetch
    fetchPixels(method);
    initializePixel();

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <main className="flex flex-col items-center gap-6 w-full max-w-6xl">
        <h1 className="text-4xl font-bold text-black dark:text-zinc-50">
          Pixelboard
        </h1>

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
            <input
              type="number"
              min="0"
              max="16"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Status Nachricht */}
          {setPixelMessage && (
            <div className={`mt-4 p-3 rounded-lg ${
              setPixelMessage.includes("HTTP 200")
                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
                : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100"
            }`}>
              {setPixelMessage}
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


