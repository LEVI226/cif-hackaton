import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return online;
}

export function usePendingOpsCount(): number {
  const count = useLiveQuery(() => db.pendingOps.where("status").notEqual("FAILED").count(), []);
  return count ?? 0;
}

export function useFailedOpsCount(): number {
  const count = useLiveQuery(() => db.pendingOps.where("status").equals("FAILED").count(), []);
  return count ?? 0;
}
