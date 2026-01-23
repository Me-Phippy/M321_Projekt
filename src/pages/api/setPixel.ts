import type { NextApiRequest, NextApiResponse } from "next";
import { getBoardStateService } from "@/services/boardStateService";

interface SetPixelRequest {
  x: number;
  y: number;
  team: number;
  red: number;
  green: number;
  blue: number;
}

interface SetPixelResponse {
  success: boolean;
  message?: string;
  error?: string;
  duration?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SetPixelResponse>
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  const API_URL = process.env.API_URL;

  if (!API_URL) {
    return res.status(500).json({
      success: false,
      error: "API_URL not configured",
    });
  }

  try {
    const { x, y, team, red, green, blue }: SetPixelRequest = req.body;

    // Validate input
    if (
      x === undefined ||
      y === undefined ||
      team === undefined ||
      red === undefined ||
      green === undefined ||
      blue === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: x, y, team, red, green, blue",
      });
    }

    console.log(
      `Setting pixel at (${x}, ${y}) for team ${team} to RGB(${red}, ${green}, ${blue})`
    );

    // Start time measurement
    const startTime = Date.now();

    // Make POST request to external API
    const response = await fetch(`${API_URL}/api/color`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        X: x,
        Y: y,
        Team: team,
        Red: red,
        Green: green,
        Blue: blue,
      }),
    });

    const responseText = await response.text();

    // Calculate duration
    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error(
        `Failed to set pixel (${x},${y}): ${response.status} - ${responseText} (${duration}ms)`
      );
      return res.status(response.status).json({
        success: false,
        error: responseText,
        duration,
      });
    }

    console.log(`✓ Pixel (${x}, ${y}) successfully set: ${responseText} (${duration}ms)`);

    // Cache nach POST-Request aktualisieren
    const boardStateService = getBoardStateService();
    boardStateService.forceUpdate().catch((err) => {
      console.error("Fehler beim Cache-Update nach POST:", err);
    });

    return res.status(200).json({
      success: true,
      message: responseText,
      duration,
    });
  } catch (error) {
    console.error("Error setting pixel:", error);
    return res.status(500).json({
      success: false,
      error: String(error),
    });
  }
}
