import Dexie, { type EntityTable } from "dexie";

export type PendingOpKind = "CREATE_CLIENT" | "CREATE_TRANSACTION";
export type PendingOpStatus = "PENDING" | "SYNCING" | "FAILED";

export interface PendingOp {
  id?: number;
  opId: string; // UUID genere a la creation - sert de cle Idempotency-Key
  kind: PendingOpKind;
  path: string;
  payload: unknown;
  createdAt: string;
  status: PendingOpStatus;
  lastError?: string;
}

// Une seule base locale : la file d'ecritures en attente de synchronisation.
// Volontairement minimal - cf. limitation documentee dans lib/queue.ts : la
// lecture hors-ligne n'inclut pas les creations pas encore synchronisees.
export const db = new Dexie("sentinel-offline") as Dexie & {
  pendingOps: EntityTable<PendingOp, "id">;
};

db.version(1).stores({
  pendingOps: "++id, opId, status, createdAt",
});
