# Sentinel backend

API de filtrage LBC/FT/PPE pour les SFD membres du reseau CIF, Hackathon CIF
DigiCoop-WA+ 2026, Thematique 01.

## Prerequis

- Python 3.11+

## Installation locale reproductible

Depuis la racine du projet :

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

## Lancer l'API

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

- Documentation interactive : `http://127.0.0.1:8000/docs`
- Contrat OpenAPI brut : `http://127.0.0.1:8000/openapi.json`

La base SQLite est creee automatiquement au premier lancement.

## Variables d'environnement

| Variable | Defaut | Usage |
|---|---|---|
| `SENTINEL_DATABASE_URL` | `sqlite:///./sentinel.db` | URL SQLAlchemy |
| `SENTINEL_JWT_SECRET` | valeur de demo | A definir hors demo locale |

## Lancer les tests

Depuis la racine :

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests
```

Etat valide le 2026-09-07 : 55 tests passent.

## Couverture du TDR - Thematique 01

| Exigence du TDR | Ou c'est couvert |
|---|---|
| Profilage clients et comptes | `Client`, `Account` |
| Filtrage temps reel clients | `POST /clients` |
| Filtrage temps reel transactions | `POST /transactions` pour le beneficiaire d'un virement |
| Suivi mouvements comptes | `GET /transactions/compte/{numero}` |
| Alertes bloquantes/informatives | `screening_service.py`, `alert.py` |
| Solde global multi-comptes | `GET /clients/{fid}/solde-global` |
| Client occasionnel/habituel | `GET /clients/{fid}/mouvements` |
| Operations suspectes | `anomaly.py` |
| Mise a jour sanctions sans delai | `POST /admin/sanctions`, `POST /admin/ppe` |
| Piece expiree/CNIB | `kyc.py`, applique a `POST /clients` et `POST /transactions` |
| Retrait par procuration | `POST /mandats`, puis `POST /transactions` avec `mandataire_piece` |
| Tracabilite | `AuditLog` alimente via `audit.py`, consultable par `GET /audit` |
| Contraintes connectivite limitee | `/sync/push` et `/sync/pull`, avec operations idempotentes par appareil |

## Endpoints principaux

- `/auth/login`
- `/clients`
- `/clients/search`
- `/clients/{fid}/solde-global`
- `/clients/{fid}/mouvements`
- `/accounts`
- `/transactions`
- `/transactions/compte/{numero}`
- `/mandats`
- `/screening`
- `/alerts`
- `/audit`
- `/sync/push`
- `/sync/pull`
- `/admin/sanctions`
- `/admin/ppe`

## Ce qui reste

- Migrations Alembic avant un deploiement partage.
- Masquage fin des champs sensibles selon role, caisse et statut d'alerte.

## Maintenance

Lire aussi :

- `CHANGELOG.md`
- `docs/MAINTENANCE.md`
- `docs/PROMPTS.md`
