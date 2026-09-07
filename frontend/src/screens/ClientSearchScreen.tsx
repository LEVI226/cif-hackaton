import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, ApiError } from "../lib/api";
import { submitOrQueue } from "../lib/queue";
import { useAuth } from "../lib/auth";
import type { ClientOut } from "../types/api";

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
          placeholder="Nom ou prenom..."
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
                  <td>{c.nom}</td>
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

function CreateClientForm({ onCreated }: { onCreated: () => void }) {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nationalite, setNationalite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "teal" | "amber" | "red" } | null>(
    null,
  );

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const outcome = await submitOrQueue<{ fid: string }>("CREATE_CLIENT", "/clients", {
        nom,
        prenom,
        nationalite: nationalite || null,
      });
      if (outcome.queued) {
        setMessage({
          text: "Hors-ligne : client mis en file, sera cree a la reconnexion.",
          tone: "amber",
        });
      } else {
        setMessage({ text: `Client cree — FID ${outcome.result.fid}`, tone: "teal" });
        onCreated();
      }
      setNom("");
      setPrenom("");
      setNationalite("");
    } catch (err) {
      setMessage({
        text: err instanceof ApiError ? String(err.detail) : "La creation a echoue.",
        tone: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card stack" onSubmit={onSubmit}>
      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="nom">Nom</label>
          <input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="prenom">Prenom</label>
          <input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="nationalite">Nationalite (ISO, optionnel)</label>
        <input
          id="nationalite"
          maxLength={2}
          value={nationalite}
          onChange={(e) => setNationalite(e.target.value.toUpperCase())}
          placeholder="BF"
        />
      </div>
      {message && <span className={`pill ${message.tone}`}>{message.text}</span>}
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? "Creation..." : "Creer le client"}
      </button>
    </form>
  );
}
