from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class ClientFieldsOptional(BaseModel):
    """Champs KYC partages entre creation et lecture - calques sur la fiche
    client papier (identification, etat civil, piece, coordonnees, activite,
    filtrage AML, personne morale). Tout est optionnel sauf nom/prenom, poses
    au premier niveau : une caisse peut ouvrir un dossier minimal puis le
    completer, la fiche n'est jamais toute-ou-rien."""

    date_naissance: date | None = None
    nationalite: str | None = None
    type_client: str = "PHYSIQUE"  # PHYSIQUE | MORALE
    statut_relation: str = "CLIENT"  # MEMBRE | CLIENT | OCCASIONNEL

    # Etat civil
    sexe: str | None = None  # M | F
    lieu_naissance: str | None = None
    situation_matrimoniale: str | None = None
    nb_personnes_charge: int | None = None
    nom_pere: str | None = None
    nom_mere: str | None = None

    # Piece d'identite
    type_piece: str | None = None
    numero_piece: str | None = None
    date_delivrance_piece: date | None = None
    date_expiration_piece: date | None = None
    lieu_delivrance_piece: str | None = None
    copie_piece_verifiee: bool = False

    # Coordonnees
    telephone: str | None = None
    email: str | None = None
    adresse: str | None = None
    region: str | None = None
    province: str | None = None
    commune: str | None = None
    secteur_quartier: str | None = None

    # Activite et revenus
    profession: str | None = None
    secteur_activite: str | None = None
    employeur_activite: str | None = None
    revenu_mensuel_estime: float | None = None
    autres_revenus: str | None = None
    patrimoine_estime: float | None = None

    # Relation d'affaires attendue
    source_fonds: str | None = None
    destination_fonds: str | None = None
    frequence_attendue: str | None = None  # FAIBLE | MOYENNE | ELEVEE

    # Filtrage AML/CFT/PPE
    est_ppe: bool = False
    proche_ppe: bool = False
    zone_haut_risque: str | None = None
    niveau_risque_initial: str = "FAIBLE"  # FAIBLE | MOYEN | ELEVE

    # Personne morale
    forme_juridique: str | None = None
    rccm: str | None = None
    ifu: str | None = None
    siege_social: str | None = None
    representant_legal_nom: str | None = None
    representant_legal_prenom: str | None = None
    beneficiaire_effectif_nom: str | None = None
    beneficiaire_effectif_part: float | None = None
    beneficiaire_effectif_ppe: bool = False

    external_ids: dict[str, str] = {}


class ClientCreate(ClientFieldsOptional):
    nom: str
    prenom: str


class ClientOut(ClientFieldsOptional):
    fid: str
    nom: str
    prenom: str
    created_at: datetime
    # Vrai si nom/prenom ci-dessus sont deja masques (role reseau, pas d'alerte
    # critique sur ce client) - cf. app.services.visibility.
    nom_masque: bool = False

    model_config = {"from_attributes": True}


class AccountBalance(BaseModel):
    numero_compte: str
    sfd_code: str
    statut: str
    solde: float | None  # None si masque (compte hors SFD de l'utilisateur, sans alerte)
    visible: bool = True


class SoldeGlobalOut(BaseModel):
    fid: str
    devise: str = "FCFA"
    vue: str = "RESEAU"  # "LOCALE" (solde_total = SFD de l'utilisateur uniquement) | "RESEAU" (consolide)
    solde_total: float
    comptes: list[AccountBalance]
    comptes_masques: int = 0


class MouvementOut(BaseModel):
    numero_compte: str
    sfd_code: str
    montant: float
    type: str
    date: datetime


class ActiviteClientOut(BaseModel):
    """Recensement des operations d'un client a travers tous ses comptes (TDR :
    "recensement des operations effectuees par un meme client occasionnel ou
    habituel"). La classification porte sur l'ensemble du reseau, pas une seule SFD -
    c'est le FID qui rend ce recensement possible ; la LISTE des mouvements, elle,
    reste soumise a la visibilite differenciee (cf. app.services.visibility)."""

    fid: str
    vue: str = "RESEAU"  # "LOCALE" | "RESEAU"
    classification: str  # "HABITUEL" | "OCCASIONNEL"
    nb_operations_recentes: int
    fenetre_jours: int
    mouvements: list[MouvementOut]
    mouvements_masques: int = 0
