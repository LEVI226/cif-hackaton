import { useConnectionStatus, usePendingOpsCount, useFailedOpsCount } from "../hooks/useOnlineStatus";

export function SyncIndicator() {
  const status = useConnectionStatus();
  const pending = usePendingOpsCount();
  const failed = useFailedOpsCount();

  if (failed > 0) {
    return (
      <span className="pill red" title={`${failed} operation(s) rejetee(s) - a revoir`}>
        {failed} en echec
      </span>
    );
  }
  if (status === "OFFLINE") {
    return (
      <span className="pill amber" title="Hors-ligne - les ecritures sont mises en file">
        Hors-ligne{pending > 0 ? ` - ${pending} en attente` : ""}
      </span>
    );
  }
  if (status === "DEGRADED") {
    return (
      <span className="pill amber" title="Reseau present mais serveur injoignable - les ecritures sont mises en file">
        Serveur injoignable{pending > 0 ? ` - ${pending} en attente` : ""}
      </span>
    );
  }
  if (pending > 0) {
    return (
      <span className="pill amber" title="Synchronisation en cours">
        Synchronisation... {pending}
      </span>
    );
  }
  return <span className="pill teal">Synchronise</span>;
}
