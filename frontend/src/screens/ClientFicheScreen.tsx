import { Children, useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";
import { submitOrQueue } from "../lib/queue";
import type {
  ActiviteClientOut,
  ClientOut,
  SoldeGlobalOut,
  TransactionOut,
  TransactionType,
} from "../types/api";

export function ClientFicheScreen() {
  const { fid } = useParams<{ fid: string }>();
  const [clientInfo, setClientInfo] = useState<ClientOut | null>(null);
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
      const [clientData, soldeData, activiteData] = await Promise.all([
        apiFetch<ClientOut>(`/clients/${fid}`),
        apiFetch<SoldeGlobalOut>(`/clients/${fid}/solde-global`),
        apiFetch<ActiviteClientOut>(`/clients/${fid}/mouvements`),
      ]);
      setClientInfo(clientData);
      setSolde(soldeData);
      setActivite(activiteData);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 0
          ? "Hors-ligne : la fiche client necessite une connexion."
          : err instanceof ApiError && err.status === 403
            ? "Ce client n'a pas de compte dans votre SFD - hors de votre perimetre."
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
  if (!clientInfo || !solde || !activite) return null;

  return (
    <div className="stack">
      <FicheHeader client={clientInfo} activite={activite} />
      <KycFiche client={clientInfo} />

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Solde global consolide</h2>
          <VueBadge vue={solde.vue} masques={solde.comptes_masques} label="compte(s)" />
        </div>
        <p style={{ fontSize: 28, fontWeight: 600, fontFamily: "var(--mono)" }}>
          {solde.solde_total.toLocaleString("fr-FR")} {solde.devise}
          {solde.vue === "LOCALE" && (
            <span className="muted" style={{ fontSize: 13, fontWeight: 400, marginLeft: 10 }}>
              (votre SFD uniquement)
            </span>
          )}
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
              {solde.comptes.map((c, i) => (
                <tr key={i}>
                  <td>{c.visible ? c.numero_compte : <span className="muted">masque</span>}</td>
                  <td>{c.sfd_code}</td>
                  <td>
                    <span className={`pill ${c.statut === "BLOQUE" ? "red" : "teal"}`}>{c.statut}</span>
                  </td>
                  <td style={{ fontFamily: "var(--mono)" }}>
                    {c.solde !== null ? c.solde.toLocaleString("fr-FR") : <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {solde.comptes.some((c) => c.visible) && (
        <NewTransactionForm
          numerosComptes={solde.comptes.filter((c) => c.visible).map((c) => c.numero_compte)}
          onDone={reload}
        />
      )}

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Mouvements recents</h2>
          <VueBadge vue={activite.vue} masques={activite.mouvements_masques} label="mouvement(s)" />
        </div>
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
                    Aucun mouvement visible.
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

function FicheHeader({ client, activite }: { client: ClientOut; activite: ActiviteClientOut }) {
  return (
    <div>
      <h1>
        {client.nom} {client.prenom}
        {client.nom_masque && (
          <span className="pill amber" style={{ marginLeft: 10, verticalAlign: "middle" }}>
            nom masque (reseau)
          </span>
        )}
      </h1>
      <div className="row" style={{ marginTop: 4 }}>
        <code>{client.fid}</code>
        <span className={`pill ${activite.classification === "HABITUEL" ? "teal" : "amber"}`}>
          {activite.classification === "HABITUEL" ? "Client habituel" : "Client occasionnel"}
        </span>
        {client.est_ppe && <span className="pill amber">PPE</span>}
        {client.niveau_risque_initial !== "FAIBLE" && (
          <span className={`pill ${client.niveau_risque_initial === "ELEVE" ? "red" : "amber"}`}>
            Risque {client.niveau_risque_initial.toLowerCase()}
          </span>
        )}
        <span className="muted">
          {activite.nb_operations_recentes} operation(s) sur {activite.fenetre_jours} jours
        </span>
      </div>
    </div>
  );
}

function VueBadge({ vue, masques, label }: { vue: "LOCALE" | "RESEAU"; masques: number; label: string }) {
  if (vue === "RESEAU") return <span className="pill teal">Vue reseau</span>;
  return (
    <span className="pill amber" title="Deblocage complet possible pour conformite/superviseur en cas d'alerte">
      Vue locale{masques > 0 ? ` · ${masques} ${label} masque(s)` : ""}
    </span>
  );
}

function KycFiche({ client }: { client: ClientOut }) {
  const isMorale = client.type_client === "MORALE";
  return (
    <div className="card stack">
      <h2>Fiche KYC / LBC-FT-FP</h2>

      <KycSection title={isMorale ? "Identification" : "Etat civil"}>
        <KycRow label="Statut" value={client.statut_relation} />
        {!isMorale && <KycRow label="Sexe" value={client.sexe === "M" ? "Masculin" : client.sexe === "F" ? "Feminin" : null} />}
        {!isMorale && <KycRow label="Date de naissance" value={client.date_naissance} />}
        {!isMorale && <KycRow label="Lieu de naissance" value={client.lieu_naissance} />}
        <KycRow label="Nationalite" value={client.nationalite} />
        {!isMorale && <KycRow label="Situation matrimoniale" value={client.situation_matrimoniale} />}
        {!isMorale && <KycRow label="Personnes a charge" value={client.nb_personnes_charge?.toString() ?? null} />}
      </KycSection>

      <KycSection title="Piece d'identite">
        <KycRow label="Type" value={client.type_piece} />
        <KycRow label="Numero" value={client.numero_piece} />
        <KycRow label="Expiration" value={client.date_expiration_piece} highlight={isPieceExpired(client.date_expiration_piece)} />
        <KycRow label="Copie verifiee" value={client.copie_piece_verifiee ? "Oui" : "Non"} />
      </KycSection>

      <KycSection title="Coordonnees">
        <KycRow label="Telephone" value={client.telephone} />
        <KycRow label="E-mail" value={client.email} />
        <KycRow label="Adresse" value={client.adresse} />
        <KycRow label="Region / Province" value={[client.region, client.province].filter(Boolean).join(" / ") || null} />
        <KycRow label="Commune / Secteur" value={[client.commune, client.secteur_quartier].filter(Boolean).join(" / ") || null} />
      </KycSection>

      <KycSection title="Activite et revenus">
        <KycRow label="Profession" value={client.profession} />
        <KycRow label="Secteur" value={client.secteur_activite} />
        <KycRow label="Revenu mensuel estime" value={formatMontant(client.revenu_mensuel_estime)} />
        <KycRow label="Patrimoine estime" value={formatMontant(client.patrimoine_estime)} />
      </KycSection>

      <KycSection title="Filtrage AML / CFT / PPE">
        <KycRow label="PPE" value={client.est_ppe ? "Oui" : "Non"} highlight={client.est_ppe} />
        <KycRow label="Proche de PPE" value={client.proche_ppe ? "Oui" : "Non"} highlight={client.proche_ppe} />
        <KycRow label="Zone / pays a haut risque" value={client.zone_haut_risque} />
        <KycRow label="Niveau de risque initial" value={client.niveau_risque_initial} highlight={client.niveau_risque_initial !== "FAIBLE"} />
      </KycSection>

      {isMorale && (
        <KycSection title="Personne morale / beneficiaire effectif">
          <KycRow label="Forme juridique" value={client.forme_juridique} />
          <KycRow label="RCCM" value={client.rccm} />
          <KycRow label="IFU" value={client.ifu} />
          <KycRow label="Siege social" value={client.siege_social} />
          <KycRow
            label="Representant legal"
            value={[client.representant_legal_nom, client.representant_legal_prenom].filter(Boolean).join(" ") || null}
          />
          <KycRow
            label="Beneficiaire effectif"
            value={
              client.beneficiaire_effectif_nom
                ? `${client.beneficiaire_effectif_nom}${client.beneficiaire_effectif_part ? ` (${client.beneficiaire_effectif_part}%)` : ""}`
                : null
            }
            highlight={client.beneficiaire_effectif_ppe}
          />
        </KycSection>
      )}
    </div>
  );
}

function isPieceExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function formatMontant(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

function KycSection({ title, children }: { title: string; children: React.ReactNode }) {
  // KycRow renvoie `null` pour toute valeur absente - React.Children.toArray
  // filtre deja les enfants null/undefined, donc une liste vide signifie
  // "aucune donnee renseignee dans cette section", pas juste "aucun enfant".
  if (Children.toArray(children).length === 0) return null;
  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
      <h3 style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {title}
      </h3>
      <div className="stack" style={{ gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function KycRow({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="row" style={{ justifyContent: "space-between", fontSize: 13.5 }}>
      <span className="muted">{label}</span>
      <span style={highlight ? { color: "var(--red)", fontWeight: 500 } : undefined}>{value}</span>
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
  const [viaProcuration, setViaProcuration] = useState(false);
  const [mandataireNom, setMandataireNom] = useState("");
  const [mandatairePiece, setMandatairePiece] = useState("");
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
        mandataire_nom: type === "RETRAIT" && viaProcuration ? mandataireNom : null,
        mandataire_piece: type === "RETRAIT" && viaProcuration ? mandatairePiece : null,
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
      setMandataireNom("");
      setMandatairePiece("");
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
      {type === "RETRAIT" && (
        <div className="stack" style={{ gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={viaProcuration}
              onChange={(e) => setViaProcuration(e.target.checked)}
              style={{ width: "auto" }}
            />
            Retrait par procuration
          </label>
          {viaProcuration && (
            <div className="row">
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="mandataire-nom">Nom du mandataire</label>
                <input
                  id="mandataire-nom"
                  value={mandataireNom}
                  onChange={(e) => setMandataireNom(e.target.value)}
                  required
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="mandataire-piece">N° piece du mandataire</label>
                <input
                  id="mandataire-piece"
                  value={mandatairePiece}
                  onChange={(e) => setMandatairePiece(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
        </div>
      )}
      {message && <span className={`pill ${message.tone}`}>{message.text}</span>}
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? "Traitement..." : "Valider l'operation"}
      </button>
    </form>
  );
}
