// File hors-ligne : une ecriture qui echoue pour une raison reseau est posee ici
// plutot que perdue. Rejouee des la reconnexion, dans l'ordre, avec la meme cle
// d'idempotence pour que le serveur ne la traite jamais deux fois
// (cf. backend/app/services/idempotency.py).
//
// Limitation assumee (documentee, pas cachee) : les lectures (recherche client,
// fiche, solde global) ne reconstituent pas les ecritures encore en file - elles
// refletent l'etat du serveur au dernier appel reussi. Une creation posee
// hors-ligne n'apparait dans les recherches qu'apres synchronisation.

import { apiFetch, isNetworkError } from "./api";
import { db, type PendingOp, type PendingOpKind } from "./db";
import { pingBackendHealth } from "./health";

function generateOpId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `op-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Tente l'appel immediatement ; si le reseau est indisponible, met en file et
 * retourne `{queued: true}` au lieu de laisser l'erreur remonter a l'ecran. */
export async function submitOrQueue<T>(
  kind: PendingOpKind,
  path: string,
  payload: unknown,
): Promise<{ queued: false; result: T } | { queued: true; opId: string }> {
  const opId = generateOpId();
  try {
    const result = await apiFetch<T>(path, { method: "POST", body: payload, idempotencyKey: opId });
    return { queued: false, result };
  } catch (error) {
    if (!isNetworkError(error)) throw error; // erreur metier (422, 409...) - ne se met pas en file

    await db.pendingOps.add({
      opId,
      kind,
      path,
      payload,
      createdAt: new Date().toISOString(),
      status: "PENDING",
    });
    return { queued: true, opId };
  }
}

let flushing = false;

/** Rejoue les operations en attente, dans l'ordre de creation. S'arrete au
 * premier echec reseau (les suivantes restent en file pour le prochain essai) ;
 * une erreur metier (ex: FID mal forme detecte trop tard) marque juste cette
 * operation FAILED et continue avec les suivantes. */
export async function flushQueue(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const pending = await db.pendingOps.where("status").equals("PENDING").sortBy("createdAt");
    for (const op of pending) {
      await db.pendingOps.update(op.id!, { status: "SYNCING" });
      try {
        await apiFetch(op.path, { method: "POST", body: op.payload, idempotencyKey: op.opId });
        await db.pendingOps.delete(op.id!);
      } catch (error) {
        if (isNetworkError(error)) {
          await db.pendingOps.update(op.id!, { status: "PENDING" });
          break; // le reseau est reparti puis reperdu (ou jamais revenu) - on retente plus tard
        }
        const detail = error instanceof Error ? error.message : String(error);
        await db.pendingOps.update(op.id!, { status: "FAILED", lastError: detail });
      }
    }
  } finally {
    flushing = false;
  }
}

const HEALTH_RECOVERY_POLL_MS = 8000;

/** L'evenement navigateur 'online' ne se declenche que si le wifi/la carte
 * reseau change d'etat - il ne dit rien du backend. Si le backend redemarre
 * pendant que le wifi n'a jamais bouge (le cas DEGRADED -> ONLINE de
 * lib/health.ts), 'online' ne se re-declenche jamais et la file resterait
 * bloquee jusqu'a la prochaine action manuelle. On sonde donc aussi /health
 * pendant qu'il y a des operations en attente, et on relance des que le
 * backend redevient joignable. */
export function startQueueAutoSync(): () => void {
  const onOnline = () => void flushQueue();
  window.addEventListener("online", onOnline);
  if (navigator.onLine) void flushQueue();

  let lastReachable = true;
  const interval = setInterval(() => {
    void (async () => {
      if (!navigator.onLine) return;
      const pendingCount = await db.pendingOps.where("status").equals("PENDING").count();
      if (pendingCount === 0) return;
      const reachable = await pingBackendHealth();
      if (reachable && !lastReachable) void flushQueue();
      lastReachable = reachable;
    })();
  }, HEALTH_RECOVERY_POLL_MS);

  return () => {
    window.removeEventListener("online", onOnline);
    clearInterval(interval);
  };
}

export async function retryFailedOp(op: PendingOp): Promise<void> {
  await db.pendingOps.update(op.id!, { status: "PENDING", lastError: undefined });
  void flushQueue();
}

export async function discardFailedOp(op: PendingOp): Promise<void> {
  await db.pendingOps.delete(op.id!);
}
