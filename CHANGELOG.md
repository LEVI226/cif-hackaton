# Changelog

Tous les changements notables de cifSentinel sont consignes ici pour que l'equipe
puisse maintenir le projet sans dependre d'une memoire IA. Voir aussi
`docs/DECISIONS.md` pour le "pourquoi" derriere les choix ci-dessous.

## 2026-09-07 (soir) - Visibilite differenciee reelle, fiche KYC, jeu de donnees corpus

Corrige des ecarts trouves en comparant le projet au corpus CIF
(`corpusCIF/topic1_lbc_ft/06_solution_grc_technique/`), qui documente en detail ce
que le jury attend sur la thematique 01 - notamment la visibilite differenciee,
explicitement citee comme un point souleve par le jury.

### Corrige (bugs reels, pas des ameliorations cosmetiques)

- `POST /accounts` refusait d'ouvrir un compte pour un client dans une AUTRE SFD
  que celle qui l'avait cree - cassait le scenario multi-caisse central du TDR
  (un client avec des comptes dans deux caisses). Retire cette restriction : le
  controle qui compte est le KYC (piece expiree), pas la SFD d'origine.
- La restriction "role local" sur les clients etait tout-ou-rien par
  `created_by_sfd_id` - un agent de Banfora etait bloque en entier sur un client
  qui a pourtant un compte a Banfora (juste ouvert par Dori). Remplace par une
  visibilite PAR COMPTE : detail complet sur les comptes de sa SFD, comptes des
  autres SFD indiques mais masques (numero, solde).
- `GET /alerts` montrait toutes les alertes du reseau a n'importe quel agent
  conformite local - meme faille que ci-dessus. Scope maintenant aux clients
  visibles localement (memes regles que `/clients`).

### Ajoute

- Deblocage de visibilite sur alerte vivante : un agent conformite ou superviseur
  SFD (jamais un agent de guichet seul) obtient la vue reseau complete sur un
  client des qu'une alerte ouverte/en cours/confirmee existe sur ce client.
- Masquage du nom pour les roles reseau (conformite reseau, auditeur) : le nom
  reel n'apparait que si une alerte vivante le justifie ; recherche par nom
  desactivee pour ces roles hors alerte (recherche par FID toujours possible).
- Nouvel endpoint `GET /clients/{fid}` (fiche complete) - manquait, le frontend
  n'avait aucun moyen de charger le detail KYC d'un client.
- Fiche client etendue avec ~40 champs KYC calques sur un vrai formulaire de
  caisse populaire (etat civil, piece d'identite, coordonnees, activite et
  revenus, filtrage AML/PPE, personne morale/beneficiaire effectif) - voir
  `app/models/client.py` et `app/schemas/client.py::ClientFieldsOptional`.
- Regle R011 (mandataire lie a plusieurs clients) - manquait completement,
  ajoutee dans `app/services/mandats.py::clients_lies_au_mandataire`.
- Regles R005/R006 (seuil de depot/retrait PAR CAISSE, pas un seuil global) -
  `SFD` a maintenant `zone_risque`, `seuil_depot`, `seuil_retrait` ; Dori (zone
  rouge) et Banfora (zone verte) alertent a des montants differents.
- `backend/seed_corpus_demo.py` : importe le vrai jeu de donnees synthetique du
  corpus (`dataset_demo/*.csv`) - 4 caisses, 8 clients, 9 comptes, 3 mandats, 5
  entrees de surveillance, 15 comptes utilisateurs de demo (mdp `Demo2026!`).
  Ecran de filtrage automatique a l'import pour que les alertes existent des le
  demarrage. Les operations (`operations.csv`) sont volontairement laissees pour
  la demo live, pas importees en silence.
- Frontend : formulaire de creation client en 8 sections numerotees (identique
  au modele papier), fiche client complete avec badges "vue locale/reseau" et
  comptes masques visibles, case "retrait par procuration" sur le formulaire de
  transaction, nav et routes mises a jour pour les 6 roles.
- Modele scikit-learn reentraine (le fichier `.joblib` avait ete pickle avec une
  version de sklearn differente de celle installee - risque reel de plantage sur
  une autre machine pour la demo).

### Verifie en conditions reelles (pas seulement teste unitairement)

- Backend + frontend lances contre la base peuplee par `seed_corpus_demo.py`,
  pilotes via Playwright (captures d'ecran, zero erreur console) :
  - KABORE AMADOU (comptes Dori + Banfora) : agent de guichet Dori voit
    425 000 FCFA (sa SFD), conformite reseau voit 1 405 000 FCFA consolides -
    exactement le scenario de demo recommande par le corpus.
  - Homonymie KABORE AMADOU / KABRE AMADOU (liste de sanctions) declenche
    BLOQUANT avec score 1.0.
  - Retrait par procuration a Banfora avec mandat expire (MAND_002) refuse.
  - Creation d'un nouveau client via le formulaire complet, bout en bout.

### Tests

- 73 tests passent (`cd backend && python -m pytest -q`).

### Attention / a faire avant la prochaine session

- Le formulaire frontend ne gere pas encore la creation/liste des mandats
  directement (le champ existe sur la transaction, pas d'ecran dedie).
- Pas de test automatise frontend (verification manuelle via Playwright
  seulement, scripts non conserves dans le repo).
- Deux projets distincts existent pour la thematique 01 : `cifSentinel` (ce
  depot) et `sentinellecoop` (`C:\Users\ulric\Documents\cifHackathon`, dossier
  deja soumis le 23/08/2026 pour l'edition Burkina Faso). Ce depot est celui a
  presenter, sentinellecoop a ete abandonne car devenu trop large par rapport
  au TDR - voir `docs/DECISIONS.md` pour le contexte complet.

## 2026-09-07 - Reprise TDR CIF, conformite terrain

### Ajoute

- Controle KYC a la creation client :
  - piece d'identite/CNIB expiree = ouverture bloquee ;
  - personne morale sans beneficiaire effectif = ouverture bloquee.
- Retrait par procuration :
  - nouveau modele `Mandat` ;
  - endpoint `POST /mandats` pour enregistrer un mandat ;
  - controle date de validite + statut + plafond avant retrait.
- Journal d'audit minimal :
  - creation client ;
  - creation mandat ;
  - creation transaction avec statut, type, alertes et mandat le cas echeant.
- Endpoint `GET /audit` pour consulter les traces conformite.
- Endpoint `POST /accounts` pour creer un compte depuis Swagger pendant la demo.
- Synchronisation offline demonstrable :
  - `POST /sync/push` applique une file d'operations creees hors-ligne ;
  - `GET /sync/pull` recupere alertes et traces recentes apres reconnexion ;
  - chaque operation est protegee par une cle idempotente `device_id:operation_id`.
- Modele IA transactionnel :
  - entrainement scikit-learn dans `ml/train_risk_model.py` ;
  - artefact `ml/artifacts/risk_model.joblib` ;
  - metriques `ml/artifacts/risk_model_metrics.json` ;
  - endpoint `POST /ml/risk-score`.
- RBAC plus proche du TDR :
  - roles locaux : guichet, conformite SFD, superviseur SFD ;
  - roles reseau : conformite reseau, auditeur, admin reseau ;
  - lecture locale restreinte au perimetre SFD pour les roles locaux.
- Tests backend pour les nouvelles regles TDR.
- Environnement Python local `.venv` pour rendre les tests reproductibles.

### Valide

- `.\.venv\Scripts\python.exe -m pytest backend\tests`
- Resultat : 56 tests passes.

### Attention

- Le frontend doit encore exposer clairement les nouveaux cas de demo :
  - creation client avec CNIB expiree ;
  - creation de mandat ;
  - retrait par procuration ;
  - lecture du journal d'audit.
  - synchronisation offline push/pull.
- La restriction locale actuelle se base sur `Client.created_by_sfd_id`. Pour une
  vraie production multi-caisses, il faudra une matrice de visibilite plus fine
  par compte, alerte, role et statut d'enquete.
