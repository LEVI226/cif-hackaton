import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";
import { submitOrQueue } from "../lib/queue";
import type {
  ActiviteClientOut,
  SoldeGlobalOut,
  TransactionOut,
  TransactionType,
} from "../types/api";

export function ClientFicheScreen() {
  const { fid } = useParams<{ fid: string }>();
  const [solde, setSolde] = useState<SoldeGlobalOut | null>(null);
  const [activite, setActivite] = useState<ActiviteClientOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // `reload` sert aussi de callback apres une operation reussie (depot, etc.) :
  // il ne doit PAS remplacer toute la page par "Chargement..." dans ce cas, sinon
  // le formulaire (et le message de confirmation qu'il affiche) disparait avant
  // que l'agent ait pu le lire. Le plein-page loading ne s'applique qu'au tout
  // premier chargement, tant que rien n'est encore affiche.
  const reload = useCallback(async () => {
    if (!fid) return;
    setError(null);
    try {
      const [soldeData, activiteData] = await Promise.all([
        apiFetch<SoldeGlobalOut>(`/clients/${fid}/solde-global`),
        apiFetch<ActiviteClientOut>(`/clients/${fid}/mouvements`),
      ]);
      setSolde(soldeData);
      setActivite(activiteData);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 0
          ? "Hors-ligne : la fiche client necessite une connexion."
          : "Impossible de charger la fiche.",
      );
    } finally {
      setLoading(false);
    }
  }, [fid]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!fid) return null;
  if (loading) return <p className="muted">Chargement...</p>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!solde || !activite) return null;

  return (
    <div className="stack">
      <div>
        <h1>
          <code>{fid}</code>
        </h1>
        <span className={`pill ${activite.classification === "HABITUEL" ? "teal" : "amber"}`}>
          {activite.classification === "HABITUEL" ? "Client habituel" : "Client occasionnel"}
        </span>{" "}
        <span className="muted">
          {activite.nb_operations_recentes} operation(s) sur {activite.fenetre_jours} jours
        </span>
      </div>

      <div className="card">
        <h2>Solde global consolide</h2>
        <p style={{ fontSize: 28, fontWeight: 600, fontFamily: "var(--mono)" }}>
          {solde.solde_total.toLocaleString("fr-FR")} {solde.devise}
        </p>
        <div className="tblwrap">
          <table>
            <thead>
              <tr>
                <th>Compte</th>
                <th>SFD</th>
                <th>Statut</th>
                <th>Solde</th>
              </tr>
            </thead>
            <tbody>
              {solde.comptes.map((c) => (
                <tr key={c.numero_compte}>
                  <td>{c.numero_compte}</td>
                  <td>{c.sfd_code}</td>
                  <td>
                    <span className={`pill ${c.statut === "BLOQUE" ? "red" : "teal"}`}>{c.statut}</span>
                  </td>
                  <td style={{ fontFamily: "var(--mono)" }}>{c.solde.toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {solde.comptes.length > 0 && (
        <NewTransactionForm
          numerosComptes={solde.comptes.map((c) => c.numero_compte)}
          onDone={reload}
        />
      )}

      <div className="card">
        <h2>Mouvements recents</h2>
        <div className="tblwrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Compte</th>
                <th>Type</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {activite.mouvements.map((m, i) => (
                <tr key={i}>
                  <td>{new Date(m.date).toLocaleString("fr-FR")}</td>
                  <td>{m.numero_compte}</td>
                  <td>{m.type}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{m.montant.toLocaleString("fr-FR")}</td>
                </tr>
              ))}
              {activite.mouvements.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    Aucun mouvement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function NewTransactionForm({
  numerosComptes,
  onDone,
}: {
  numerosComptes: string[];
  onDone: () => void;
}) {
  const [numeroCompte, setNumeroCompte] = useState(numerosComptes[0]);
  const [montant, setMontant] = useState("");
  const [type, setType] = useState<TransactionType>("DEPOT");
  const [beneficiaireNom, setBeneficiaireNom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "teal" | "amber" | "red" } | null>(
    null,
  );

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const outcome = await submitOrQueue<TransactionOut>("CREATE_TRANSACTION", "/transactions", {
        numero_compte: numeroCompte,
        montant: Number(montant),
        type,
        beneficiaire_nom: type === "VIREMENT" ? beneficiaireNom : null,
      });
      if (outcome.queued) {
        setMessage({ text: "Hors-ligne : operation mise en file.", tone: "amber" });
      } else if (outcome.result.statut === "BLOQUEE") {
        setMessage({
          text: `Compte verrouille : ${outcome.result.alert_reasons.join(" ; ")}`,
          tone: "red",
        });
        onDone();
      } else if (outcome.result.alert_reasons.length > 0) {
        setMessage({ text: `Operation validee, alerte ouverte : ${outcome.result.alert_reasons.join(" ; ")}`, tone: "amber" });
        onDone();
      } else {
        setMessage({ text: "Operation validee.", tone: "teal" });
        onDone();
      }
      setMontant("");
      setBeneficiaireNom("");
    } catch (err) {
      setMessage({
        text: err instanceof ApiError ? String(err.detail) : "L'operation a echoue.",
        tone: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <h2>Nouvelle operation</h2>
      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="compte">Compte</label>
          <select id="compte" value={numeroCompte} onChange={(e) => setNumeroCompte(e.target.value)}>
            {numerosComptes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="type">Type</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
            <option value="DEPOT">Depot</option>
            <option value="RETRAIT">Retrait</option>
            <option value="VIREMENT">Virement</option>
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="montant">Montant (FCFA)</label>
          <input
            id="montant"
            type="number"
            min="1"
            step="1"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            required
          />
        </div>
      </div>
      {type === "VIREMENT" && (
        <div className="field">
          <label htmlFor="beneficiaire">Nom du beneficiaire (filtre en temps reel)</label>
          <input
            id="beneficiaire"
            value={beneficiaireNom}
            onChange={(e) => setBeneficiaireNom(e.target.value)}
            required
          />
        </div>
      )}
      {message && <span className={`pill ${message.tone}`}>{message.text}</span>}
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? "Traitement..." : "Valider l'operation"}
      </button>
    </form>
  );
}
