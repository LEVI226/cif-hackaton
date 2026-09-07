import { NavLink, Outlet } from "react-router-dom";
import { roleLabel, useAuth } from "../lib/auth";
import { SyncIndicator } from "./SyncIndicator";

const ALL_ROLES = [
  "AGENT_GUICHET",
  "AGENT_CONFORMITE",
  "SUPERVISEUR_SFD",
  "CONFORMITE_RESEAU",
  "AUDITEUR",
  "ADMIN_RESEAU",
];

const NAV_ITEMS: { to: string; label: string; roles: string[] }[] = [
  { to: "/", label: "Tableau de bord", roles: ALL_ROLES },
  {
    to: "/clients",
    label: "Clients",
    // Deliberement SANS ADMIN_RESEAU : separation des taches, cote backend aussi.
    roles: ["AGENT_GUICHET", "AGENT_CONFORMITE", "SUPERVISEUR_SFD", "CONFORMITE_RESEAU", "AUDITEUR"],
  },
  {
    to: "/alertes",
    label: "Alertes",
    roles: ["AGENT_CONFORMITE", "SUPERVISEUR_SFD", "CONFORMITE_RESEAU", "AUDITEUR"],
  },
  { to: "/admin", label: "Listes reseau", roles: ["ADMIN_RESEAU"] },
];

export function Layout() {
  const { role, logout } = useAuth();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          borderBottom: "1px solid var(--line)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <strong style={{ fontSize: 16 }}>Sentinel</strong>
        <nav style={{ display: "flex", gap: 14, flex: 1 }}>
          {NAV_ITEMS.filter((item) => role && item.roles.includes(role)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                color: isActive ? "var(--ink)" : "var(--muted)",
                fontWeight: isActive ? 600 : 400,
                textDecoration: "none",
                fontSize: 14,
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <SyncIndicator />
        <span className="muted">{role ? roleLabel(role) : ""}</span>
        <button className="btn secondary" onClick={logout}>
          Deconnexion
        </button>
      </header>
      <main style={{ flex: 1, padding: 20, maxWidth: 900, width: "100%", margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
