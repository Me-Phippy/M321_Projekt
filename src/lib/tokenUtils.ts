/**
 * Milestone 4, Aufgabe 2.1: Token Utilities
 * Hilfsfunktionen für JWT Token Validierung und Ablauf-Prüfung
 */

/**
 * Dekodiert ein JWT Token und gibt das Payload zurück (ohne Signatur-Prüfung)
 */
export function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Fehler beim Dekodieren des JWT:', error);
    return null;
  }
}

/**
 * Milestone 4, Aufgabe 2.1: Token Ablaufzeit prüfen
 * Gibt zurück, wie viele Sekunden das Token noch gültig ist
 * Negativ = bereits abgelaufen
 */
export function getTokenExpiryInSeconds(expiresAt: number): number {
  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now;
}

/**
 * Milestone 4, Aufgabe 2.1: Prüft ob Token abgelaufen ist
 */
export function isTokenExpired(expiresAt: number): boolean {
  return getTokenExpiryInSeconds(expiresAt) <= 0;
}

/**
 * Milestone 4, Aufgabe 2.1: Prüft ob Token bald abläuft (< 60 Sekunden)
 */
export function isTokenExpiringSoon(expiresAt: number, thresholdSeconds: number = 60): boolean {
  const timeLeft = getTokenExpiryInSeconds(expiresAt);
  return timeLeft > 0 && timeLeft < thresholdSeconds;
}

/**
 * Milestone 4, Aufgabe 2.1: Formatiert Zeitstempel für Logging
 */
export function formatExpiryTime(expiresAt: number): string {
  const timeLeft = getTokenExpiryInSeconds(expiresAt);
  
  if (timeLeft <= 0) {
    return `Abgelaufen (vor ${Math.abs(timeLeft)}s)`;
  }
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  if (minutes > 0) {
    return `Noch ${minutes}m ${seconds}s gültig`;
  }
  
  return `Noch ${seconds}s gültig`;
}

/**
 * Milestone 4, Aufgabe 2.1: Vollständige Token-Validierung mit Logging
 */
export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  timeLeftSeconds: number;
  message: string;
}

export function validateToken(
  expiresAt: number | undefined,
  context: string = 'Token'
): TokenValidationResult {
  if (!expiresAt) {
    console.error(`[${context}] ✗ Keine Ablaufzeit vorhanden!`);
    return {
      isValid: false,
      isExpired: true,
      isExpiringSoon: false,
      timeLeftSeconds: 0,
      message: 'Keine Ablaufzeit vorhanden',
    };
  }

  const timeLeft = getTokenExpiryInSeconds(expiresAt);
  const expired = isTokenExpired(expiresAt);
  const expiringSoon = isTokenExpiringSoon(expiresAt);

  if (expired) {
    console.error(`[${context}] ✗ Token abgelaufen (vor ${Math.abs(timeLeft)}s)`);
    return {
      isValid: false,
      isExpired: true,
      isExpiringSoon: false,
      timeLeftSeconds: timeLeft,
      message: `Token abgelaufen vor ${Math.abs(timeLeft)} Sekunden`,
    };
  }

  if (expiringSoon) {
    console.warn(`[${context}] ⚠ Token läuft bald ab (${formatExpiryTime(expiresAt)})`);
    return {
      isValid: true,
      isExpired: false,
      isExpiringSoon: true,
      timeLeftSeconds: timeLeft,
      message: `Token läuft in ${timeLeft} Sekunden ab`,
    };
  }

  console.log(`[${context}] ✓ Token gültig (${formatExpiryTime(expiresAt)})`);
  return {
    isValid: true,
    isExpired: false,
    isExpiringSoon: false,
    timeLeftSeconds: timeLeft,
    message: 'Token gültig',
  };
}
