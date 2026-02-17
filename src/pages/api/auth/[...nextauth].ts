import NextAuth, { AuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { JWT } from "next-auth/jwt";

/**
 * Milestone 4, Aufgabe 2: Token Refresh
 * Erneuert ein abgelaufenes Access Token mittels Refresh Token
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    console.log("[Token Refresh] Versuche Access Token zu erneuern...");

    const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.KEYCLOAK_ID!,
        client_secret: process.env.KEYCLOAK_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("[Token Refresh] Fehler:", refreshedTokens);
      throw refreshedTokens;
    }

    console.log("[Token Refresh] ✓ Token erfolgreich erneuert");

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      idToken: refreshedTokens.id_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      refreshTokenExpiresAt: refreshedTokens.refresh_expires_in
        ? Math.floor(Date.now() / 1000) + refreshedTokens.refresh_expires_in
        : token.refreshTokenExpiresAt,
    };
  } catch (error) {
    console.error("[Token Refresh] Refresh fehlgeschlagen:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_ID!,
      clientSecret: process.env.KEYCLOAK_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial Sign-In: Speichere alle Tokens und Ablaufzeiten
      if (account) {
        console.log("[JWT Callback] Initial Login - Speichere Tokens");
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        
        // Berechne Ablaufzeitpunkte (Unix Timestamps in Sekunden)
        token.expiresAt = account.expires_at!; // von NextAuth bereits berechnet
        token.refreshTokenExpiresAt = account.refresh_expires_in
          ? Math.floor(Date.now() / 1000) + account.refresh_expires_in
          : undefined;
        
        return token;
      }

      // Token noch gültig? Prüfe ob Ablaufzeit noch nicht erreicht ist
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = (token.expiresAt as number) - now;
      
      if (timeUntilExpiry > 60) {
        // Token noch min. 60 Sekunden gültig
        console.log(`[JWT Callback] Token noch ${timeUntilExpiry}s gültig`);
        return token;
      }

      // Token abgelaufen oder läuft bald ab - Refresh durchführen
      console.log(`[JWT Callback] Token läuft in ${timeUntilExpiry}s ab - Refresh nötig`);
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.idToken = token.idToken as string;
      session.expiresAt = token.expiresAt as number;
      session.error = token.error as string | undefined;
      
      // Team aus JWT Token extrahieren
      if (token.idToken) {
        try {
          const base64Url = (token.idToken as string).split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          session.team = payload.team ?? 0; // Default 0 falls kein Team im Token
        } catch (error) {
          console.error('[Session] Fehler beim Extrahieren des Teams:', error);
          session.team = 0; // Default bei Fehler
        }
      }
      
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Verhindert Redirect-Loops
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  debug: true,
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
