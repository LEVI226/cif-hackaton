import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../lib/api";
import type { AlertOut, AlertStatus } from "../types/api";

const STATUT_LABEL: Record<AlertStatus, string> = {
  OUVERTE: "Ouverte",
  EN_COURS: "En cours",
  LEVEE: "Levee",
  CONFIRMEE: "Confirmee",
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

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>File d'alertes</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value as AlertStatus | "")}>
          <option value="">Toutes</option>
          {Object.entries(STATUT_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="stack">
        {alerts?.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onResolved={load} />
        ))}
        {alerts?.length === 0 && <p className="muted">Aucune alerte pour ce filtre.</p>}
      </div>
    </div>
  );
}

function AlertCard({ alert, onResolved }: { alert: AlertOut; onResolved: () => void }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canResolve = alert.statut === "OUVERTE" || alert.statut === "EN_COURS";

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
    <div className="card stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <strong>{alert.client_fid ?? "Beneficiaire tiers"}</strong>{" "}
          <span className="muted">score {alert.score.toFixed(2)}</span>
        </div>
        <span className={`pill ${alert.statut === "OUVERTE" ? "red" : "teal"}`}>
          {STATUT_LABEL[alert.statut]}
        </span>
      </div>
      <p>{alert.matched_on}</p>
      <p className="muted">{new Date(alert.created_at).toLocaleString("fr-FR")}</p>

      {canResolve && (
        <div className="stack">
          <div className="field">
            <label htmlFor={`note-${alert.id}`}>Note de resolution</label>
            <input
              id={`note-${alert.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ex : homonyme confirme, dossier different"
            />
          </div>
          {error && <div className="error-banner">{error}</div>}
          <div className="row">
            <button className="btn" disabled={submitting} onClick={() => resolve("LEVEE")}>
              Lever (faux positif)
            </button>
            <button
              className="btn secondary"
              disabled={submitting}
              onClick={() => resolve("CONFIRMEE")}
            >
              Confirmer le risque
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
