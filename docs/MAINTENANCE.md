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

Etat valide le 2026-09-07 (soir) : 73 tests passent.

**Toujours utiliser `.venv\Scripts\python.exe`, jamais un `python` global.**
Un decalage de version scikit-learn entre l'environnement qui a entraine
`risk_model.joblib` et celui qui le charge produit un avertissement (et un
risque reel de plantage) - deja rencontre une fois ce soir en melangeant les
deux. Si `pytest` affiche `InconsistentVersionWarning`, reentrainez le modele
avec le meme interpreteur que celui qui fait tourner les tests (voir
ci-dessous).

## Peupler une base de demo realiste

```powershell
cd backend
..\.venv\Scripts\python.exe seed_corpus_demo.py
```

Importe le jeu de donnees synthetique du corpus CIF (4 caisses, 8 clients dont
un cas multi-caisse, mandats, listes de surveillance) et filtre automatiquement
chaque client a l'import pour que les alertes existent des le demarrage. Sans
argument, lit depuis `C:\Users\ulric\Documents\cifHackathon\corpusCIF\...` - si
ce chemin n'existe pas sur la machine de demo, passer le dossier
`dataset_demo/` en argument, ou copier ces CSV dans le depot.

15 comptes de demo sont crees, mot de passe unique `Demo2026!` (`guichet_dori`,
`conformite_dori`, `superviseur_dori`, idem pour banfora/ouaga/cotonou, plus
`conformite_reseau`, `auditeur_reseau`, `admin_reseau`).

Cas a connaitre pour la demo (imprimes par le script a l'execution) :

- `GCLI_001` KABORE AMADOU : comptes a Dori (425 000) et Banfora (980 000),
  solde consolide 1 405 000 FCFA. Nom proche de la sanction "KABRE AMADOU".
  **C'est le cas a montrer pour la visibilite differenciee** : connecte comme
  `guichet_dori`, le solde affiche est 425 000 (vue locale, l'autre compte est
  masque) ; connecte comme `conformite_reseau`, le solde est 1 405 000
  (vue reseau, alerte vivante = nom demasque aussi).
- `GCLI_002` OUEDRAOGO SALIFOU : mandat `MAND_002` EXPIRE + piece CNIB expiree -
  un retrait par procuration est refuse pour les deux raisons.
- `GCLI_003` DIALLO MAMADOU : alias JALLO MAMADOU sur liste de sanctions.
- `GCLI_006` SOCIETE SAHEL TRADING (personne morale) : beneficiaire effectif
  SANKARA MARIAM, PPE.

## Reentrainer le modele IA

```powershell
.\.venv\Scripts\python.exe ml\train_risk_model.py
```

Artefacts produits :

- `ml/artifacts/risk_model.joblib`
- `ml/artifacts/risk_model_metrics.json`

A refaire chaque fois que la version de scikit-learn installee dans `.venv`
change (`pip list` pour verifier), sinon `pytest` affiche
`InconsistentVersionWarning` a l'usage du modele.

## Scenario de demo recommande

Prerequis : lancer `seed_corpus_demo.py` (voir plus haut) avant de commencer -
la demo s'appuie sur ses clients et alertes deja en place, pas sur un depart a
vide. Mot de passe unique `Demo2026!`.

1. **Visibilite differenciee** (le moment le plus important - explicitement
   souleve par le jury CIF) :
   - connexion `guichet_dori`, ouvrir la fiche `FID-BF-0100-00000001-3`
     (KABORE AMADOU) : solde 425 000 FCFA, badge "vue locale", un compte
     affiche masque.
   - deconnexion, connexion `conformite_reseau` : meme fiche, solde
     1 405 000 FCFA, badge "vue reseau", nom en clair (alerte vivante sur ce
     client la debloque).
2. Creation d'un nouveau client via le formulaire complet (8 sections, calque
   sur une vraie fiche KYC de caisse) - montre le FID attribue immediatement.
3. Filtrage : chercher "DIALLO" ou "MAIGA" - alias detectes sur les listes de
   sanctions du corpus.
4. Retrait par procuration refuse : `guichet_banfora` tente un retrait sur le
   compte de OUEDRAOGO SALIFOU (`CPT_BAN_002`) avec le mandataire
   `SOME PAUL` / piece `CNIB-MAND-002` - mandat expire, refuse (409).
5. Depot au-dessus du seuil local : un depot de 700 000 FCFA a Dori (seuil
   500 000, zone rouge) declenche une alerte informative ; le meme montant a
   Banfora (seuil 1 000 000, zone verte) ne declenche rien - montre le
   parametrage par zone.
6. Consultation `/alerts` connecte `conformite_dori` : ne montre que les
   alertes des clients de Dori, pas celles des autres caisses (meme principe
   de visibilite que l'etape 1).
7. Coupure reseau simulee : envoyer les operations en lot via `/sync/push`.
8. Rejouer le meme lot : les operations passent en `REPLAYED`, sans doublon.
9. Consultation `/sync/pull` et `/audit` pour montrer le rattrapage et la tracabilite.

## Ou reparer quoi

- Authentification et roles : `backend/app/services/security.py`
- **Visibilite differenciee** (qui voit quoi, masquage, deblocage sur alerte) :
  `backend/app/services/visibility.py` - point d'entree unique, utilise par
  `routers/clients.py` (search, solde-global, mouvements, fiche) et
  `routers/alerts.py` (liste).
- Creation/recherche/fiche client (KYC ~40 champs) : `backend/app/routers/clients.py`,
  `backend/app/schemas/client.py`, `backend/app/models/client.py`
- Comptes : `backend/app/routers/accounts.py`
- Transactions : `backend/app/routers/transactions.py`
- Mandats/procurations (regles R010/R011) : `backend/app/routers/mandats.py`,
  `backend/app/services/mandats.py`, `backend/app/models/mandat.py`
- KYC/CNIB (regles R004/R015) : `backend/app/services/kyc.py`
- Seuils par caisse/zone (regles R005/R006) : `backend/app/models/sfd.py`
  (`zone_risque`, `seuil_depot`, `seuil_retrait`), utilises dans
  `backend/app/services/anomaly.py`
- Audit : `backend/app/services/audit.py`, `backend/app/models/audit.py`
- Synchronisation offline : `backend/app/routers/sync.py`, `backend/app/schemas/sync.py`
- Filtrage sanctions/PPE : `backend/app/services/screening_service.py`
- Matching flou : `backend/app/services/fuzzy_match.py`
- Alertes comportementales (fractionnement, montant inhabituel, seuil local) :
  `backend/app/services/anomaly.py`
- Modele IA : `ml/train_risk_model.py`, `backend/app/services/ml_risk.py`
- Jeu de donnees de demo (corpus CIF) : `backend/seed_corpus_demo.py`
- Frontend - fiche KYC + formulaire de creation : `frontend/src/screens/ClientFicheScreen.tsx`,
  `frontend/src/screens/ClientSearchScreen.tsx`
- Tests : `backend/tests/` (`test_visibility.py` pour la visibilite differenciee,
  `test_zone_thresholds.py` pour R005/R006, `test_mandats.py` pour R011)

## Regle d'or

Chaque nouvelle fonctionnalite doit avoir :

- une phrase qui la rattache au TDR ;
- un test backend ou une verification manuelle documentee ;
- une ligne dans `CHANGELOG.md` ;
- si elle vient d'un prompt IA important, une entree dans `docs/PROMPTS.md`.
