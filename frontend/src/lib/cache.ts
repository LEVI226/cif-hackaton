// Cache de lecture hors-ligne : chaque GET reussi est memorise dans IndexedDB
// (table cachedReads). Si le meme GET echoue plus tard pour une raison reseau,
// on sert la derniere version connue plutot qu'un ecran d'erreur - la file de
// lib/queue.ts couvre les ECRITURES hors-ligne, ce module couvre les LECTURES.
//
// Limite assumee : seules les requetes deja vues en ligne au moins une fois
// sont disponibles hors-ligne (par cle exacte - chemin + parametres). Chercher
// un client jamais consulte pendant que le reseau est coupe ne renverra rien -
// ce n'est pas un cache universel, juste la memoire de ce que cet appareil a
// deja vu.

import { apiFetch, isNetworkError } from "./api";
import { db } from "./db";

export interface CachedResult<T> {
  data: T;
  fromCache: boolean;
  cachedAt?: string;
}

function cacheKey(path: string, query?: Record<string, string | undefined>): string {
  if (!query) return path;
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return qs ? `${path}?${qs}` : path;
}

/** GET avec secours hors-ligne. Toujours essaie le reseau en premier - le
 * cache n'est utilise QUE si l'appel reseau echoue pour une raison reseau
 * (jamais pour masquer une erreur 403/404, qui reste une vraie erreur). */
export async function cachedGet<T>(
  path: string,
  query?: Record<string, string | undefined>,
): Promise<CachedResult<T>> {
  const key = cacheKey(path, query);
  try {
    const data = await apiFetch<T>(path, { query });
    await db.cachedReads.put({ key, data, cachedAt: new Date().toISOString() });
    return { data, fromCache: false };
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    const cached = await db.cachedReads.get(key);
    if (cached) {
      return { data: cached.data as T, fromCache: true, cachedAt: cached.cachedAt };
    }
    throw error;
  }
}
