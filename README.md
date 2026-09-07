# SentinelleCoop

SentinelleCoop est une solution de demonstration pour la Thematique 01 du Hackathon
CIF DigiCoop-WA+ 2026 : filtrage des clients LBC/FT/FP pour les cooperatives
financieres et institutions de microfinance.

## Probleme resolu

Les caisses doivent identifier rapidement les clients et operations a risque
sanctions, PPE, blanchiment, financement du terrorisme ou proliferation, avec des
moyens informatiques limites et parfois une connectivite instable.

SentinelleCoop transforme ce controle en flux operationnel simple :

- profiler le client et ses comptes ;
- filtrer clients et transactions en temps reel ;
- generer des alertes bloquantes ou informatives ;
- consolider le solde global multi-comptes ;
- detecter les operations inhabituelles ;
- scorer le risque transactionnel avec un modele ML entraine ;
- gerer les procurations ;
- tracer les decisions conformite ;
- synchroniser une file d'operations apres reconnexion.

## Organisation du repo

| Dossier | Role |
|---|---|
| `backend/` | API FastAPI, logique conformite, tests backend |
| `frontend/` | PWA React/Vite qui consomme l'API backend |
| `ml/` | Entrainement et artefacts du modele IA transactionnel |
| `src/` | Ancienne interface Next.js/dashboard conservee comme prototype visuel |
| `docs/` | Maintenance, structure, prompts et decisions |
| `tests/` | Tests shell des scripts runtime historiques |
| `.zscripts/` | Scripts runtime historiques |
| `graphify-out/` | Graphe d'analyse genere, non necessaire a la demo |

Pour le hackathon, le chemin principal est : `backend/` + `frontend/`.

## Lancer le backend

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Swagger : `http://127.0.0.1:8000/docs`

## Tester

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests
```

Etat valide le 2026-09-07 : 56 tests backend passent.

## Documentation utile

- `backend/README.md`
- `frontend/README.md`
- `ml/README.md`
- `docs/MAINTENANCE.md`
- `docs/STRUCTURE.md`
- `CHANGELOG.md`
- `docs/PROMPTS.md`
