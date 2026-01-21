import type { NextApiRequest, NextApiResponse } from "next";
import type { Pixel, ApiColorResponse } from "@/types/pixel";
import { convertApiColor } from "@/types/pixel";

const BOARD_SIZE = 16;

// Hilfsfunktion: Zeit messen
async function measureTime<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  console.log(`${name} dauerte ${duration}ms`);
  return { result, duration };
}

// Einzelnes Pixel abrufen
async function fetchSinglePixel(
  apiUrl: string,
  x: number,
  y: number
): Promise<Pixel> {
  try {
    const response = await fetch(`${apiUrl}/api/color/${x}/${y}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Fehler beim Abrufen von Pixel (${x},${y}): ${response.status} - ${errorText}`
      );
      // Pink für Fehler
      return { x, y, color: { red: 255, green: 0, blue: 255 } };
    }
    
    const apiColor: ApiColorResponse = await response.json();
    return {
      x,
      y,
      color: convertApiColor(apiColor),
    };
  } catch (error) {
    console.error(`Fehler beim Abrufen von Pixel (${x},${y}):`, error);
    // Pink für Fehler
    return { x, y, color: { red: 255, green: 0, blue: 255 } };
  }
}

// Alle Pixel sequentiell abrufen
async function fetchAllPixelsSequential(apiUrl: string): Promise<Pixel[][]> {
  const pixels: Pixel[][] = [];
  
  for (let x = 0; x < BOARD_SIZE; x++) {
    pixels[x] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      const pixel = await fetchSinglePixel(apiUrl, x, y);
      pixels[x][y] = pixel;
    }
  }
  
  return pixels;
}

// Alle Pixel parallel abrufen
async function fetchAllPixelsParallel(apiUrl: string): Promise<Pixel[][]> {
  const promises: Promise<Pixel>[] = [];
  
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      promises.push(fetchSinglePixel(apiUrl, x, y));
    }
  }
  
  const allPixels = await Promise.all(promises);
  
  // In 2D-Array umwandeln
  const pixels: Pixel[][] = [];
  for (let x = 0; x < BOARD_SIZE; x++) {
    pixels[x] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      const index = x * BOARD_SIZE + y;
      pixels[x][y] = allPixels[index];
    }
  }
  
  return pixels;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const API_URL = process.env.API_URL;
  
  console.log("API_URL:", API_URL);
  
  if (!API_URL) {
    return res.status(500).json({ error: "API_URL not configured" });
  }
  
  try {
    // Methode aus Query-Parameter lesen (default: parallel)
    const method = (req.query.method as string) || "parallel";
    
    let pixels: Pixel[][];
    let duration: number;
    
    if (method === "sequential") {
      console.log("Starte sequentiellen Abruf...");
      const result = await measureTime(
        "Sequentieller Abruf",
        () => fetchAllPixelsSequential(API_URL)
      );
      pixels = result.result;
      duration = result.duration;
    } else {
      console.log("Starte parallelen Abruf...");
      const result = await measureTime(
        "Paralleler Abruf",
        () => fetchAllPixelsParallel(API_URL)
      );
      pixels = result.result;
      duration = result.duration;
    }
    
    console.log(`Erfolgreich ${BOARD_SIZE}x${BOARD_SIZE} Pixels abgerufen`);
    
    res.status(200).json({
      pixels,
      method,
      duration,
      boardSize: BOARD_SIZE,
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: "Failed to fetch pixels",
      details: String(error),
    });
  }
}

