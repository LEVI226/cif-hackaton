// Miroir manuel des schemas Pydantic du backend (app/schemas/*.py) - pas de
// generation automatique pour l'instant, a garder synchronise a la main tant que
// le contrat bouge vite pendant le hackathon.

export type Role =
  | "AGENT_GUICHET"
  | "AGENT_CONFORMITE"
  | "SUPERVISEUR_SFD"
  | "CONFORMITE_RESEAU"
  | "AUDITEUR"
  | "ADMIN_RESEAU";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  sfd_id: number | null;
}

// Champs KYC partages entre creation et lecture - calques sur la fiche client
// papier (cf. backend/app/schemas/client.py::ClientFieldsOptional).
export interface ClientFields {
  date_naissance?: string | null;
  nationalite?: string | null;
  type_client: "PHYSIQUE" | "MORALE";
  statut_relation: "MEMBRE" | "CLIENT" | "OCCASIONNEL";

  sexe?: string | null;
  lieu_naissance?: string | null;
  situation_matrimoniale?: string | null;
  nb_personnes_charge?: number | null;
  nom_pere?: string | null;
  nom_mere?: string | null;

  type_piece?: string | null;
  numero_piece?: string | null;
  date_delivrance_piece?: string | null;
  date_expiration_piece?: string | null;
  lieu_delivrance_piece?: string | null;
  copie_piece_verifiee: boolean;

  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  region?: string | null;
  province?: string | null;
  commune?: string | null;
  secteur_quartier?: string | null;

  profession?: string | null;
  secteur_activite?: string | null;
  employeur_activite?: string | null;
  revenu_mensuel_estime?: number | null;
  autres_revenus?: string | null;
  patrimoine_estime?: number | null;

  source_fonds?: string | null;
  destination_fonds?: string | null;
  frequence_attendue?: string | null;

  est_ppe: boolean;
  proche_ppe: boolean;
  zone_haut_risque?: string | null;
  niveau_risque_initial: "FAIBLE" | "MOYEN" | "ELEVE";

  forme_juridique?: string | null;
  rccm?: string | null;
  ifu?: string | null;
  siege_social?: string | null;
  representant_legal_nom?: string | null;
  representant_legal_prenom?: string | null;
  beneficiaire_effectif_nom?: string | null;
  beneficiaire_effectif_part?: number | null;
  beneficiaire_effectif_ppe: boolean;

  external_ids: Record<string, string>;
}

export interface ClientCreate extends Partial<ClientFields> {
  nom: string;
  prenom: string;
}

export interface ClientOut extends ClientFields {
  fid: string;
  nom: string;
  prenom: string;
  created_at: string;
  nom_masque: boolean;
}

export type Vue = "LOCALE" | "RESEAU";

export interface AccountBalance {
  numero_compte: string;
  sfd_code: string;
  statut: string;
  solde: number | null;
  visible: boolean;
}

export interface SoldeGlobalOut {
  fid: string;
  devise: string;
  vue: Vue;
  solde_total: number;
  comptes: AccountBalance[];
  comptes_masques: number;
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
  vue: Vue;
  classification: "HABITUEL" | "OCCASIONNEL";
  nb_operations_recentes: number;
  fenetre_jours: number;
  mouvements: MouvementOut[];
  mouvements_masques: number;
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
  decision: ScreeningDecision;
  score: number;
  matched_on: string | null;
  client_fid: string | null;
  created_at: string;
}

export type TransactionType = "DEPOT" | "RETRAIT" | "VIREMENT";
export type TransactionStatus = "EN_ATTENTE" | "VALIDEE" | "BLOQUEE";

export interface TransactionCreate {
  numero_compte: string;
  montant: number;
  type: TransactionType;
  beneficiaire_nom?: string | null;
  beneficiaire_compte?: string | null;
  mandataire_nom?: string | null;
  mandataire_piece?: string | null;
}

export interface TransactionOut {
  id: number;
  numero_compte: string;
  montant: number;
  devise: string;
  type: TransactionType;
  statut: TransactionStatus;
  date: string;
  beneficiaire_nom: string | null;
  mandataire_nom: string | null;
  mandat_id: number | null;
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

export interface MandatCreate {
  client_fid: string;
  mandataire_nom: string;
  mandataire_piece: string;
  date_debut: string;
  date_fin: string;
  plafond: number;
}

export interface MandatOut {
  id: number;
  client_fid: string;
  mandataire_nom: string;
  mandataire_piece: string;
  date_debut: string;
  date_fin: string;
  plafond: number;
  statut: "VALIDE" | "EXPIRE" | "REVOQUE";
  created_at: string;
}

export interface AccountCreate {
  client_fid: string;
  numero_compte: string;
  type_compte?: string;
  solde?: number;
}

export interface AccountOut {
  id: number;
  numero_compte: string;
  client_fid: string;
  sfd_id: number;
  type_compte: string;
  statut: string;
  date_ouverture: string;
  solde: number;
}

export interface SeriePoint {
  date: string;
  total: number;
}

export interface DashboardStats {
  vue: "RESEAU" | "LOCALE";
  sfd_nom?: string | null;

  total_clients: number;
  total_comptes: number;
  solde_total: number;

  total_screenings: number;
  alertes_ouvertes: number;
  alertes_bloquantes_ouvertes: number;
  alertes_informatives_ouvertes: number;
  dernier_screening_at?: string | null;

  clients_ppe: number;
  clients_risque_eleve: number;

  total_transactions: number;
  transactions_bloquees: number;
  volume_transactions: number;

  sanctions_listees: number;
  ppe_listees: number;

  serie_clients: SeriePoint[];
  serie_screenings: SeriePoint[];
  serie_alertes: SeriePoint[];

  score_conformite: number;
  taux_traitement_alertes: number;
  taux_kyc_valide: number;
  taux_couverture_screening: number;
}
