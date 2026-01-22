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
  console.log(`Fetching pixel at (${x}, ${y}) from ${apiUrl}/api/color/${x}/${y}`);
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
    const pixel = {
      x,
      y,
      color: convertApiColor(apiColor),
    };
    console.log(`✓ Pixel (${x}, ${y}) erfolgreich abgerufen: RGB(${pixel.color.red}, ${pixel.color.green}, ${pixel.color.blue})`);
    return pixel;
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
  
  // Pinkkiller nach sequentiellem Abruf
  return await pinkkiller(pixels, apiUrl);
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
  

  return await pinkkiller(pixels, apiUrl);
}


async function pinkkiller(pixels: Pixel[][], apiUrl: string): Promise<Pixel[][]> {
  let iteration = 0;
  let foundPinkPixels = true;

  while (foundPinkPixels) {
    iteration++;
    console.log(`\nPINKKILLER Iteration ${iteration}`);
    console.log("=".repeat(80));

    const pinkPixels: { x: number; y: number }[] = [];

    // Finde alle pink Pixel
    for (let x = 0; x < pixels.length; x++) {
      for (let y = 0; y < pixels[x].length; y++) {
        const pixel = pixels[x][y];
        if (pixel.color.red === 255 && pixel.color.green === 0 && pixel.color.blue === 255) {
          pinkPixels.push({ x, y });
        }
      }
    }

    if (pinkPixels.length > 0) {
      console.log(`PINKKILLER: ${pinkPixels.length} fehlerhafte Pixel gefunden. Erneuter Abruf...`);
      for (const pos of pinkPixels) {
        console.log(`  Re-fetching pink pixel at (${pos.x}, ${pos.y})`);
        const updatedPixel = await fetchSinglePixel(apiUrl, pos.x, pos.y);
        pixels[pos.x][pos.y] = updatedPixel;
      }
      // Nochmal prüfen in der nächsten Iteration
      foundPinkPixels = true;
    } else {
      console.log("✓ Keine fehlerhaften Pixel gefunden. PINKKILLER beendet.");
      foundPinkPixels = false;
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

