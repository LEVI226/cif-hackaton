import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";
import { IconWarning } from "../components/icons";
import type { AlertOut, AlertStatus, ScreeningDecision } from "../types/api";

const STATUT_LABEL: Record<AlertStatus, string> = {
  OUVERTE: "Ouverte",
  EN_COURS: "En cours",
  LEVEE: "Levee",
  CONFIRMEE: "Confirmee",
};

const STATUT_TONE: Record<AlertStatus, string> = {
  OUVERTE: "red",
  EN_COURS: "amber",
  LEVEE: "neutral",
  CONFIRMEE: "violet",
};

// La gravite vient du serveur (champ `decision`), pas d'un seuil recopie ici :
// les seuils 0,92 / 0,75 vivent uniquement dans backend/app/services/fuzzy_match.py.
const DECISION_LABEL: Record<ScreeningDecision, string> = {
  BLOQUANT: "Bloquante",
  INFORMATIF: "Informative",
  AUCUN: "Sans correspondance",
};

const DECISION_TONE: Record<ScreeningDecision, string> = {
  BLOQUANT: "red",
  INFORMATIF: "amber",
  AUCUN: "neutral",
};

export function AlertQueueScreen() {
  const [alerts, setAlerts] = useState<AlertOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AlertStatus | "">("OUVERTE");

  const load = async () => {
    setError(null);
    try {
      const data = await apiFetch<AlertOut[]>("/alerts", {
        query: filter ? { statut: filter } : {},
      });
      setAlerts(data);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 0
          ? "Hors-ligne : la file d'alertes necessite une connexion."
          : "Impossible de charger les alertes.",
      );
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const bloquantes = alerts?.filter((a) => a.decision === "BLOQUANT").length ?? 0;

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 8 }}>
          {alerts && (
            <>
              <span className="pill neutral bare">{alerts.length} alerte(s)</span>
              {bloquantes > 0 && <span className="pill red">{bloquantes} bloquante(s)</span>}
            </>
          )}
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as AlertStatus | "")}
          style={{ width: "auto", minWidth: 160 }}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="stack">
        {alerts?.map((alert, index) => (
          <AlertCard key={alert.id} alert={alert} onResolved={load} delay={index * 50} />
        ))}
        {alerts?.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "34px 20px" }}>
            <div className="stat-icon" style={{ margin: "0 auto 10px", width: 34, height: 34 }}>
              <IconWarning size={18} />
            </div>
            <strong>Aucune alerte pour ce filtre</strong>
            <div className="muted">
              Les alertes apparaissent des qu'un filtrage produit une correspondance.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertCard({
  alert,
  onResolved,
  delay,
}: {
  alert: AlertOut;
  onResolved: () => void;
  delay: number;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canResolve = alert.statut === "OUVERTE" || alert.statut === "EN_COURS";
  const bloquante = alert.decision === "BLOQUANT";

  const resolve = async (statut: "LEVEE" | "CONFIRMEE") => {
    if (!note.trim()) {
      setError("Une note de resolution est requise.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/alerts/${alert.id}`, {
        method: "PATCH",
        body: { statut, resolution_note: note },
      });
      onResolved();
    } catch {
      setError("La resolution a echoue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="card stack tight animate-in"
      style={{
        animationDelay: `${delay}ms`,
        // Liseré de gravite : la severite se lit avant meme de commencer a lire.
        borderLeft: `3px solid ${bloquante ? "var(--red)" : "var(--amber)"}`,
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="row" style={{ gap: 11, flexWrap: "nowrap" }}>
          <span className={`avatar ${bloquante ? "red" : "amber"}`}>
            <IconWarning size={16} />
          </span>
          <div>
            <div style={{ fontWeight: 600 }}>{alert.matched_on ?? "Correspondance"}</div>
            <div className="muted">
              {alert.client_fid ? (
                <Link to={`/clients/${alert.client_fid}`} className="mono">
                  {alert.client_fid}
                </Link>
              ) : (
                "Beneficiaire tiers (sans compte au reseau)"
              )}
              {" · "}
              {new Date(alert.created_at).toLocaleString("fr-FR")}
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <span className={`pill ${DECISION_TONE[alert.decision]}`}>
            {DECISION_LABEL[alert.decision]}
          </span>
          <span className={`pill ${STATUT_TONE[alert.statut]} bare`}>
            {STATUT_LABEL[alert.statut]}
          </span>
        </div>
      </div>

      <div className="row" style={{ gap: 18 }}>
        <span className="muted">
          Score de correspondance <strong style={{ color: "var(--ink)" }}>{(alert.score * 100).toFixed(0)} %</strong>
        </span>
      </div>

      {canResolve && (
        <div className="stack tight" style={{ marginTop: 4 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor={`note-${alert.id}`}>Note de resolution (tracee au journal d'audit)</label>
            <input
              id={`note-${alert.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ex : homonyme confirme, date de naissance differente"
            />
          </div>
          {error && <div className="error-banner">{error}</div>}
          <div className="row">
            <button className="btn secondary" disabled={submitting} onClick={() => resolve("LEVEE")}>
              Lever (faux positif)
            </button>
            <button className="btn" disabled={submitting} onClick={() => resolve("CONFIRMEE")}>
              Confirmer le risque
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
