from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class ClientCreate(BaseModel):
    nom: str
    prenom: str
    date_naissance: date | None = None
    nationalite: str | None = None
    type_client: str = "PHYSIQUE"
    type_piece: str | None = None
    numero_piece: str | None = None
    date_expiration_piece: date | None = None
    beneficiaire_effectif_nom: str | None = None
    beneficiaire_effectif_ppe: bool = False
    external_ids: dict[str, str] = {}


class ClientOut(BaseModel):
    fid: str
    nom: str
    prenom: str
    date_naissance: date | None
    nationalite: str | None
    type_client: str
    type_piece: str | None
    numero_piece: str | None
    date_expiration_piece: date | None
    beneficiaire_effectif_nom: str | None
    beneficiaire_effectif_ppe: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AccountBalance(BaseModel):
    numero_compte: str
    sfd_code: str
    statut: str
    solde: float


class SoldeGlobalOut(BaseModel):
    fid: str
    devise: str = "FCFA"
    solde_total: float
    comptes: list[AccountBalance]


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
    c'est le FID qui rend ce recensement possible."""

    fid: str
    classification: str  # "HABITUEL" | "OCCASIONNEL"
    nb_operations_recentes: int
    fenetre_jours: int
    mouvements: list[MouvementOut]
