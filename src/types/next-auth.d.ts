/**
 * Milestone 4, Aufgabe 2: NextAuth Type Extensions
 * Erweitert NextAuth Session und JWT Types um Token Management Felder
 */

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
    expiresAt?: number; // Unix Timestamp (Sekunden)
    error?: string; // "RefreshAccessTokenError" wenn Refresh fehlschlägt
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    expiresAt?: number; // Access Token Ablaufzeit (Unix Timestamp in Sekunden)
    refreshTokenExpiresAt?: number; // Refresh Token Ablaufzeit
    error?: string;
  }
}
