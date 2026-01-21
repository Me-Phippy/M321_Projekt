import { useEffect, useState } from "react";
import type { Pixel } from "@/types/pixel";

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
  const [method, setMethod] = useState<"parallel" | "sequential">("parallel");
  const [selectedPixel, setSelectedPixel] = useState<Pixel | null>(null);

  const fetchPixels = (fetchMethod: "parallel" | "sequential") => {
    setLoading(true);
    setError(null);
    
    fetch(`/api/pixels?method=${fetchMethod}`)
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

  useEffect(() => {
    fetchPixels(method);
  }, []);

  const handleMethodChange = (newMethod: "parallel" | "sequential") => {
    setMethod(newMethod);
    fetchPixels(newMethod);
  };

  const handlePixelClick = (pixel: Pixel) => {
    setSelectedPixel(pixel);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <main className="flex flex-col items-center gap-6 w-full max-w-6xl">
        <h1 className="text-4xl font-bold text-black dark:text-zinc-50">
          Pixelboard
        </h1>

        {/* Methodenauswahl */}
        <div className="flex gap-4">
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


