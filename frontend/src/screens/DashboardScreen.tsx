import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../lib/api";
import { cachedGet } from "../lib/cache";
import { CacheBadge } from "../components/CacheBadge";
import { Gauge, Meter, Sparkline } from "../components/charts";
import { IconAlert, IconClients, IconSearch, IconTrend, IconWallet, IconWarning } from "../components/icons";
import type { DashboardStats, SeriePoint } from "../types/api";

/** Format compact pour les grands volumes (6 980 000 -> "6,98 M") : dans une
 * tuile etroite, le montant complet deborde ou casse la grille. */
function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k`;
  return n.toLocaleString("fr-FR");
}

function formatDateHeure(iso?: string | null): string {
  if (!iso) return "Aucun";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function totals(serie: SeriePoint[]): number[] {
  return serie.map((point) => point.total);
}

interface TileProps {
  value: string | number;
  label: string;
  foot?: string;
  icon?: ReactNode;
  accent?: "amber" | "red" | "teal" | "violet";
  serie?: number[];
  serieColor?: string;
  delay?: number;
}

function StatTile({ value, label, foot, icon, accent, serie, serieColor, delay = 0 }: TileProps) {
  return (
    <div
      className={`stat-tile hover-lift card-shine animate-in${accent ? ` accent-${accent}` : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <span className="stat-value">{value}</span>
      {foot && <span className="stat-foot">{foot}</span>}
      {serie && serie.length > 0 && (
        <Sparkline values={serie} color={serieColor} label={`Tendance 7 jours - ${label}`} />
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="stack">
      <div className="skeleton" style={{ height: 168 }} />
      <div className="stat-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 118 }} />
        ))}
      </div>
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
    void (async () => {
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

  if (loading) return <DashboardSkeleton />;
  if (error) return <div className="error-banner">{error}</div>;
  if (!stats) return null;

  const locale = stats.vue === "LOCALE";

  return (
    <div className="stack">
      {/* Bandeau d'entete : ce que voit l'utilisateur avant tout scroll */}
      <section className="hero animate-in">
        <div className="hero-grid">
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <span className="pill teal">Moteur de filtrage actif</span>
              <span className="pill neutral bare">
                {locale ? `Vue locale · ${stats.sfd_nom ?? "SFD"}` : "Vue reseau · toutes les SFD"}
              </span>
              {stats.alertes_bloquantes_ouvertes > 0 && (
                <span className="pill red">{stats.alertes_bloquantes_ouvertes} bloquante(s)</span>
              )}
            </div>

            <h2>
              <span className="gradient-text">SentinelleCoop</span>{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>· conformite</span>
            </h2>
            <p className="muted" style={{ maxWidth: 560, marginTop: 6 }}>
              Filtrage des clients et des operations contre les listes de sanctions et PPE,
              consolidation du solde global multi-caisses et alertes bloquantes ou informatives.
            </p>

            <div className="hero-figures">
              <div className="hero-figure">
                <div className="v">{stats.total_clients}</div>
                <div className="k">Clients au perimetre</div>
              </div>
              <div className="hero-figure">
                <div className="v">{stats.total_comptes}</div>
                <div className="k">Comptes suivis</div>
              </div>
              <div className="hero-figure">
                <div className="v">{formatCompact(stats.solde_total)}</div>
                <div className="k">Encours (FCFA)</div>
              </div>
              <div className="hero-figure">
                <div className="v">{stats.alertes_ouvertes}</div>
                <div className="k">Alertes ouvertes</div>
              </div>
            </div>
          </div>

          <Gauge value={stats.score_conformite} />
        </div>
      </section>

      {fromCache && (
        <div className="row">
          <CacheBadge cachedAt={cachedAt} />
        </div>
      )}

      {stats.alertes_bloquantes_ouvertes > 0 && (
        <Link to="/alertes" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="callout hover-lift animate-in">
            <span className="callout-icon glow-critical">
              <IconWarning size={19} />
            </span>
            <div style={{ flex: 1 }}>
              <strong style={{ color: "var(--red)" }}>
                {stats.alertes_bloquantes_ouvertes} alerte(s) bloquante(s) en attente
              </strong>
              <div className="muted">
                Correspondance forte avec une liste de sanctions ou PPE — traitement requis avant
                deblocage de l'operation.
              </div>
            </div>
            <span className="pill red bare">Traiter</span>
          </div>
        </Link>
      )}

      <section className="stack tight">
        <h3>Activite du perimetre</h3>
        <div className="stat-grid">
          <StatTile
            label="Clients"
            value={stats.total_clients}
            foot={`${stats.clients_ppe} PPE · ${stats.clients_risque_eleve} risque eleve`}
            icon={<IconClients size={15} />}
            serie={totals(stats.serie_clients)}
            delay={0}
          />
          <StatTile
            label="Filtrages"
            value={stats.total_screenings}
            foot={`Dernier : ${formatDateHeure(stats.dernier_screening_at)}`}
            icon={<IconSearch size={15} />}
            serie={totals(stats.serie_screenings)}
            serieColor="var(--chart-2)"
            delay={60}
          />
          <StatTile
            label="Alertes ouvertes"
            value={stats.alertes_ouvertes}
            foot={`${stats.alertes_bloquantes_ouvertes} bloquantes · ${stats.alertes_informatives_ouvertes} informatives`}
            icon={<IconAlert size={15} />}
            accent={stats.alertes_ouvertes > 0 ? "amber" : undefined}
            serie={totals(stats.serie_alertes)}
            serieColor="var(--chart-3)"
            delay={120}
          />
          <StatTile
            label="Encours consolide"
            value={formatCompact(stats.solde_total)}
            foot={`${stats.total_comptes} compte(s) · FCFA`}
            icon={<IconWallet size={15} />}
            delay={180}
          />
          <StatTile
            label="Operations"
            value={stats.total_transactions}
            foot={
              stats.total_transactions === 0
                ? "Aucune operation saisie"
                : `${formatCompact(stats.volume_transactions)} FCFA de volume`
            }
            icon={<IconTrend size={15} />}
            delay={240}
          />
          <StatTile
            label="Operations bloquees"
            value={stats.transactions_bloquees}
            foot="Retenues par une regle bloquante"
            icon={<IconWarning size={15} />}
            accent={stats.transactions_bloquees > 0 ? "red" : undefined}
            delay={300}
          />
        </div>
      </section>

      <section className="card animate-in">
        <div className="card-head">
          <div>
            <h3>Indicateurs de conformite</h3>
            <span className="muted">
              Calcules sur le perimetre visible — le score du bandeau en est la moyenne.
            </span>
          </div>
        </div>
        <div className="gauge-wrap">
          <div className="gauge-legend">
            <Meter
              label="Traitement des alertes"
              value={stats.taux_traitement_alertes}
              hint="Alertes levees ou confirmees sur le total ouvert"
            />
            <Meter
              label="Pieces d'identite valides"
              value={stats.taux_kyc_valide}
              hint="Regle R004 — une piece expiree bloque retrait et ouverture"
            />
            <Meter
              label="Couverture du filtrage"
              value={stats.taux_couverture_screening}
              hint="Clients filtres au moins une fois contre les listes"
            />
          </div>
        </div>
      </section>

      <section className="card animate-in">
        <div className="card-head">
          <div>
            <h3>Listes de reference du reseau</h3>
            <span className="muted">
              Lues a chaque filtrage, jamais mises en cache — une mise a jour de sanction
              s'applique sans delai.
            </span>
          </div>
        </div>
        <div className="stat-grid">
          <StatTile label="Entrees sanctions" value={stats.sanctions_listees} accent="teal" />
          <StatTile label="Entrees PPE" value={stats.ppe_listees} accent="violet" />
        </div>
      </section>
    </div>
  );
}
