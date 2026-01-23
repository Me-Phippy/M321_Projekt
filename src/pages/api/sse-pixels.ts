import type { NextApiRequest, NextApiResponse } from "next";
import { getBoardStateService } from "@/services/boardStateService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // SSE-Header setzen
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Für nginx

  console.log("Neuer SSE-Client verbunden");

  const boardStateService = getBoardStateService();

  // Client zur Liste der SSE-Clients hinzufügen
  const clientId = boardStateService.addSseClient(res);

  // Sende initiales Board sofort
  const initialBoard = boardStateService.getBoard();
  if (initialBoard) {
    res.write(`data: ${JSON.stringify({ pixels: initialBoard })}\n\n`);
  }

  // Heartbeat alle 30 Sekunden, um die Verbindung am Leben zu erhalten
  const heartbeatInterval = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  // Cleanup bei Verbindungsabbruch
  req.on("close", () => {
    console.log("SSE-Client getrennt");
    clearInterval(heartbeatInterval);
    boardStateService.removeSseClient(clientId);
  });
}
