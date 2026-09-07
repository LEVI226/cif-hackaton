from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account
from app.models.client import Client
from app.models.sfd import SFD
from app.models.transaction import Transaction
from app.schemas.client import (
    AccountBalance,
    ActiviteClientOut,
    ClientCreate,
    ClientOut,
    MouvementOut,
    SoldeGlobalOut,
)
from app.services.anomaly import FENETRE_CLASSIFICATION_JOURS, classify_client_activity
from app.services.audit import log_action
from app.services.fid_allocator import allocate_fid
from app.services.fuzzy_match import normalize_name
from app.services.idempotency import with_idempotency
from app.services.kyc import beneficiaire_effectif_manquant, piece_expiree
from app.services.screening_service import run_screening
from app.services.security import LOCAL_ROLES, Role, TokenPayload, require_roles

router = APIRouter(prefix="/clients", tags=["clients"])

_CAN_CREATE = require_roles(Role.AGENT_GUICHET, Role.SUPERVISEUR_SFD)
_CAN_READ = require_roles(
    Role.AGENT_GUICHET,
    Role.AGENT_CONFORMITE,
    Role.SUPERVISEUR_SFD,
    Role.CONFORMITE_RESEAU,
    Role.AUDITEUR,
    Role.ADMIN_RESEAU,
)


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_CREATE),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> dict:
    if user.sfd_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Utilisateur non rattache a une SFD")
    sfd = db.get(SFD, int(user.sfd_id))
    if sfd is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "SFD introuvable pour cet utilisateur")

    def _create() -> dict:
        fid = allocate_fid(db, sfd)
        client = Client(
            fid=fid,
            nom=payload.nom,
            prenom=payload.prenom,
            date_naissance=payload.date_naissance,
            nationalite=payload.nationalite,
            type_client=payload.type_client,
            type_piece=payload.type_piece,
            numero_piece=payload.numero_piece,
            date_expiration_piece=payload.date_expiration_piece,
            beneficiaire_effectif_nom=payload.beneficiaire_effectif_nom,
            beneficiaire_effectif_ppe=payload.beneficiaire_effectif_ppe,
            external_ids=payload.external_ids,
            created_by_sfd_id=sfd.id,
        )
        if piece_expiree(client):
            raise HTTPException(status.HTTP_409_CONFLICT, "Piece d'identite expiree - ouverture bloquee")
        if beneficiaire_effectif_manquant(client):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Beneficiaire effectif manquant - ouverture personne morale bloquee",
            )
        db.add(client)

        # Filtrage automatique du nom a la creation (F1/F2 du Plan) - le resultat et
        # une eventuelle alerte sont persistes, mais ne bloquent jamais la creation :
        # une alerte BLOQUANTE verrouillera les comptes, pas l'enregistrement du client.
        run_screening(db, f"{payload.prenom} {payload.nom}", client_fid=fid)
        log_action(db, user, "CREATE_CLIENT", "Client", fid, {"nom": payload.nom}, sfd_id=sfd.id)

        db.commit()
        db.refresh(client)
        return ClientOut.model_validate(client).model_dump(mode="json")

    # Rejeu sur reconnexion (cf. Idempotency-Key) : ne re-attribue jamais un
    # deuxieme FID pour la meme creation posee hors-ligne.
    return with_idempotency(db, idempotency_key, "POST /clients", _create)


@router.get("/search", response_model=list[ClientOut])
def search_clients(
    q: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_READ),
) -> list[Client]:
    normalized_query = normalize_name(q)
    results = []
    for client in db.query(Client).all():
        if user.role in LOCAL_ROLES and user.sfd_id and client.created_by_sfd_id != int(user.sfd_id):
            continue
        if normalized_query in normalize_name(f"{client.prenom} {client.nom}"):
            results.append(client)
    return results


@router.get("/{fid}/solde-global", response_model=SoldeGlobalOut)
def get_solde_global(
    fid: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_READ),
) -> SoldeGlobalOut:
    client = db.get(Client, fid)
    if client is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client introuvable")
    if user.role in LOCAL_ROLES and user.sfd_id and client.created_by_sfd_id != int(user.sfd_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Client hors perimetre SFD")

    accounts = db.query(Account).filter(Account.client_fid == fid).all()
    comptes = [
        AccountBalance(
            numero_compte=a.numero_compte,
            sfd_code=a.sfd.code,
            statut=a.statut,
            solde=float(a.solde),
        )
        for a in accounts
    ]
    return SoldeGlobalOut(
        fid=fid,
        solde_total=sum(c.solde for c in comptes),
        comptes=comptes,
    )


@router.get("/{fid}/mouvements", response_model=ActiviteClientOut)
def get_activite_client(
    fid: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_READ),
) -> ActiviteClientOut:
    """Suivi des mouvements + classification occasionnel/habituel, a travers
    toutes les SFD ou le client detient un compte (cf. TDR, Thematique 01)."""
    client = db.get(Client, fid)
    if client is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client introuvable")
    if user.role in LOCAL_ROLES and user.sfd_id and client.created_by_sfd_id != int(user.sfd_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Client hors perimetre SFD")

    accounts = db.query(Account).filter(Account.client_fid == fid).all()
    account_by_id = {a.id: a for a in accounts}

    transactions = (
        db.query(Transaction)
        .filter(Transaction.account_id.in_(account_by_id.keys()))
        .order_by(Transaction.date.desc())
        .all()
        if account_by_id
        else []
    )

    window_start = datetime.now(timezone.utc) - timedelta(days=FENETRE_CLASSIFICATION_JOURS)
    # SQLite ne conserve pas l'offset de fuseau : une valeur relue peut revenir
    # naive meme si elle a ete ecrite avec tzinfo=utc. On la re-attache avant de
    # comparer plutot que de laisser Python lever TypeError.
    recent_count = sum(
        1
        for t in transactions
        if (t.date if t.date.tzinfo else t.date.replace(tzinfo=timezone.utc)) >= window_start
    )

    mouvements = [
        MouvementOut(
            numero_compte=account_by_id[t.account_id].numero_compte,
            sfd_code=account_by_id[t.account_id].sfd.code,
            montant=float(t.montant),
            type=t.type,
            date=t.date,
        )
        for t in transactions[:50]
    ]

    return ActiviteClientOut(
        fid=fid,
        classification=classify_client_activity(recent_count),
        nb_operations_recentes=recent_count,
        fenetre_jours=FENETRE_CLASSIFICATION_JOURS,
        mouvements=mouvements,
    )
