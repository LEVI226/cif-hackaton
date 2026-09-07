import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "./api";
import type { LoginResponse, Role } from "../types/api";

interface AuthState {
  token: string | null;
  role: Role | null;
  sfdId: number | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = "sentinel_auth";

const EMPTY_STATE: AuthState = { token: null, role: null, sfdId: null };

/** Lit la date d'expiration inscrite dans le jeton JWT (champ `exp`), sans
 * librairie : le payload est la 2e section, encodee en base64url. */
function tokenExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof decoded.exp !== "number") return false; // pas de date : on laisse le serveur trancher
    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true; // jeton illisible = inutilisable
  }
}

/** Une session dont le jeton a expire ne doit PAS etre restauree : sinon
 * l'interface s'affiche comme connectee (le jeton existe toujours en
 * localStorage) pendant que chaque appel API repond 401, et l'utilisateur voit
 * une application vide sans comprendre pourquoi. */
function loadInitialState(): AuthState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_STATE;
  try {
    const parsed = JSON.parse(raw) as AuthState;
    if (!parsed.token || tokenExpired(parsed.token)) {
      clearStoredSession();
      return EMPTY_STATE;
    }
    return parsed;
  } catch {
    return EMPTY_STATE;
  }
}

export function clearStoredSession(): void {
  localStorage.removeItem("sentinel_token");
  localStorage.removeItem(STORAGE_KEY);
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadInitialState);

  const login = async (username: string, password: string) => {
    const response = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: { username, password },
    });
    const next: AuthState = {
      token: response.access_token,
      role: response.role,
      sfdId: response.sfd_id,
    };
    localStorage.setItem("sentinel_token", response.access_token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
  };

  const logout = () => {
    clearStoredSession();
    setState(EMPTY_STATE);
  };

  const value = useMemo(() => ({ ...state, login, logout }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit etre utilise a l'interieur de <AuthProvider>");
  return ctx;
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "AGENT_GUICHET":
      return "Agent de guichet";
    case "AGENT_CONFORMITE":
      return "Agent conformite";
    case "SUPERVISEUR_SFD":
      return "Superviseur SFD";
    case "CONFORMITE_RESEAU":
      return "Conformite reseau";
    case "AUDITEUR":
      return "Auditeur interne";
    case "ADMIN_RESEAU":
      return "Admin reseau CIF";
  }
}
