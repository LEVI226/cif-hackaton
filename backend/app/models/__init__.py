"""Importer ce module garantit que tous les modeles sont enregistres sur Base.metadata
avant un `create_all` - necessaire car les relations se referencent par nom de classe."""
from app.models.account import Account, AccountStatus
from app.models.alert import Alert, AlertStatus
from app.models.audit import AuditLog
from app.models.client import Client
from app.models.idempotency import IdempotencyRecord
from app.models.mandat import Mandat, MandatStatut
from app.models.sanctions import PPEEntry, SanctionEntry
from app.models.screening import ScreeningResult
from app.models.sfd import SFD, Country
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.user import StaffUser

__all__ = [
    "Account",
    "AccountStatus",
    "Alert",
    "AlertStatus",
    "AuditLog",
    "Client",
    "IdempotencyRecord",
    "Mandat",
    "MandatStatut",
    "PPEEntry",
    "SanctionEntry",
    "ScreeningResult",
    "SFD",
    "Country",
    "Transaction",
    "TransactionStatus",
    "TransactionType",
    "StaffUser",
]
