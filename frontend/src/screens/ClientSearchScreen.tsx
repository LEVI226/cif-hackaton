import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";
import { submitOrQueue } from "../lib/queue";
import { useAuth } from "../lib/auth";
import type { ClientCreate, ClientOut } from "../types/api";

const CAN_CREATE_CLIENT = ["AGENT_GUICHET", "SUPERVISEUR_SFD"];

export function ClientSearchScreen() {
  const { role } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientOut[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);

  const onSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    setSearching(true);
    setSearchError(null);
    try {
      const data = await apiFetch<ClientOut[]>("/clients/search", { query: { q: query } });
      setResults(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setSearchError("Hors-ligne : la recherche necessite une connexion (les listes ne sont pas mises en cache localement pour l'instant).");
      } else {
        setSearchError("La recherche a echoue.");
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Clients</h1>
        {role && CAN_CREATE_CLIENT.includes(role) && (
          <button className="btn" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Fermer" : "Nouveau client"}
          </button>
        )}
      </div>

      {showCreate && <CreateClientForm onCreated={() => {}} />}

      <form className="row" onSubmit={onSearch}>
        <input
          placeholder="Nom, prenom, ou FID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn" type="submit" disabled={searching}>
          {searching ? "Recherche..." : "Rechercher"}
        </button>
      </form>

      {searchError && <div className="error-banner">{searchError}</div>}

      {results && (
        <div className="tblwrap">
          <table>
            <thead>
              <tr>
                <th>FID</th>
                <th>Nom</th>
                <th>Prenom</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {results.map((c) => (
                <tr key={c.fid}>
                  <td>
                    <code>{c.fid}</code>
                  </td>
                  <td>
                    {c.nom}
                    {c.nom_masque && (
                      <span className="pill amber" style={{ marginLeft: 8 }} title="Nom masque - visible integralement seulement en cas d'alerte confirmee">
                        masque
                      </span>
                    )}
                  </td>
                  <td>{c.prenom}</td>
                  <td>
                    <Link to={`/clients/${c.fid}`}>Voir la fiche →</Link>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    Aucun client trouve.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM: ClientCreate = {
  nom: "",
  prenom: "",
  type_client: "PHYSIQUE",
  statut_relation: "CLIENT",
  copie_piece_verifiee: false,
  est_ppe: false,
  proche_ppe: false,
  niveau_risque_initial: "FAIBLE",
  beneficiaire_effectif_ppe: false,
  external_ids: {},
};

function CreateClientForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState<ClientCreate>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "teal" | "amber" | "red" } | null>(
    null,
  );

  const set = <K extends keyof ClientCreate>(key: K, value: ClientCreate[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const outcome = await submitOrQueue<{ fid: string }>("CREATE_CLIENT", "/clients", form);
      if (outcome.queued) {
        setMessage({
          text: "Hors-ligne : client mis en file, sera cree a la reconnexion.",
          tone: "amber",
        });
      } else {
        setMessage({ text: `Client cree — FID ${outcome.result.fid}`, tone: "teal" });
        onCreated();
      }
      setForm(EMPTY_FORM);
    } catch (err) {
      setMessage({
        text: err instanceof ApiError ? String(err.detail) : "La creation a echoue.",
        tone: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isMorale = form.type_client === "MORALE";

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <h2>Fiche client — KYC / LBC-FT-FP</h2>

      <Section title="1 · Identification">
        <div className="row">
          <Field label="Type de client" flex={1}>
            <select value={form.type_client} onChange={(e) => set("type_client", e.target.value as ClientCreate["type_client"])}>
              <option value="PHYSIQUE">Personne physique</option>
              <option value="MORALE">Personne morale</option>
            </select>
          </Field>
          <Field label="Statut" flex={1}>
            <select value={form.statut_relation} onChange={(e) => set("statut_relation", e.target.value as ClientCreate["statut_relation"])}>
              <option value="MEMBRE">Membre</option>
              <option value="CLIENT">Client</option>
              <option value="OCCASIONNEL">Occasionnel</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title={isMorale ? "2 · Denomination" : "2 · Etat civil"}>
        <div className="row">
          <Field label={isMorale ? "Denomination sociale" : "Nom de famille"} flex={1}>
            <input value={form.nom} onChange={(e) => set("nom", e.target.value)} required />
          </Field>
          {!isMorale && (
            <Field label="Prenoms" flex={1}>
              <input value={form.prenom} onChange={(e) => set("prenom", e.target.value)} required />
            </Field>
          )}
        </div>
        {!isMorale && (
          <>
            <div className="row">
              <Field label="Sexe" flex={1}>
                <select value={form.sexe ?? ""} onChange={(e) => set("sexe", e.target.value || null)}>
                  <option value="">—</option>
                  <option value="M">Masculin</option>
                  <option value="F">Feminin</option>
                </select>
              </Field>
              <Field label="Date de naissance" flex={1}>
                <input type="date" value={form.date_naissance ?? ""} onChange={(e) => set("date_naissance", e.target.value || null)} />
              </Field>
              <Field label="Lieu de naissance" flex={1}>
                <input value={form.lieu_naissance ?? ""} onChange={(e) => set("lieu_naissance", e.target.value)} />
              </Field>
            </div>
            <div className="row">
              <Field label="Nationalite (ISO)" flex={1}>
                <input maxLength={2} value={form.nationalite ?? ""} onChange={(e) => set("nationalite", e.target.value.toUpperCase())} placeholder="BF" />
              </Field>
              <Field label="Situation matrimoniale" flex={1}>
                <select value={form.situation_matrimoniale ?? ""} onChange={(e) => set("situation_matrimoniale", e.target.value || null)}>
                  <option value="">—</option>
                  <option value="CELIBATAIRE">Celibataire</option>
                  <option value="MARIE">Marie(e)</option>
                  <option value="DIVORCE">Divorce(e)</option>
                  <option value="VEUF">Veuf(ve)</option>
                </select>
              </Field>
              <Field label="Personnes a charge" flex={1}>
                <input type="number" min="0" value={form.nb_personnes_charge ?? ""} onChange={(e) => set("nb_personnes_charge", e.target.value ? Number(e.target.value) : null)} />
              </Field>
            </div>
          </>
        )}
      </Section>

      <Section title="3 · Piece d'identite">
        <div className="row">
          <Field label="Type de piece" flex={1}>
            <select value={form.type_piece ?? ""} onChange={(e) => set("type_piece", e.target.value || null)}>
              <option value="">—</option>
              <option value="CNIB">CNIB</option>
              <option value="PASSEPORT">Passeport</option>
              <option value="CONSULAIRE">Carte consulaire</option>
              {isMorale && <option value="RCCM">RCCM</option>}
            </select>
          </Field>
          <Field label="N° de la piece" flex={1}>
            <input value={form.numero_piece ?? ""} onChange={(e) => set("numero_piece", e.target.value)} />
          </Field>
          <Field label="Lieu de delivrance" flex={1}>
            <input value={form.lieu_delivrance_piece ?? ""} onChange={(e) => set("lieu_delivrance_piece", e.target.value)} />
          </Field>
        </div>
        <div className="row">
          <Field label="Date de delivrance" flex={1}>
            <input type="date" value={form.date_delivrance_piece ?? ""} onChange={(e) => set("date_delivrance_piece", e.target.value || null)} />
          </Field>
          <Field label="Date d'expiration" flex={1}>
            <input type="date" value={form.date_expiration_piece ?? ""} onChange={(e) => set("date_expiration_piece", e.target.value || null)} />
          </Field>
          <div className="field" style={{ flex: 1, alignSelf: "flex-end", paddingBottom: 9 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={form.copie_piece_verifiee} onChange={(e) => set("copie_piece_verifiee", e.target.checked)} style={{ width: "auto" }} />
              Copie verifiee
            </label>
          </div>
        </div>
      </Section>

      <Section title="4 · Coordonnees">
        <div className="row">
          <Field label="Telephone" flex={1}>
            <input value={form.telephone ?? ""} onChange={(e) => set("telephone", e.target.value)} placeholder="+226 70 00 00 00" />
          </Field>
          <Field label="E-mail" flex={1}>
            <input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </div>
        <Field label="Adresse">
          <input value={form.adresse ?? ""} onChange={(e) => set("adresse", e.target.value)} />
        </Field>
        <div className="row">
          <Field label="Region" flex={1}>
            <input value={form.region ?? ""} onChange={(e) => set("region", e.target.value)} />
          </Field>
          <Field label="Province" flex={1}>
            <input value={form.province ?? ""} onChange={(e) => set("province", e.target.value)} />
          </Field>
          <Field label="Commune" flex={1}>
            <input value={form.commune ?? ""} onChange={(e) => set("commune", e.target.value)} />
          </Field>
          <Field label="Secteur / Quartier" flex={1}>
            <input value={form.secteur_quartier ?? ""} onChange={(e) => set("secteur_quartier", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="5 · Activite et revenus">
        <div className="row">
          <Field label="Profession / Metier" flex={1}>
            <input value={form.profession ?? ""} onChange={(e) => set("profession", e.target.value)} />
          </Field>
          <Field label="Secteur d'activite" flex={1}>
            <select value={form.secteur_activite ?? ""} onChange={(e) => set("secteur_activite", e.target.value || null)}>
              <option value="">—</option>
              <option value="agriculture">Agriculture</option>
              <option value="commerce">Commerce</option>
              <option value="artisanat">Artisanat</option>
              <option value="administration">Administration</option>
              <option value="autre">Autre</option>
            </select>
          </Field>
        </div>
        <div className="row">
          <Field label="Revenu mensuel estime (FCFA)" flex={1}>
            <input type="number" min="0" value={form.revenu_mensuel_estime ?? ""} onChange={(e) => set("revenu_mensuel_estime", e.target.value ? Number(e.target.value) : null)} />
          </Field>
          <Field label="Patrimoine approximatif (FCFA)" flex={1}>
            <input type="number" min="0" value={form.patrimoine_estime ?? ""} onChange={(e) => set("patrimoine_estime", e.target.value ? Number(e.target.value) : null)} />
          </Field>
        </div>
      </Section>

      <Section title="6 · Relation d'affaires attendue">
        <div className="row">
          <Field label="Source des fonds" flex={1}>
            <select value={form.source_fonds ?? ""} onChange={(e) => set("source_fonds", e.target.value || null)}>
              <option value="">—</option>
              <option value="salaire">Salaire</option>
              <option value="commerce">Activite commerciale</option>
              <option value="epargne">Epargne</option>
              <option value="heritage">Heritage</option>
              <option value="transfert">Transfert</option>
              <option value="autre">Autre</option>
            </select>
          </Field>
          <Field label="Frequence attendue" flex={1}>
            <select value={form.frequence_attendue ?? ""} onChange={(e) => set("frequence_attendue", e.target.value || null)}>
              <option value="">—</option>
              <option value="FAIBLE">Faible</option>
              <option value="MOYENNE">Moyenne</option>
              <option value="ELEVEE">Elevee</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="7 · Filtrage AML / CFT / PPE">
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={form.est_ppe} onChange={(e) => set("est_ppe", e.target.checked)} style={{ width: "auto" }} />
              Personne politiquement exposee (PPE)
            </label>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={form.proche_ppe} onChange={(e) => set("proche_ppe", e.target.checked)} style={{ width: "auto" }} />
              Proche / famille de PPE
            </label>
          </div>
        </div>
        <div className="row">
          <Field label="Zone / pays a haut risque" flex={1}>
            <input value={form.zone_haut_risque ?? ""} onChange={(e) => set("zone_haut_risque", e.target.value)} />
          </Field>
          <Field label="Niveau de risque initial" flex={1}>
            <select value={form.niveau_risque_initial} onChange={(e) => set("niveau_risque_initial", e.target.value as ClientCreate["niveau_risque_initial"])}>
              <option value="FAIBLE">Faible</option>
              <option value="MOYEN">Moyen</option>
              <option value="ELEVE">Eleve</option>
            </select>
          </Field>
        </div>
        <p className="muted">Le filtrage sanctions/PPE par nom se lance automatiquement a la creation.</p>
      </Section>

      {isMorale && (
        <Section title="8 · Personne morale / beneficiaire effectif">
          <div className="row">
            <Field label="Forme juridique" flex={1}>
              <select value={form.forme_juridique ?? ""} onChange={(e) => set("forme_juridique", e.target.value || null)}>
                <option value="">—</option>
                <option value="SARL">SARL</option>
                <option value="SA">SA</option>
                <option value="GIE">GIE</option>
                <option value="ASSOCIATION">Association</option>
                <option value="AUTRE">Autre</option>
              </select>
            </Field>
            <Field label="RCCM n°" flex={1}>
              <input value={form.rccm ?? ""} onChange={(e) => set("rccm", e.target.value)} />
            </Field>
            <Field label="IFU" flex={1}>
              <input value={form.ifu ?? ""} onChange={(e) => set("ifu", e.target.value)} />
            </Field>
          </div>
          <Field label="Siege social">
            <input value={form.siege_social ?? ""} onChange={(e) => set("siege_social", e.target.value)} />
          </Field>
          <div className="row">
            <Field label="Representant legal — nom" flex={1}>
              <input value={form.representant_legal_nom ?? ""} onChange={(e) => set("representant_legal_nom", e.target.value)} />
            </Field>
            <Field label="Representant legal — prenoms" flex={1}>
              <input value={form.representant_legal_prenom ?? ""} onChange={(e) => set("representant_legal_prenom", e.target.value)} />
            </Field>
          </div>
          <div className="row">
            <Field label="Beneficiaire effectif — nom" flex={1}>
              <input value={form.beneficiaire_effectif_nom ?? ""} onChange={(e) => set("beneficiaire_effectif_nom", e.target.value)} required />
            </Field>
            <Field label="% de detention" flex={1}>
              <input type="number" min="0" max="100" value={form.beneficiaire_effectif_part ?? ""} onChange={(e) => set("beneficiaire_effectif_part", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <div className="field" style={{ flex: 1, alignSelf: "flex-end", paddingBottom: 9 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={form.beneficiaire_effectif_ppe} onChange={(e) => set("beneficiaire_effectif_ppe", e.target.checked)} style={{ width: "auto" }} />
                Beneficiaire effectif PPE
              </label>
            </div>
          </div>
          <p className="muted">Une personne morale sans beneficiaire effectif declare ne peut pas etre ouverte (regle R015).</p>
        </Section>
      )}

      {message && <span className={`pill ${message.tone}`}>{message.text}</span>}
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? "Creation..." : "Creer le client"}
      </button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="stack" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
      <h3 style={{ margin: 0, color: "var(--muted)", fontSize: 12.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, flex, children }: { label: string; flex?: number; children: React.ReactNode }) {
  return (
    <div className="field" style={flex ? { flex } : undefined}>
      <label>{label}</label>
      {children}
    </div>
  );
}
