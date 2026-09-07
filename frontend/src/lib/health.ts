// Detection reseau reelle - navigator.onLine seul ment : il repond "true" des
// que le wifi/la carte reseau repond, meme si le backend est injoignable
// (serveur eteint, mauvaise IP, pare-feu). On verifie donc en plus, par un
// vrai appel HTTP a /health, que L'API repond effectivement.
//
// Trois etats en resultent, pas deux :
//   ONLINE   - navigateur connecte ET backend confirme joignable
//   DEGRADED - navigateur connecte MAIS backend injoignable (le cas que
//              navigator.onLine seul ne peut pas detecter)
//   OFFLINE  - navigateur lui-meme deconnecte

import { API_BASE_URL } from "./api";

const HEALTH_TIMEOUT_MS = 3000;

export async function pingBackendHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
