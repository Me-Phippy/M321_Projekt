import type { Pixel, ApiColorResponse } from "@/types/pixel";
import { convertApiColor } from "@/types/pixel";
import type { NextApiResponse } from "next";
import { GraphQLClient, gql } from "graphql-request";
import { createClient, Client } from "graphql-ws";
import WebSocket from "ws";

const BOARD_SIZE = 16;
const UPDATE_INTERVAL = 10000; // 10 Sekunden

interface BoardState {
  pixels: Pixel[][];
  lastUpdate: number;
  isUpdating: boolean;
}

interface SseClient {
  id: string;
  response: NextApiResponse;
}

// GraphQL Query für pixelRange
const GET_PIXEL_RANGE = gql`
  query GetPixelRange($x1: Int!, $y1: Int!, $x2: Int!, $y2: Int!) {
    pixelRange(x1: $x1, y1: $y1, x2: $x2, y2: $y2) {
      x
      y
      color {
        red
        green
        blue
      }
    }
  }
`;

// GraphQL Subscription für pixelChanged
const PIXEL_CHANGED_SUBSCRIPTION = `
  subscription OnPixelChanged {
    pixelChanged {
      x
      y
      color {
        red
        green
        blue
      }
    }
  }
`;

// GraphQL Response Type
interface GraphQLPixelResponse {
  x: number;
  y: number;
  color: {
    red: number;
    green: number;
    blue: number;
  };
}

interface PixelRangeResponse {
  pixelRange: GraphQLPixelResponse[];
}

interface PixelChangedResponse {
  pixelChanged: GraphQLPixelResponse;
}

class BoardStateService {
  private state: BoardState | null = null;
  private updateTimer: NodeJS.Timeout | null = null;
  private apiUrl: string;
  private graphqlClient: GraphQLClient;
  private wsClient: Client | null = null;
  private subscription: (() => void) | null = null;
  private sseClients: Map<string, SseClient> = new Map();

  constructor() {
    this.apiUrl = process.env.API_URL || "";
    
    if (!this.apiUrl) {
      console.warn("⚠️  API_URL ist nicht gesetzt! BoardStateService wird nicht funktionieren.");
    }
    
    // GraphQL Endpoint ist /graphql
    const graphqlUrl = `${this.apiUrl}/graphql`;
    this.graphqlClient = new GraphQLClient(graphqlUrl);
    console.log("BoardStateService initialisiert mit GraphQL:", graphqlUrl);
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

  // Startet GraphQL Subscription für Live-Updates
  public startSubscription(): void {
    if (this.subscription) {
      console.log("Subscription läuft bereits");
      return;
    }

    try {
      // WebSocket URL (http -> ws, https -> wss)
      const wsUrl = this.apiUrl.replace(/^http/, "ws") + "/graphql";
      console.log("Starte GraphQL Subscription:", wsUrl);

      // Erstelle WebSocket Client
      this.wsClient = createClient({
        url: wsUrl,
        webSocketImpl: WebSocket,
      });

      // Subscribe zu pixelChanged
      const unsubscribe = this.wsClient.subscribe<PixelChangedResponse>(
        {
          query: PIXEL_CHANGED_SUBSCRIPTION,
        },
        {
          next: (data) => {
            if (data.data?.pixelChanged) {
              this.handlePixelChanged(data.data.pixelChanged);
            }
          },
          error: (error) => {
            console.error("Subscription error:", error);
          },
          complete: () => {
            console.log("Subscription completed");
          },
        }
      );

      this.subscription = unsubscribe;
      console.log("GraphQL Subscription aktiv");
    } catch (error) {
      console.error("Fehler beim Starten der Subscription:", error);
    }
  }

  // Stoppt GraphQL Subscription
  public stopSubscription(): void {
    if (this.subscription) {
      this.subscription();
      this.subscription = null;
      console.log("Subscription gestoppt");
    }
    if (this.wsClient) {
      this.wsClient.dispose();
      this.wsClient = null;
    }
  }

  // Verarbeitet einzelne Pixel-Updates von der Subscription
  private handlePixelChanged(pixel: GraphQLPixelResponse): void {
    if (!this.state?.pixels) {
      return;
    }

    console.log(`Pixel geändert via Subscription: (${pixel.x},${pixel.y})`);

    // Update im lokalen State
    this.state.pixels[pixel.x][pixel.y] = {
      x: pixel.x,
      y: pixel.y,
      color: pixel.color,
    };

    // Sende Update an alle SSE-Clients
    this.broadcastSinglePixelUpdate(pixel);
  }

  // Sendet einzelnes Pixel-Update an alle SSE-Clients
  private broadcastSinglePixelUpdate(pixel: GraphQLPixelResponse): void {
    if (this.sseClients.size === 0) {
      return;
    }

    const data = JSON.stringify({
      type: "pixel-update",
      pixel: {
        x: pixel.x,
        y: pixel.y,
        color: pixel.color,
      },
    });

    const disconnectedClients: string[] = [];

    this.sseClients.forEach((client) => {
      try {
        client.response.write(`data: ${data}\n\n`);
      } catch (error) {
        console.error(`Fehler beim Senden an Client ${client.id}:`, error);
        disconnectedClients.push(client.id);
      }
    });

    // Entferne getrennte Clients
    disconnectedClients.forEach((clientId) => {
      this.removeSseClient(clientId);
    });
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

  // Lädt alle Pixels über GraphQL
  private async fetchAllPixelsGraphQL(): Promise<Pixel[][]> {
    if (!this.apiUrl) {
      throw new Error("API_URL ist nicht gesetzt");
    }
    
    try {
      // Versuche zuerst pixelRange (nur auf neueren Servern verfügbar)
      const response = await this.graphqlClient.request<PixelRangeResponse>(
        GET_PIXEL_RANGE,
        {
          x1: 0,
          y1: 0,
          x2: BOARD_SIZE - 1,
          y2: BOARD_SIZE - 1,
        }
      );

      // Konvertiere die flache Liste in ein 2D Array
      const pixels: Pixel[][] = Array.from({ length: BOARD_SIZE }, () =>
        Array(BOARD_SIZE).fill(null)
      );

      response.pixelRange.forEach((pixel) => {
        pixels[pixel.x][pixel.y] = {
          x: pixel.x,
          y: pixel.y,
          color: pixel.color,
        };
      });

      return pixels;
    } catch (error) {
      // pixelRange nicht verfügbar, verwende Aliasing-Workaround
      console.log("pixelRange nicht verfügbar, verwende GraphQL Aliasing (256 Queries in 1 Request)");
      return this.fetchAllPixelsWithAliasing();
    }
  }

  // GraphQL Aliasing: Holt alle 256 Pixels in EINEM Request (für Server ohne pixelRange)
  private async fetchAllPixelsWithAliasing(): Promise<Pixel[][]> {
    try {
      // Baue eine Query mit 256 aliased Feldern
      const queryParts: string[] = [];

      for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
          queryParts.push(`p${x}_${y}: pixel(x: ${x}, y: ${y}) { x y color { red green blue } }`);
        }
      }

      const query = `query GetAllPixels { ${queryParts.join(' ')} }`;

      // Sende die Query
      const response = await this.graphqlClient.request<any>(query);

      // Konvertiere Response in 2D Array
      const pixels: Pixel[][] = Array.from({ length: BOARD_SIZE }, () =>
        Array(BOARD_SIZE).fill(null)
      );

      for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
          const alias = `p${x}_${y}`;
          const pixel = response[alias];
          if (pixel) {
            pixels[x][y] = {
              x: pixel.x,
              y: pixel.y,
              color: pixel.color,
            };
          }
        }
      }

      return pixels;
    } catch (error) {
      console.error("Fehler beim GraphQL Aliasing Abruf:", error);
      // Letzter Fallback: REST API
      return this.fetchAllPixelsParallel();
    }
  }

  // Fallback: Lädt alle Pixels parallel vom REST API (nur falls GraphQL fehlschlägt)
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

  // Pinkkiller: Re-fetched fehlerhafte Pixels (Magenta = 255,0,255)
  private async pinkkiller(pixels: Pixel[][]): Promise<Pixel[][]> {
    let iteration = 0;
    let foundPinkPixels = true;

    while (foundPinkPixels) {
      iteration++;
      console.log(`\nPINKKILLER Iteration ${iteration}`);
      console.log("=".repeat(80));

      const pinkPixels: { x: number; y: number }[] = [];

      // Finde alle pinken Pixels
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
          const updatedPixel = await this.fetchSinglePixel(pos.x, pos.y);
          pixels[pos.x][pos.y] = updatedPixel;
        }
        foundPinkPixels = true;
      } else {
        console.log("✓ Keine fehlerhaften Pixel gefunden. PINKKILLER beendet.");
        foundPinkPixels = false;
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

      console.log("Background-Update: Lade Pixelboard via GraphQL...");
      const startTime = Date.now();

      let pixels = await this.fetchAllPixelsGraphQL();

      // Führe Pinkkiller aus, um fehlerhafte Pixels zu korrigieren
      pixels = await this.pinkkiller(pixels);

      const duration = Date.now() - startTime;

      this.state = {
        pixels,
        lastUpdate: Date.now(),
        isUpdating: false,
      };

      console.log(`Background-Update abgeschlossen (${duration}ms)`);

      // Sende Update an alle verbundenen SSE-Clients
      this.broadcastToSseClients(pixels);
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

  // Manuelles Setzen des Board-States (z.B. für parallel/sequential Fetch)
  public updateBoardState(pixels: Pixel[][]): void {
    this.state = {
      pixels,
      lastUpdate: Date.now(),
      isUpdating: false,
    };
    console.log("Board-State manuell aktualisiert");

    // Sende Update an alle verbundenen SSE-Clients
    this.broadcastToSseClients(pixels);
  }

  // SSE-Client-Management
  public addSseClient(response: NextApiResponse): string {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sseClients.set(clientId, { id: clientId, response });
    console.log(`SSE-Client hinzugefügt: ${clientId} (Total: ${this.sseClients.size})`);
    return clientId;
  }

  public removeSseClient(clientId: string): void {
    this.sseClients.delete(clientId);
    console.log(`SSE-Client entfernt: ${clientId} (Total: ${this.sseClients.size})`);
  }

  private broadcastToSseClients(pixels: Pixel[][]): void {
    if (this.sseClients.size === 0) {
      return;
    }

    console.log(`Sende Board-Update an ${this.sseClients.size} SSE-Client(s)`);

    const data = JSON.stringify({ pixels });
    const disconnectedClients: string[] = [];

    this.sseClients.forEach((client) => {
      try {
        client.response.write(`data: ${data}\n\n`);
      } catch (error) {
        console.error(`Fehler beim Senden an Client ${client.id}:`, error);
        disconnectedClients.push(client.id);
      }
    });

    // Entferne getrennte Clients
    disconnectedClients.forEach((clientId) => {
      this.removeSseClient(clientId);
    });
  }
}

// Singleton-Instanz (global für alle Requests)
let boardStateServiceInstance: BoardStateService | null = null;

export function getBoardStateService(): BoardStateService {
  if (!boardStateServiceInstance) {
    boardStateServiceInstance = new BoardStateService();
    boardStateServiceInstance.startBackgroundUpdates();
    boardStateServiceInstance.startSubscription(); // Live-Updates via GraphQL Subscription
  }
  return boardStateServiceInstance;
}

export type { BoardState };
