# Guide de maintenance cifSentinel

Ce guide explique comment relancer, tester et reparer le projet sans aide IA.

## Probleme resolu

cifSentinel repond a la Thematique 01 du TDR CIF : aider les institutions de
microfinance a filtrer les clients et transactions LBC/FT/FP, detecter les
operations suspectes, produire des alertes bloquantes ou informatives, et suivre
un client sur plusieurs comptes/caisses avec peu de moyens informatiques.

## Relancer le backend

Depuis la racine du projet :

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

API interactive : `http://127.0.0.1:8000/docs`

## Lancer les tests

Depuis la racine :

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests
```

Etat valide le 2026-09-07 : 56 tests passent.

## Reentrainer le modele IA

```powershell
.\.venv\Scripts\python.exe ml\train_risk_model.py
```

Artefacts produits :

- `ml/artifacts/risk_model.joblib`
- `ml/artifacts/risk_model_metrics.json`

## Scenario de demo recommande

1. Connexion agent guichet.
2. Creation client normal : un FID est attribue.
3. Creation d'un compte via `POST /accounts`.
4. Creation client avec CNIB expiree : l'ouverture est bloquee.
5. Ajout d'un nom sanctionne via admin reseau.
6. Creation ou virement vers un beneficiaire sanctionne : alerte bloquante.
7. Consultation solde global du client.
8. Consultation mouvements : classification occasionnel/habituel.
9. Connexion conformite SFD, creation d'un mandat.
10. Retrait par procuration :
   - sans mandat : bloque ;
   - avec mandat valide et plafond respecte : accepte et trace.
11. Coupure reseau simulee : envoyer les operations en lot via `/sync/push`.
12. Rejouer le meme lot : les operations passent en `REPLAYED`, sans doublon.
13. Consultation `/sync/pull` et `/audit` pour montrer le rattrapage et la tracabilite.

## Ou reparer quoi

- Authentification et roles : `backend/app/services/security.py`
- Creation/recherche client : `backend/app/routers/clients.py`
- Comptes : `backend/app/routers/accounts.py`
- Transactions : `backend/app/routers/transactions.py`
- Mandats/procurations : `backend/app/routers/mandats.py`, `backend/app/models/mandat.py`
- KYC/CNIB : `backend/app/services/kyc.py`
- Audit : `backend/app/services/audit.py`, `backend/app/models/audit.py`
- Synchronisation offline : `backend/app/routers/sync.py`, `backend/app/schemas/sync.py`
- Filtrage sanctions/PPE : `backend/app/services/screening_service.py`
- Matching flou : `backend/app/services/fuzzy_match.py`
- Alertes comportementales : `backend/app/services/anomaly.py`
- Modele IA : `ml/train_risk_model.py`, `backend/app/services/ml_risk.py`
- Tests : `backend/tests/`

## Regle d'or

Chaque nouvelle fonctionnalite doit avoir :

- une phrase qui la rattache au TDR ;
- un test backend ou une verification manuelle documentee ;
- une ligne dans `CHANGELOG.md` ;
- si elle vient d'un prompt IA important, une entree dans `docs/PROMPTS.md`.
