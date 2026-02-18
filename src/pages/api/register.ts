import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

interface RegisterResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegisterResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({
      success: false,
      error: "Nicht authentifiziert. Bitte melden Sie sich an.",
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
    const { name } = req.body;
    const gamerTag = name || session.user?.name || "Player";

    const idToken = (session as any).idToken;

    console.log(`[Register] Registering player with gamertag: ${gamerTag}`);

    const response = await fetch(`${API_URL}/api/player/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idToken && { "Authorization": `Bearer ${idToken}` }),
      },
      body: JSON.stringify({ Name: gamerTag }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`Registration failed: ${response.status} - ${responseText}`);
      return res.status(response.status).json({
        success: false,
        error: responseText || "Registration failed",
      });
    }

    console.log(`[Register] ✓ Player registered successfully: ${responseText}`);

    return res.status(200).json({
      success: true,
      message: responseText,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
