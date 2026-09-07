import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/clients");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Identifiants incorrects.");
      } else if (err instanceof ApiError && err.status === 0) {
        setError("Impossible de joindre le serveur - verifiez la connexion.");
      } else {
        setError("Une erreur inattendue est survenue.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "80px auto" }} className="stack">
      <div>
        <h1>Sentinel</h1>
        <p className="muted">Filtrage LBC/FT/PPE — reseau CIF</p>
      </div>
      <form className="card stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="username">Identifiant</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="error-banner">{error}</div>}
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
