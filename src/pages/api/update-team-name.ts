import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

const API_URL = process.env.API_URL || "http://localhost:5085";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const idToken = (session as any)?.idToken;
  
  if (!session || !idToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { teamName } = req.body;
  
  if (!teamName || typeof teamName !== "string") {
    return res.status(400).json({ error: "Invalid team name" });
  }

  try {
    const response = await fetch(`${API_URL}/api/team/name`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(teamName), // Server erwartet string direkt als JSON
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`Failed to update team name:`, response.status, responseText);
      return res.status(response.status).json({ 
        success: false,
        error: `Failed to update team name: ${response.statusText}`,
        serverResponse: responseText,
      });
    }

    console.log(`✓ Team name updated to: ${teamName}`);
    
    return res.status(200).json({ 
      success: true,
      teamName,
      serverResponse: responseText,
    });

  } catch (error) {
    console.error("Error updating team name:", error);
    return res.status(500).json({ 
      success: false,
      error: String(error) 
    });
  }
}
