import type { Pixel, ApiColorResponse } from "@/types/pixel";
import { convertApiColor } from "@/types/pixel";

const BOARD_SIZE = 16;
const UPDATE_INTERVAL = 10000; // 10 Sekunden

interface BoardState {
  pixels: Pixel[][];
  lastUpdate: number;
  isUpdating: boolean;
}

class BoardStateService {
  private state: BoardState | null = null;
  private updateTimer: NodeJS.Timeout | null = null;
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.API_URL || "";
    console.log("BoardStateService initialisiert");
  }

  // Startet den Hintergrund-Update-Prozess
  public startBackgroundUpdates(): void {
    if (this.updateTimer) {
      console.log("Background-Updates laufen bereits");
      return;
    }

    console.log("Starte Background-Updates (alle 10 Sekunden)");

    // Sofort beim Start einmal laden
    this.updateBoard();

    // Dann alle 10 Sekunden
    this.updateTimer = setInterval(() => {
      this.updateBoard();
    }, UPDATE_INTERVAL);
  }

  // Stoppt den Hintergrund-Update-Prozess
  public stopBackgroundUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      console.log("Background-Updates gestoppt");
    }
  }

  // Holt ein einzelnes Pixel vom API
  private async fetchSinglePixel(x: number, y: number): Promise<Pixel> {
    try {
      const response = await fetch(`${this.apiUrl}/api/color/${x}/${y}`);

      if (!response.ok) {
        console.error(`Fehler beim Abrufen von Pixel (${x},${y}): ${response.status}`);
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
      return { x, y, color: { red: 255, green: 0, blue: 255 } };
    }
  }

  // Lädt alle Pixels parallel vom API
  private async fetchAllPixelsParallel(): Promise<Pixel[][]> {
    const promises: Promise<Pixel>[] = [];

    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        promises.push(this.fetchSinglePixel(x, y));
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

  // Aktualisiert das Board im Hintergrund
  private async updateBoard(): Promise<void> {
    if (this.state?.isUpdating) {
      console.log("Update läuft bereits, überspringe...");
      return;
    }

    try {
      if (this.state) {
        this.state.isUpdating = true;
      }

      console.log("Background-Update: Lade Pixelboard...");
      const startTime = Date.now();

      const pixels = await this.fetchAllPixelsParallel();
      const duration = Date.now() - startTime;

      this.state = {
        pixels,
        lastUpdate: Date.now(),
        isUpdating: false,
      };

      console.log(`Background-Update abgeschlossen (${duration}ms)`);
    } catch (error) {
      console.error("Fehler beim Background-Update:", error);
      if (this.state) {
        this.state.isUpdating = false;
      }
    }
  }

  // Gibt ein einzelnes Pixel aus dem Cache zurück
  public getPixel(x: number, y: number): Pixel | null {
    if (!this.state || !this.state.pixels[x] || !this.state.pixels[x][y]) {
      return null;
    }
    return this.state.pixels[x][y];
  }

  // Gibt das gesamte Board aus dem Cache zurück
  public getBoard(): Pixel[][] | null {
    return this.state?.pixels || null;
  }

  // Gibt Informationen über den Cache-Status zurück
  public getCacheInfo(): { lastUpdate: number | null; isUpdating: boolean; hasData: boolean } {
    return {
      lastUpdate: this.state?.lastUpdate || null,
      isUpdating: this.state?.isUpdating || false,
      hasData: this.state !== null,
    };
  }

  // Erzwingt ein sofortiges Update (für nach POST-Requests)
  public async forceUpdate(): Promise<void> {
    await this.updateBoard();
  }
}

// Singleton-Instanz (global für alle Requests)
let boardStateServiceInstance: BoardStateService | null = null;

export function getBoardStateService(): BoardStateService {
  if (!boardStateServiceInstance) {
    boardStateServiceInstance = new BoardStateService();
    boardStateServiceInstance.startBackgroundUpdates();
  }
  return boardStateServiceInstance;
}

export type { BoardState };
