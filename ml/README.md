# Modele IA de risque transactionnel

Ce dossier contient une brique ML simple et explicable pour soutenir le discours
"IA" de SentinelleCoop sans transformer le MVP conformite en boite noire.

## Objectif

Predire le niveau de risque d'une operation (`NORMAL`, `SUSPECTE`, `BLOQUANTE`) a
partir de variables simples :

- montant ;
- type d'operation ;
- solde du compte ;
- nombre d'operations recentes ;
- montant moyen recent ;
- presence d'un mandat ;
- client PPE ;
- score de risque client ;
- piece expiree.

## Bibliotheques

- `pandas` : preparation du tableau d'entrainement.
- `numpy` : generation de donnees synthetiques reproductibles.
- `scikit-learn` : pipeline de preprocessing + modele.
- `joblib` : sauvegarde et chargement du modele.

## Entrainer

Depuis la racine :

```powershell
.\.venv\Scripts\python.exe ml\train_risk_model.py
```

Le script ecrit :

- `ml/artifacts/risk_model.joblib`
- `ml/artifacts/risk_model_metrics.json`

## Deploiement backend

Le backend charge `ml/artifacts/risk_model.joblib` via `backend/app/services/ml_risk.py`.
Endpoint :

```text
POST /ml/risk-score
```

Le modele sert d'aide a la decision : les regles bloquantes restent prioritaires
pour la conformite.
