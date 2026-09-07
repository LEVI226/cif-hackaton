import { useEffect, useState } from "react";
import { ApiError } from "../lib/api";
import { cachedGet } from "../lib/cache";
import { CacheBadge } from "../components/CacheBadge";
import type { DashboardStats } from "../types/api";

function formatMontant(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " FCFA";
}

function formatDateHeure(iso?: string | null): string {
  if (!iso) return "Aucun";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function StatTile({
  value,
  label,
  accent,
}: {
  value: string | number;
  label: string;
  accent?: "amber" | "red" | "teal";
}) {
  return (
    <div className={`stat-tile${accent ? ` accent-${accent}` : ""}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, fromCache: cached, cachedAt: at } = await cachedGet<DashboardStats>("/dashboard/stats");
        if (cancelled) return;
        setStats(data);
        setFromCache(cached);
        setCachedAt(at);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 0) {
          setError("Hors-ligne, et ce tableau de bord n'a jamais ete charge en ligne sur cet appareil.");
        } else {
          setError("Le chargement des statistiques a echoue.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="muted">Chargement...</p>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!stats) return null;

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2>Tableau de bord</h2>
          <p className="muted">
            {stats.vue === "LOCALE"
              ? `Vue locale — ${stats.sfd_nom ?? "votre SFD"}`
              : "Vue reseau — toutes les SFD"}
          </p>
        </div>
        {fromCache && <CacheBadge cachedAt={cachedAt} />}
      </div>

      <div className="card stack">
        <h3>Portefeuille</h3>
        <div className="stat-grid">
          <StatTile value={stats.total_clients} label="Clients" />
          <StatTile value={stats.total_comptes} label="Comptes" />
          <StatTile value={formatMontant(stats.solde_total)} label="Solde total" />
          <StatTile value={stats.clients_ppe} label="Clients PPE" />
          <StatTile value={stats.clients_risque_eleve} label="Risque initial eleve" />
        </div>
      </div>

      <div className="card stack">
        <h3>Filtrage et alertes</h3>
        <div className="stat-grid">
          <StatTile value={stats.total_screenings} label="Filtrages effectues" />
          <StatTile
            value={stats.alertes_bloquantes_ouvertes}
            label="Alertes bloquantes ouvertes"
            accent={stats.alertes_bloquantes_ouvertes > 0 ? "red" : undefined}
          />
          <StatTile
            value={stats.alertes_informatives_ouvertes}
            label="Alertes informatives ouvertes"
            accent={stats.alertes_informatives_ouvertes > 0 ? "amber" : undefined}
          />
          <StatTile value={stats.alertes_ouvertes} label="Total alertes ouvertes" />
        </div>
        <p className="muted">Dernier filtrage : {formatDateHeure(stats.dernier_screening_at)}</p>
      </div>

      <div className="card stack">
        <h3>Listes de reference (reseau)</h3>
        <div className="stat-grid">
          <StatTile value={stats.sanctions_listees} label="Entrees sanctions" accent="teal" />
          <StatTile value={stats.ppe_listees} label="Entrees PPE" accent="teal" />
        </div>
      </div>
    </div>
  );
}
