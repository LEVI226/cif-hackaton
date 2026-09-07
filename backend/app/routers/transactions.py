from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.account import Account, AccountStatus
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.schemas.transaction import TransactionCreate, TransactionOut
from app.services.anomaly import detect_anomalies
from app.services.audit import log_action
from app.services.fuzzy_match import ScreeningDecision
from app.services.idempotency import with_idempotency
from app.services.kyc import piece_expiree
from app.services.mandats import find_valid_mandat
from app.services.screening_service import open_pattern_alert, run_screening
from app.services.security import Role, TokenPayload, require_roles

router = APIRouter(prefix="/transactions", tags=["transactions"])

_CAN_CREATE = require_roles(Role.AGENT_GUICHET, Role.SUPERVISEUR_SFD)
_CAN_READ = require_roles(
    Role.AGENT_GUICHET, Role.AGENT_CONFORMITE, Role.SUPERVISEUR_SFD, Role.ADMIN_RESEAU
)


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_CREATE),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> dict:
    def _create() -> dict:
        account = db.query(Account).filter(Account.numero_compte == payload.numero_compte).first()
        if account is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Compte introuvable")
        if user.sfd_id is not None and account.sfd_id != int(user.sfd_id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Compte hors perimetre SFD")
        if account.statut == AccountStatus.BLOQUE:
            raise HTTPException(status.HTTP_409_CONFLICT, "Compte bloque - operation refusee")
        if piece_expiree(account.client):
            raise HTTPException(status.HTTP_409_CONFLICT, "Piece d'identite expiree - operation bloquee")

        if payload.type in (
            TransactionType.RETRAIT,
            TransactionType.VIREMENT,
        ) and payload.montant > float(account.solde):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Solde insuffisant")

        alert_reasons: list[str] = []
        mandat_id: int | None = None

        if payload.type == TransactionType.RETRAIT and payload.mandataire_piece:
            mandat = find_valid_mandat(db, account.client_fid, payload.mandataire_piece, payload.montant)
            if mandat is None:
                raise HTTPException(status.HTTP_409_CONFLICT, "Mandat invalide, expire ou plafond depasse")
            mandat_id = mandat.id
            alert_reasons.append("retrait par procuration controle par mandat valide")

        # Filtrage temps reel du tiers beneficiaire pour un virement (TDR : "filtrage
        # en temps reel des clients ET des transactions").
        blocked_by_screening = False
        if payload.type == TransactionType.VIREMENT:
            screening_result, _alert = run_screening(
                db, payload.beneficiaire_nom, client_fid=account.client_fid  # type: ignore[arg-type]
            )
            if screening_result.decision != ScreeningDecision.AUCUN:
                alert_reasons.append(
                    f"beneficiaire '{payload.beneficiaire_nom}' : correspondance "
                    f"{screening_result.decision.value.lower()} ({screening_result.matched_on}, "
                    f"score {screening_result.score:.2f})"
                )
            if screening_result.decision == ScreeningDecision.BLOQUANT:
                blocked_by_screening = True

        # Detection de motifs inhabituels - independante du filtrage nominatif
        # (cf. TDR : "identification des operations a caractere suspect ou inhabituel").
        anomalies = detect_anomalies(db, account, payload.montant, payload.type)
        if anomalies:
            open_pattern_alert(db, anomalies, client_fid=account.client_fid)
            alert_reasons.extend(anomalies)

        if blocked_by_screening:
            account.statut = AccountStatus.BLOQUE
            transaction_statut = TransactionStatus.BLOQUEE
        else:
            transaction_statut = TransactionStatus.VALIDEE
            if payload.type == TransactionType.DEPOT:
                account.solde = float(account.solde) + payload.montant
            else:  # RETRAIT ou VIREMENT sortant
                account.solde = float(account.solde) - payload.montant

        transaction = Transaction(
            account_id=account.id,
            montant=payload.montant,
            type=payload.type,
            statut=transaction_statut,
            beneficiaire_nom=payload.beneficiaire_nom,
            beneficiaire_compte=payload.beneficiaire_compte,
            mandataire_nom=payload.mandataire_nom,
            mandataire_piece=payload.mandataire_piece,
            mandat_id=mandat_id,
        )
        db.add(transaction)
        db.add(account)
        db.flush()
        log_action(
            db,
            user,
            "CREATE_TRANSACTION",
            "Transaction",
            str(transaction.id),
            {
                "numero_compte": account.numero_compte,
                "type": payload.type.value,
                "statut": transaction_statut.value,
                "mandat_id": mandat_id,
                "alertes": alert_reasons,
            },
            sfd_id=account.sfd_id,
        )
        db.commit()
        db.refresh(transaction)

        return TransactionOut(
            id=transaction.id,
            numero_compte=account.numero_compte,
            montant=float(transaction.montant),
            devise=transaction.devise,
            type=transaction.type,
            statut=transaction.statut,
            date=transaction.date,
            beneficiaire_nom=transaction.beneficiaire_nom,
            mandataire_nom=transaction.mandataire_nom,
            mandat_id=transaction.mandat_id,
            alert_reasons=alert_reasons,
        ).model_dump(mode="json")

    # La cle d'idempotence est verifiee AVANT toute validation (solde, statut du
    # compte) : un rejeu ne doit jamais re-evaluer un etat deja modifie par la
    # premiere execution reussie, juste renvoyer la meme reponse.
    return with_idempotency(db, idempotency_key, "POST /transactions", _create)


@router.get("/compte/{numero_compte}", response_model=list[TransactionOut])
def list_account_transactions(
    numero_compte: str,
    db: Session = Depends(get_db),
    user: TokenPayload = Depends(_CAN_READ),
) -> list[TransactionOut]:
    """Suivi des mouvements sur un compte (TDR : "suivi des mouvements sur les comptes")."""
    account = db.query(Account).filter(Account.numero_compte == numero_compte).first()
    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Compte introuvable")
    if user.sfd_id is not None and account.sfd_id != int(user.sfd_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Compte hors perimetre SFD")

    transactions = (
        db.query(Transaction)
        .filter(Transaction.account_id == account.id)
        .order_by(Transaction.date.desc())
        .all()
    )
    return [
        TransactionOut(
            id=t.id,
            numero_compte=numero_compte,
            montant=float(t.montant),
            devise=t.devise,
            type=t.type,
            statut=t.statut,
            date=t.date,
            beneficiaire_nom=t.beneficiaire_nom,
            mandataire_nom=t.mandataire_nom,
            mandat_id=t.mandat_id,
        )
        for t in transactions
    ]
