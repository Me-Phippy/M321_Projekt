/**
 * Milestone 4, Aufgabe 2.2: Token Status Component
 * Zeigt Token-Status an und führt automatischen Refresh durch
 */

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { formatExpiryTime, getTokenExpiryInSeconds } from "@/lib/tokenUtils";

export function TokenStatus() {
  const { data: session, status } = useSession();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.expiresAt) {
      return;
    }

    // Aktualisiere Display jede Sekunde
    const interval = setInterval(() => {
      const seconds = getTokenExpiryInSeconds(session.expiresAt!);
      setTimeLeft(seconds);

      // Wenn Token in < 30 Sekunden abläuft, force Session Update
      // NextAuth wird dann automatisch den Refresh durchführen
      if (seconds < 30 && seconds > 0) {
        console.log('[TokenStatus] Token läuft bald ab - fordere Session Update an');
        // Trigger Session Refresh durch Re-Fetch
        fetch('/api/auth/session').then(() => {
          console.log('[TokenStatus] Session Update angefordert');
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.expiresAt]);

  // Bei Refresh-Fehler zum Login umleiten
  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      console.error("[TokenStatus] Token Refresh fehlgeschlagen - Redirect zum Login");
      alert("Ihre Sitzung ist abgelaufen. Sie werden zum Login weitergeleitet.");
      window.location.href = "/api/auth/signin";
    }
  }, [session?.error]);

  if (status !== "authenticated" || !session?.expiresAt) {
    return null;
  }

  const seconds = timeLeft ?? getTokenExpiryInSeconds(session.expiresAt);

  let statusColor = "text-green-600";
  let statusIcon = "✓";
  let statusText = formatExpiryTime(session.expiresAt);

  if (seconds <= 0) {
    statusColor = "text-red-600";
    statusIcon = "✗";
    statusText = "Token abgelaufen";
  } else if (seconds < 60) {
    statusColor = "text-orange-600";
    statusIcon = "⚠";
  }

  return (
    <div className={`text-sm ${statusColor} font-mono`}>
      {statusIcon} Token: {statusText}
    </div>
  );
}
