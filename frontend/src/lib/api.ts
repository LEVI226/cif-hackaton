// Client HTTP minimal - pas de bibliotheque, juste fetch + gestion d'erreurs et
// du header d'authentification. Voir lib/queue.ts pour la couche hors-ligne qui
// appelle ces memes fonctions au moment de la synchronisation.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
    this.status = status;
    this.detail = detail;
  }
}

export function getToken(): string | null {
  return localStorage.getItem("sentinel_token");
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
  query?: Record<string, string | undefined>;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, idempotencyKey, query } = options;

  const url = new URL(API_BASE_URL + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new ApiError(0, "Reseau indisponible");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, data?.detail ?? data ?? response.statusText);
  }
  return data as T;
}

/** true si la derniere tentative a echoue pour une raison reseau (pas une erreur
 * metier du serveur) - c'est ce qui doit declencher la mise en file hors-ligne. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}
