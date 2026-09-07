import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { roleLabel, useAuth } from "../lib/auth";
import { cachedGet } from "../lib/cache";
import { SyncIndicator } from "./SyncIndicator";
import { IconAlert, IconClients, IconDashboard, IconList, IconLogout, IconShield } from "./icons";
import type { DashboardStats } from "../types/api";

const ALL_ROLES = [
  "AGENT_GUICHET",
  "AGENT_CONFORMITE",
  "SUPERVISEUR_SFD",
  "CONFORMITE_RESEAU",
  "AUDITEUR",
  "ADMIN_RESEAU",
];

interface NavItem {
  to: string;
  label: string;
  sub: string;
  icon: ReactNode;
  roles: string[];
  badge?: "alertes";
}

// Le perimetre par role est identique a la version precedente - c'est le miroir
// d'affichage du RBAC applique cote serveur, il ne doit jamais s'en ecarter.
const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Tableau de bord",
    sub: "Vue d'ensemble",
    icon: <IconDashboard />,
    roles: ALL_ROLES,
  },
  {
    to: "/clients",
    label: "Clients",
    sub: "Profilage & KYC",
    icon: <IconClients />,
    // Deliberement SANS ADMIN_RESEAU : separation des taches, cote backend aussi.
    roles: ["AGENT_GUICHET", "AGENT_CONFORMITE", "SUPERVISEUR_SFD", "CONFORMITE_RESEAU", "AUDITEUR"],
  },
  {
    to: "/alertes",
    label: "Alertes",
    sub: "Bloquantes & informatives",
    icon: <IconAlert />,
    roles: ["AGENT_CONFORMITE", "SUPERVISEUR_SFD", "CONFORMITE_RESEAU", "AUDITEUR"],
    badge: "alertes",
  },
  {
    to: "/admin",
    label: "Listes reseau",
    sub: "Sanctions & PPE",
    icon: <IconList />,
    roles: ["ADMIN_RESEAU"],
  },
];

/** Compteur d'alertes ouvertes pour la pastille de navigation. Silencieux en cas
 * d'echec : hors-ligne, on n'affiche pas de badge plutot qu'une erreur. */
function useOpenAlertCount(enabled: boolean): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await cachedGet<DashboardStats>("/dashboard/stats");
        if (!cancelled) setCount(data.alertes_ouvertes);
      } catch {
        /* hors-ligne ou endpoint indisponible : pas de badge, pas d'erreur */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return count;
}

export function Layout() {
  const { role, logout } = useAuth();
  const location = useLocation();

  const items = NAV_ITEMS.filter((item) => role && item.roles.includes(role));
  const showsAlerts = items.some((item) => item.badge === "alertes");
  const openAlerts = useOpenAlertCount(showsAlerts);

  // Les sous-routes (ex: /clients/FID-...) n'ont pas d'entree de menu : on leur
  // donne quand meme un titre parlant plutot que de retomber sur "Sentinel".
  const current = items.find((item) => item.to === location.pathname);
  const isFiche = location.pathname.startsWith("/clients/");
  const title = current?.label ?? (isFiche ? "Fiche client" : "Sentinel");
  const subtitle =
    current?.sub ?? (isFiche ? "Identite, comptes et mouvements" : "Filtrage LBC/FT/FP");

  const badgeFor = (item: NavItem) =>
    item.badge === "alertes" && openAlerts && openAlerts > 0 ? openAlerts : null;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <IconShield size={20} />
          </span>
          <span>
            <span className="brand-name">Sentinel</span>
            <br />
            <span className="brand-sub">Conformite LBC/FT/FP</span>
          </span>
        </div>

        <div className="nav-section">Modules</div>
        <nav className="nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              {item.icon}
              <span>
                <span className="nav-label">{item.label}</span>
                <br />
                <span className="nav-sub">{item.sub}</span>
              </span>
              {badgeFor(item) && <span className="nav-badge">{badgeFor(item)}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="side-foot">
          <strong style={{ color: "var(--side-ink)" }}>Reseau CIF</strong>
          <br />
          DigiCoop-WA+ · UEMOA
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{title}</h1>
            <div className="muted">{subtitle}</div>
          </div>
          <div className="spacer" />
          <SyncIndicator />
          <span className="user-chip">
            <span className="avatar">{initials(role)}</span>
            <span style={{ fontSize: 12.5, fontWeight: 550 }}>{role ? roleLabel(role) : ""}</span>
          </span>
          <button className="btn ghost" onClick={logout} title="Se deconnecter">
            <IconLogout size={16} />
          </button>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            {item.icon}
            <span>{item.label.split(" ")[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function initials(role: string | null): string {
  if (!role) return "?";
  return role
    .split("_")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}
