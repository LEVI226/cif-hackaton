import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { pingBackendHealth } from "../lib/health";

export type ConnectionStatus = "ONLINE" | "DEGRADED" | "OFFLINE";

const HEALTH_POLL_MS = 8000;

/** Etat de connexion reel pour l'affichage - 3 etats, pas 2 : voir lib/health.ts
 * pour pourquoi navigator.onLine seul ne suffit pas (DEGRADED en est la preuve :
 * le wifi repond, le backend non). Le declenchement de la synchronisation lui-
 * meme vit dans lib/queue.ts (startQueueAutoSync), pas ici - ce hook n'est que
 * pour l'affichage et peut etre monte/demonte sans effet de bord sur la file. */
export function useConnectionStatus(): ConnectionStatus {
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const [backendReachable, setBackendReachable] = useState<boolean | null>(null);

  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => {
      setBrowserOnline(false);
      setBackendReachable(null);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!browserOnline) return;
    let cancelled = false;
    const check = async () => {
      const reachable = await pingBackendHealth();
      if (!cancelled) setBackendReachable(reachable);
    };
    void check();
    const interval = setInterval(check, HEALTH_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [browserOnline]);

  if (!browserOnline) return "OFFLINE";
  if (backendReachable === false) return "DEGRADED";
  return "ONLINE"; // true, ou null pendant la toute premiere verification
}

/** @deprecated garde pour compatibilite - prefer useConnectionStatus pour les
 * nouveaux ecrans, qui distingue "wifi coupe" de "backend injoignable". */
export function useOnlineStatus(): boolean {
  return useConnectionStatus() !== "OFFLINE";
}

export function usePendingOpsCount(): number {
  const count = useLiveQuery(() => db.pendingOps.where("status").notEqual("FAILED").count(), []);
  return count ?? 0;
}

export function useFailedOpsCount(): number {
  const count = useLiveQuery(() => db.pendingOps.where("status").equals("FAILED").count(), []);
  return count ?? 0;
}
