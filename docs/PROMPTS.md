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

## 2026-09-07 (soir) - Confrontation au corpus CIF complet

Contexte : une session distincte avait deja pousse le projet loin (mandats, KYC,
audit, sync, IA - voir entrees ci-dessus). Cette session a decouvert, en
explorant `C:\Users\ulric\Documents\cifHackathon\corpusCIF\`, un dossier de
solution deja cadre par l'equipe (`06_solution_grc_technique/`) qui documente en
detail ce que le jury CIF attend - notamment la visibilite differenciee,
citee deux fois comme point explicitement souleve par le jury, avec la mise en
garde "ne pas construire une demo ou tout le monde voit tous les clients du
reseau".

Prompt utilisateur resume (apres relecture du corpus) :

```text
On doit vraiment couvrir le TDR, les restrictions peuvent etre ajoutees apres,
mais pour le moment c'est le TDR [...] quel est le probleme qu'on resout ?
```

Puis, apres presentation du RBAC construit qui deferait deliberement la
visibilite differenciee :

```text
Oui, la construire maintenant - c'est explicitement cite comme un point du
jury a montrer dans la demo.
```

Decouverte parallele : `C:\Users\ulric\Documents\cifHackathon\` est un AUTRE
projet complet, `sentinellecoop`, avec une equipe reelle (OUEDRAOGO Yannick U.
L. et 3 autres), un moteur de correspondance phonetique ouest-africain mesure
sur la vraie liste ONU, et un dossier de candidature deja depose le 23/08/2026
pour l'edition Burkina Faso (4-6 sept 2026). L'utilisateur a clarifie :

```text
cifSentinel est calque sur le TDR et sera notre travail a presenter demain [...]
SentinelleCoop etait devenu trop gros avec beaucoup de tentatives ca et la, et
on s'eloignait du TDR.
```

Decision : cifSentinel (ce depot) est le projet a presenter. sentinellecoop
reste une reference technique interessante (son moteur phonetique WAPE est
nettement plus rigoureux que le RapidFuzz generique utilise ici - une
integration future serait pertinente si le temps le permet) mais ne pilote plus
le scope.

Actions :

- Corrige `POST /accounts` qui bloquait l'ouverture de compte multi-caisse
  (bug reel, pas juste un ecart au corpus).
- Reecrit la visibilite `/clients` et `/alerts` : masquage par compte pour les
  roles locaux, deblocage sur alerte vivante pour conformite/superviseur
  (jamais guichet seul), masquage du nom pour les roles reseau sauf alerte.
- Ajoute les regles R005/R006 (seuil par caisse/zone) et R011 (mandataire
  multi-clients), absentes du catalogue de regles jusque-la.
- Etendu `Client` avec ~40 champs KYC a partir d'un vrai modele de fiche client
  papier fourni par l'utilisateur (caisse populaire, section par section).
- Importe le vrai jeu de donnees synthetique du corpus
  (`backend/seed_corpus_demo.py`) plutot que des donnees inventees.
- Verifie en conditions reelles (Playwright, captures d'ecran) plutot que sur
  la seule foi des tests unitaires - a revele deux bugs UX (formulaire qui se
  ferme avant que le message de succes soit lisible) qu'aucun test backend
  n'aurait attrapes.

## Prompt de fin de session - documentation sans dependance IA

Prompt utilisateur resume :

```text
Serais-tu capable de maintenir et de reparer ce que l'IA t'a aide a realiser ?
[...] Ne construis pas avec l'IA quelque chose que seule l'IA serait capable de
t'expliquer ensuite.
```

Action : mise a jour de ce fichier, de `CHANGELOG.md` et de
`docs/MAINTENANCE.md` pour refleter l'etat reel du 2026-09-07 au soir (73
tests, `.venv` comme environnement canonique, `seed_corpus_demo.py` comme
donnees de demo recommandees, scenario de demo reecrit autour de la visibilite
differenciee). Cle de test : un humain sans IA doit pouvoir relire ces trois
fichiers et retrouver, en moins de dix minutes, comment relancer le projet,
pourquoi chaque decision structurante a ete prise, et ce qu'il reste a faire.

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
