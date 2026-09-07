# Historique des prompts et decisions IA

Ce fichier garde les prompts et decisions structurantes pour pouvoir reproduire
ou expliquer le projet sans dependance a une session IA.

## 2026-09-07 - Recentralisation sur le TDR

Prompt utilisateur resume :

```text
cifSentinel est calque sur le TDR et sera notre travail a presenter demain.
Il doit respecter tout ce que le TDR veut, car on doit remporter le hackathon.
SentinelleCoop etait devenu trop gros et s'eloignait du TDR.
Quel est le probleme qu'on resout ?
```

Decision :

- cifSentinel devient la piste principale.
- SentinelleCoop reste une reference, mais ne pilote plus le scope.
- Le scope prioritaire est la Thematique 01 : filtrage clients LBC/FT/FP.

## 2026-09-07 - Reprise apres interruption Claude

Constat :

- Claude s'est arrete apres la creation de `backend/app/services/kyc.py`.
- Les fondations etaient presentes mais pas branchees aux flux reels.

Actions reprises :

- branchement KYC dans `POST /clients` ;
- creation des mandats et controle des retraits par procuration ;
- alimentation du journal d'audit ;
- durcissement RBAC local/reseau ;
- ajout de tests.

## Prompt de maintenance a reutiliser

```text
Avant de modifier cifSentinel, lis CHANGELOG.md, docs/MAINTENANCE.md et les tests
concernes. Fais une modification courte, rattachee explicitement au TDR CIF
Thematique 01. Ajoute ou adapte un test. Mets a jour CHANGELOG.md et, si la
decision vient d'un prompt important, docs/PROMPTS.md.
```

## 2026-09-07 - Ne pas survendre l'offline

Prompt utilisateur resume :

```text
Le seul point a ne pas survendre est la connectivite limitee. On doit faire ca.
```

Decision :

- Ajouter une synchronisation offline backend minimale mais reelle.
- `/sync/push` traite une file d'operations PWA avec idempotence.
- `/sync/pull` renvoie les alertes et traces recentes apres reconnexion.
- Le discours pitch peut maintenant dire : "mode offline demonstrable pour les
  operations courantes, avec anti-doublon a la reconnexion".

## 2026-09-07 - Ajouter une vraie brique IA

Prompt utilisateur resume :

```text
Est-ce qu'on peut ajouter l'IA, un modele vraiment ?
```

Decision :

- Ajouter un modele ML explicable et entrainable plutot qu'une IA generative vague.
- Utiliser `scikit-learn` avec un `RandomForestClassifier`.
- Sauvegarder le modele avec `joblib`.
- Exposer le scoring via `POST /ml/risk-score`.
- Documenter clairement que les donnees sont synthetiques pour la demo.
