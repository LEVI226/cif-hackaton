# Changelog

Tous les changements notables de cifSentinel sont consignes ici pour que l'equipe
puisse maintenir le projet sans dependre d'une memoire IA.

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
- RBAC plus proche du TDR :
  - roles locaux : guichet, conformite SFD, superviseur SFD ;
  - roles reseau : conformite reseau, auditeur, admin reseau ;
  - lecture locale restreinte au perimetre SFD pour les roles locaux.
- Tests backend pour les nouvelles regles TDR.
- Environnement Python local `.venv` pour rendre les tests reproductibles.

### Valide

- `.\.venv\Scripts\python.exe -m pytest backend\tests`
- Resultat : 55 tests passes.

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
