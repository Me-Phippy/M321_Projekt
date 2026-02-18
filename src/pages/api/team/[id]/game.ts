import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";

const API_URL = process.env.API_URL || "http://localhost:5085";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Nur GET Requests erlauben
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Session prüfen
  const session = await getServerSession(req, res, authOptions);
  if (!session?.accessToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Invalid team ID" });
  }

  try {
    // Hole Team Game Info vom Game Server
    const response = await fetch(`${API_URL}/api/game/team/${id}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Game Server error for team ${id} game info:`, response.status, errorText);
      return res.status(response.status).json({ 
        error: `Failed to fetch team game info: ${response.statusText}` 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("Error fetching team game info:", error);
    return res.status(500).json({ error: String(error) });
  }
}
