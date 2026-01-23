import type { NextApiRequest, NextApiResponse } from "next";
import type { Pixel, ApiColorResponse } from "@/types/pixel";
import { convertApiColor } from "@/types/pixel";
import { getBoardStateService } from "@/services/boardStateService";

const BOARD_SIZE = 16;

async function fetchSinglePixel(
  apiUrl: string,
  x: number,
  y: number
): Promise<Pixel> {
  try {
    const response = await fetch(`${apiUrl}/api/color/${x}/${y}`);

    if (!response.ok) {
      return { x, y, color: { red: 255, green: 0, blue: 255 } };
    }

    const apiColor: ApiColorResponse = await response.json();
    return {
      x,
      y,
      color: convertApiColor(apiColor),
    };
  } catch (error) {
    return { x, y, color: { red: 255, green: 0, blue: 255 } };
  }
}

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

async function fetchAllPixelsParallel(apiUrl: string): Promise<Pixel[][]> {
  const promises: Promise<Pixel>[] = [];

  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      promises.push(fetchSinglePixel(apiUrl, x, y));
    }
  }

  const allPixels = await Promise.all(promises);

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

  if (!API_URL) {
    return res.status(500).json({ error: "API_URL not configured" });
  }

  try {
    const method = (req.query.method as string) || "cache";
    const startTime = Date.now();
    let pixels: Pixel[][];
    const boardStateService = getBoardStateService();

    if (method === "cache") {
      console.log("Lade Daten aus Backend-Cache...");
      const cachedBoard = boardStateService.getBoard();

      if (!cachedBoard) {
        console.log("Cache noch nicht bereit, erzwinge Update...");
        await boardStateService.forceUpdate();
        pixels = boardStateService.getBoard() || [];
      } else {
        pixels = cachedBoard;
      }
    } else if (method === "sequential") {
      console.log("Starte sequentiellen Abruf...");
      pixels = await fetchAllPixelsSequential(API_URL);
      // Synchronisiere mit boardStateService
      boardStateService.updateBoardState(pixels);
    } else {
      console.log("Starte parallelen Abruf...");
      pixels = await fetchAllPixelsParallel(API_URL);
      // Synchronisiere mit boardStateService
      boardStateService.updateBoardState(pixels);
    }

    const duration = Date.now() - startTime;
    console.log(`${method}-Abruf dauerte ${duration}ms`);

    res.status(200).json({
      pixels,
      method,
      duration,
      boardSize: BOARD_SIZE,
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: "Failed to fetch pixels from backend",
      details: String(error),
    });
  }
}

