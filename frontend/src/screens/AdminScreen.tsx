import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../lib/api";
import type { PPEEntryOut, SanctionEntryOut } from "../types/api";

export function AdminScreen() {
  return (
    <div className="stack">
      <h1>Listes reseau</h1>
      <p className="muted">
        Toute entree ajoutee ici est immediatement prise en compte par le filtrage — aucun
        delai de propagation (cf. TDR).
      </p>
      <SanctionsPanel />
      <PPEPanel />
    </div>
  );
}

function SanctionsPanel() {
  const [entries, setEntries] = useState<SanctionEntryOut[] | null>(null);
  const [source, setSource] = useState("ONU");
  const [fullName, setFullName] = useState("");
  const [aliases, setAliases] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setEntries(await apiFetch<SanctionEntryOut[]>("/admin/sanctions"));
    } catch {
      setError("Impossible de charger les listes de sanctions.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/admin/sanctions", {
        method: "POST",
        body: {
          source,
          full_name: fullName,
          aliases: aliases
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
        },
      });
      setFullName("");
      setAliases("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "L'ajout a echoue.");
    }
  };

  const onDelete = async (id: number) => {
    await apiFetch(`/admin/sanctions/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="card stack">
      <h2>Sanctions (ONU / OFAC / UE)</h2>
      <form className="row" onSubmit={onAdd}>
        <select value={source} onChange={(e) => setSource(e.target.value)} style={{ maxWidth: 100 }}>
          <option>ONU</option>
          <option>OFAC</option>
          <option>UE</option>
        </select>
        <input
          placeholder="Nom complet"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={{ flex: 1 }}
          required
        />
        <input
          placeholder="Alias (separes par des virgules)"
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn" type="submit">
          Ajouter
        </button>
      </form>
      {error && <div className="error-banner">{error}</div>}
      <div className="tblwrap">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Nom</th>
              <th>Alias</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries?.map((e) => (
              <tr key={e.id}>
                <td>{e.source}</td>
                <td>{e.full_name}</td>
                <td className="muted">{e.aliases.join(", ")}</td>
                <td>
                  <button className="btn secondary" onClick={() => onDelete(e.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {entries?.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Aucune entree.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PPEPanel() {
  const [entries, setEntries] = useState<PPEEntryOut[] | null>(null);
  const [fullName, setFullName] = useState("");
  const [fonction, setFonction] = useState("");
  const [pays, setPays] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setEntries(await apiFetch<PPEEntryOut[]>("/admin/ppe"));
    } catch {
      setError("Impossible de charger les listes PPE.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/admin/ppe", {
        method: "POST",
        body: { full_name: fullName, fonction, pays: pays.toUpperCase() },
      });
      setFullName("");
      setFonction("");
      setPays("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : "L'ajout a echoue.");
    }
  };

  const onDelete = async (id: number) => {
    await apiFetch(`/admin/ppe/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="card stack">
      <h2>Personnes Politiquement Exposees</h2>
      <form className="row" onSubmit={onAdd}>
        <input
          placeholder="Nom complet"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={{ flex: 1 }}
          required
        />
        <input
          placeholder="Fonction"
          value={fonction}
          onChange={(e) => setFonction(e.target.value)}
          style={{ flex: 1 }}
          required
        />
        <input
          placeholder="Pays (ISO)"
          maxLength={2}
          value={pays}
          onChange={(e) => setPays(e.target.value.toUpperCase())}
          style={{ maxWidth: 90 }}
          required
        />
        <button className="btn" type="submit">
          Ajouter
        </button>
      </form>
      {error && <div className="error-banner">{error}</div>}
      <div className="tblwrap">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Fonction</th>
              <th>Pays</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries?.map((e) => (
              <tr key={e.id}>
                <td>{e.full_name}</td>
                <td>{e.fonction}</td>
                <td>{e.pays}</td>
                <td>
                  <button className="btn secondary" onClick={() => onDelete(e.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {entries?.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Aucune entree.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
