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

function loadInitialState(): AuthState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { token: null, role: null, sfdId: null };
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return { token: null, role: null, sfdId: null };
  }
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
    localStorage.removeItem("sentinel_token");
    localStorage.removeItem(STORAGE_KEY);
    setState({ token: null, role: null, sfdId: null });
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
