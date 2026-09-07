// Miroir manuel des schemas Pydantic du backend (app/schemas/*.py) - pas de
// generation automatique pour l'instant, a garder synchronise a la main tant que
// le contrat bouge vite pendant le hackathon.

export type Role =
  | "AGENT_GUICHET"
  | "AGENT_CONFORMITE"
  | "SUPERVISEUR_SFD"
  | "ADMIN_RESEAU";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  sfd_id: number | null;
}

export interface ClientOut {
  fid: string;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  nationalite: string | null;
  created_at: string;
}

export interface AccountBalance {
  numero_compte: string;
  sfd_code: string;
  statut: string;
  solde: number;
}

export interface SoldeGlobalOut {
  fid: string;
  devise: string;
  solde_total: number;
  comptes: AccountBalance[];
}

export interface MouvementOut {
  numero_compte: string;
  sfd_code: string;
  montant: number;
  type: string;
  date: string;
}

export interface ActiviteClientOut {
  fid: string;
  classification: "HABITUEL" | "OCCASIONNEL";
  nb_operations_recentes: number;
  fenetre_jours: number;
  mouvements: MouvementOut[];
}

export type ScreeningDecision = "AUCUN" | "INFORMATIF" | "BLOQUANT";

export interface ScreeningResultOut {
  decision: ScreeningDecision;
  score: number;
  matched_on: string | null;
  matched_entry_type: string | null;
  created_at: string;
}

export type AlertStatus = "OUVERTE" | "EN_COURS" | "LEVEE" | "CONFIRMEE";

export interface AlertOut {
  id: number;
  statut: AlertStatus;
  score: number;
  matched_on: string | null;
  client_fid: string | null;
  created_at: string;
}

export type TransactionType = "DEPOT" | "RETRAIT" | "VIREMENT";
export type TransactionStatus = "EN_ATTENTE" | "VALIDEE" | "BLOQUEE";

export interface TransactionOut {
  id: number;
  numero_compte: string;
  montant: number;
  devise: string;
  type: TransactionType;
  statut: TransactionStatus;
  date: string;
  beneficiaire_nom: string | null;
  alert_reasons: string[];
}

export interface SanctionEntryOut {
  id: number;
  source: string;
  full_name: string;
  aliases: string[];
  date_maj: string;
}

export interface PPEEntryOut {
  id: number;
  full_name: string;
  fonction: string;
  pays: string;
  date_maj: string;
}
