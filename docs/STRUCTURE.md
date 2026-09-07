# Structure du projet

Ce fichier sert de carte rapide du repo pour eviter de se perdre entre prototypes,
backend, frontend et artefacts generes.

## Chemin principal pour la demo

### `backend/`

API FastAPI. C'est la source de verite metier pour le TDR.

- `app/models/` : tables SQLAlchemy.
- `app/schemas/` : contrats d'entree/sortie Pydantic.
- `app/routers/` : endpoints REST.
- `app/services/` : logique metier reutilisable.
- `tests/` : tests automatises backend.
- `seed_dev.py` : donnees de demonstration.

### `frontend/`

PWA React/Vite orientee terrain. Elle doit consommer le backend et montrer :

- connexion agent ;
- creation client ;
- recherche client ;
- solde global ;
- operations ;
- alertes ;
- mode offline/synchronisation.

### `ml/`

Pipeline IA entrainable :

- `train_risk_model.py` : genere des donnees synthetiques, entraine le modele,
  sauvegarde l'artefact.
- `artifacts/risk_model.joblib` : modele charge par le backend.
- `artifacts/risk_model_metrics.json` : metriques et variables utilisees.

## Prototype conserve

### `src/`

Ancienne interface Next.js riche en tableaux de bord. Elle peut servir de reserve
visuelle, mais ce n'est pas le chemin le plus simple pour une demo technique TDR.
Ne pas y ajouter de nouvelle logique backend.

## Documentation

### `docs/`

- `MAINTENANCE.md` : comment relancer, tester et reparer.
- `PROMPTS.md` : decisions IA et prompts structurants.
- `STRUCTURE.md` : ce fichier.

### `CHANGELOG.md`

Historique court des changements importants.

### `worklog.md`

Journal plus long herite des iterations precedentes.

## Artefacts locaux ou generes

Ces elements ne sont pas necessaires dans une livraison propre :

- `.venv/`
- `.pytest_cache/`
- `__pycache__/`
- `sentinel.db`
- `backend/sentinel.db`
- fichiers `*.pyc`
- logs `*.log`

`graphify-out/` est un artefact d'analyse du code. Il peut etre garde localement,
mais il n'est pas requis pour presenter cifSentinel.

## Regle d'organisation

Pour toute nouvelle fonctionnalite :

1. mettre le modele dans `backend/app/models/` si une table est necessaire ;
2. mettre le contrat API dans `backend/app/schemas/` ;
3. mettre l'endpoint dans `backend/app/routers/` ;
4. mettre la logique reutilisable dans `backend/app/services/` ;
5. ajouter un test dans `backend/tests/` ;
6. documenter le changement dans `CHANGELOG.md`.
