import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { validateToken } from "@/lib/tokenUtils";

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
  httpStatus?: number;
  statusText?: string;
  serverResponse?: string;
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

  // Check authentication
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

    // Milestone 4, Aufgabe 2.1: Token-Ablauf prüfen
    const expiresAt = (session as any).expiresAt;
    const tokenValidation = validateToken(expiresAt, 'setPixel');

    // Wenn Token abgelaufen ist, Fehler zurückgeben (kein API-Call)
    if (tokenValidation.isExpired) {
      console.error('[setPixel] ✗ Token abgelaufen - API-Call wird nicht durchgeführt');
      return res.status(401).json({
        success: false,
        error: `Token abgelaufen: ${tokenValidation.message}. Bitte melden Sie sich erneut an.`,
        httpStatus: 401,
        statusText: 'Token Expired',
      });
    }

    // Warnung wenn Token bald abläuft (aber trotzdem durchführen)
    if (tokenValidation.isExpiringSoon) {
      console.warn('[setPixel] ⚠ Token läuft bald ab - möglicherweise sollte Refresh durchgeführt werden');
    }

    // Start time measurement
    const startTime = Date.now();

    // Get JWT id_token from session (für Aufgabe 5 - OAuth 2.0 Standard)
    const idToken = (session as any).idToken;

    console.log("=== JWT ID Token für API-Aufruf ===");
    console.log(idToken ? "Token vorhanden" : "Kein Token!");

    // Make POST request to REST API with JWT token (OAuth 2.0 Bearer Token)
    const response = await fetch(`${API_URL}/api/color`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idToken && { "Authorization": `Bearer ${idToken}` }),
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
      
      // MS5: Handle "Player registered with another team"
      if (response.status === 400 && responseText.includes("Player registered with another team")) {
        console.log('[setPixel] Player registered with wrong team - fetching player info...');
        
        try {
          // Get user's sub claim (Keycloak ID)
          const userId = (session as any).sub || (session as any).user?.id;
          
          if (userId) {
            // Fetch player info to get the registered team
            const playerResponse = await fetch(`${API_URL}/api/player/${userId}`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });

            if (playerResponse.ok) {
              const playerData = await playerResponse.json();
              console.log(`[setPixel] Player is registered with Team ${playerData.team}. Informing frontend...`);
              
              return res.status(400).json({
                success: false,
                error: `Sie sind mit Team ${playerData.team} registriert. Bitte wählen Sie Team ${playerData.team} aus.`,
                httpStatus: 400,
                statusText: 'Wrong Team',
                serverResponse: responseText,
                duration,
                registeredTeam: playerData.team, // Frontend kann das automatisch setzen
              });
            }
          }
        } catch (err) {
          console.error('[setPixel] Error fetching player info:', err);
        }
      }
      
      // MS5: Auto-Register bei "User not registered"
      if (response.status === 400 && responseText.includes("User not registered")) {
        console.log('[setPixel] User not registered - attempting auto-registration...');
        
        try {
          const playerName = session.user?.name || "Player";
          const registerResponse = await fetch(`${API_URL}/api/player/register`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(idToken && { "Authorization": `Bearer ${idToken}` }),
            },
            body: JSON.stringify({ Name: playerName }),
          });

          if (registerResponse.ok) {
            console.log('[setPixel] ✓ Player registration successful - now registering team...');
            
            // Register team with a default name
            const teamName = `Team ${team}`;
            const teamRegisterResponse = await fetch(`${API_URL}/api/team/register`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(idToken && { "Authorization": `Bearer ${idToken}` }),
              },
              body: JSON.stringify(teamName),
            });

            if (teamRegisterResponse.ok) {
              console.log(`[setPixel] ✓ Team registration successful - now retrying pixel placement...`);
            } else {
              const teamError = await teamRegisterResponse.text();
              console.log(`[setPixel] Team registration: ${teamRegisterResponse.status} - ${teamError} (continuing anyway)`);
            }
            
            // Retry pixel placement after successful registration
            const retryResponse = await fetch(`${API_URL}/api/color`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(idToken && { "Authorization": `Bearer ${idToken}` }),
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

            const retryText = await retryResponse.text();
            const retryDuration = Date.now() - startTime;

            if (retryResponse.ok) {
              console.log(`✓ Pixel (${x}, ${y}) set after auto-registration: ${retryText} (${retryDuration}ms)`);
              return res.status(200).json({
                success: true,
                message: retryText,
                duration: retryDuration,
              });
            } else {
              console.error(`Retry failed: ${retryResponse.status} - ${retryText}`);
            }
          } else {
            const registerError = await registerResponse.text();
            console.error(`Auto-registration failed: ${registerResponse.status} - ${registerError}`);
          }
        } catch (regError) {
          console.error('Auto-registration error:', regError);
        }
      }
      
      // Detaillierte Fehlermeldung mit HTTP-Status und Server-Response
      let errorMessage = responseText || response.statusText;
      
      // Spezielle Behandlung für Auth-Fehler
      if (response.status === 401) {
        errorMessage = `Authentifizierung fehlgeschlagen: ${responseText || 'Kein JWT-Token vorhanden'}`;
      } else if (response.status === 403) {
        errorMessage = `Zugriff verweigert: ${responseText}`;
      }
      
      return res.status(response.status).json({
        success: false,
        error: errorMessage,
        httpStatus: response.status,
        statusText: response.statusText,
        serverResponse: responseText,
        duration,
      });
    }

    console.log(`✓ Pixel (${x}, ${y}) successfully set: ${responseText} (${duration}ms)`);

    // Cache wird automatisch durch die GraphQL Subscription aktualisiert!
    // Kein forceUpdate() mehr nötig - die Subscription pusht das Update sofort.

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
