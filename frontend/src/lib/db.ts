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

export interface CachedRead {
  key: string; // methode+chemin+query normalisee, cf. lib/cache.ts::cacheKey
  data: unknown;
  cachedAt: string;
}

// Deux tables locales : la file d'ecritures en attente (pendingOps) et le
// dernier resultat connu de chaque lecture consultee en ligne (cachedReads) -
// cf. lib/cache.ts pour la logique de secours hors-ligne sur cette seconde table.
export const db = new Dexie("sentinel-offline") as Dexie & {
  pendingOps: EntityTable<PendingOp, "id">;
  cachedReads: EntityTable<CachedRead, "key">;
};

db.version(1).stores({
  pendingOps: "++id, opId, status, createdAt",
});

db.version(2).stores({
  pendingOps: "++id, opId, status, createdAt",
  cachedReads: "key, cachedAt",
});
