import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

const API_URL = process.env.API_URL || "http://localhost:5085";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Nicht authentifiziert" });
  }

  const idToken = (session as any).idToken;
  const playerName = session.user?.name || "Player";
  const teamName = req.body.teamName || "Team 0";

  console.log(`[Register] Starte Registrierung für ${playerName}, Team: ${teamName}`);
  console.log(`[Register] Token vorhanden: ${!!idToken}`);

  const results = {
    player: null as any,
    team: null as any,
  };

  try {
    // 1. Spieler registrieren
    console.log(`[Register] Registriere Spieler: ${playerName}`);
    const playerResponse = await fetch(`${API_URL}/api/player/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ Name: playerName }),
    });

    const playerText = await playerResponse.text();
    results.player = {
      status: playerResponse.status,
      ok: playerResponse.ok,
      response: playerText,
    };

    console.log(`[Register] Spieler: ${playerResponse.status} - ${playerText}`);

    // 2. Team registrieren
    console.log(`[Register] Registriere Team: ${teamName}`);
    const teamResponse = await fetch(`${API_URL}/api/team/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(teamName),
    });

    const teamText = await teamResponse.text();
    results.team = {
      status: teamResponse.status,
      ok: teamResponse.ok,
      response: teamText,
    };

    console.log(`[Register] Team: ${teamResponse.status} - ${teamText}`);

    return res.status(200).json({
      success: true,
      message: "Registrierung abgeschlossen",
      results,
    });
  } catch (error) {
    console.error("[Register] Fehler:", error);
    return res.status(500).json({
      success: false,
      error: String(error),
      results,
    });
  }
}
