export function CacheBadge({ cachedAt }: { cachedAt?: string }) {
  const time = cachedAt
    ? new Date(cachedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;
  return (
    <span
      className="pill amber"
      title="Hors-ligne : donnees de la derniere consultation reussie, pas forcement a jour"
    >
      Hors-ligne — cache{time ? ` de ${time}` : ""}
    </span>
  );
}
