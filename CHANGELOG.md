# Changelog

Tous les changements notables de SentinelleCoop sont consignes ici pour que l'equipe
puisse maintenir le projet sans dependre d'une memoire IA. Voir aussi
`docs/PROMPTS.md` pour le "pourquoi" derriere les choix ci-dessous.

## 2026-09-07 (soir) - Session expiree : l'interface restait affichee a vide

Signale par l'equipe : le tableau de bord affichait "Le chargement des
statistiques a echoue" alors que l'utilisateur semblait connecte. Diagnostic :
le jeton JWT expire au bout de 30 min cote serveur, mais `ProtectedRoute` ne
verifiait que la PRESENCE d'un jeton en localStorage, jamais sa validite.
Resultat : coquille applicative affichee avec le bon role, et tous les appels
API rejetes en 401 - sans aucun message expliquant qu'il faut se reconnecter.
Defaut anterieur a la refonte visuelle, mais fatal en demonstration.

### Corrige

- `lib/auth.tsx` : la date d'expiration (`exp`) est lue dans le jeton au
  demarrage. Une session expiree n'est plus restauree du tout - on repart sur
  l'ecran de connexion au lieu d'afficher une interface morte.
- `lib/api.ts` : tout 401 recu en cours d'usage purge la session et renvoie sur
  `/login?expired=1`. Le cas `POST /auth/login` est exclu (la, un 401 signifie
  "mauvais identifiants", pas "session expiree") pour eviter une boucle.
- `LoginScreen` affiche "Session expiree — merci de vous reconnecter".
- `ACCESS_TOKEN_EXPIRE_MINUTES` devient reglable par
  `SENTINEL_TOKEN_TTL_MINUTES` (defaut inchange : 30 min). Le poste de
  demonstration peut monter a 480 sans affaiblir le defaut du projet.

### Verifie (Playwright)

- Jeton deja expire au chargement -> redirection `/login`, localStorage purge.
- Jeton devenant invalide en cours de session -> le premier appel rejete
  renvoie sur `/login?expired=1` avec le message affiche.
- 73 tests backend toujours au vert.

## 2026-09-07 (soir) - Refonte visuelle, sans toucher au RBAC

L'equipe a compare notre interface a celle d'une autre piste exploratoire (prototype
Next.js/shadcn) et a demande le meme niveau de finition. Parti pris : reprendre
sa **structure** (barre laterale, densite, sparklines, jauge) mais rien de sa
logique - cette piste-la n'a aucune authentification ni RBAC cable (`next-auth`
present dans package.json, jamais configure ; `db.client.findMany()` sans aucun
filtre de role), c'est-a-dire precisement ce que le jury a demande de traiter.

### Ajoute

- Systeme de design refondu (`index.css`) : palette emeraude/ardoise, echelle
  typographique, ombres, et les effets demandes par l'equipe (degrade sur le
  titre, halo pulsant sur les alertes critiques, reflet et elevation au survol,
  squelettes scintillants). `prefers-reduced-motion` neutralise le tout.
- **Barre laterale sombre** (module + sous-titre + pastille d'alertes ouvertes)
  qui devient une **barre d'onglets basse en dessous de 900 px** : la PWA est
  utilisee au guichet sur telephone, une laterale fixe de 248 px y serait un
  contresens. Position verifiee en 390x844 (collee au bas de la fenetre).
- `components/icons.tsx` et `components/charts.tsx` : icones, sparklines et
  jauge **dessinees a la main en SVG**. Aucune dependance ajoutee (ni lucide,
  ni recharts) - la PWA doit rester legere et autonome hors-ligne.
- Aucune police distante : une police servie par CDN tomberait en fallback
  silencieux hors-ligne, dans le cas d'usage meme que le TDR nous demande.
- Tableau de bord : bandeau d'entete, six tuiles KPI avec tendance 7 jours,
  jauge de score et trois barres d'indicateurs.
- Ecran clients : lignes avec initiales, badge de risque, badge PPE, et surtout
  le badge **"masque"** bien plus visible - c'est la preuve a l'ecran de la
  visibilite differenciee. Etat initial explicatif au lieu d'une page vide.
- File d'alertes : lisere de gravite, pastille bloquante/informative, score en
  pourcentage, etat vide soigne.

### Corrige

- `POST /auth/login` renvoyait toujours vers `/clients` : un ADMIN_RESEAU
  atterrissait donc sur un ecran "role non autorise" a chaque connexion. Il
  arrive maintenant sur le tableau de bord, accessible a tous les roles.
- `API_BASE_URL` se deduit desormais de l'hote qui sert la page au lieu d'une IP
  figee dans `.env.local`. L'adresse IP du poste avait change entre deux
  sessions et l'application ne joignait plus son backend - le meme piege se
  serait produit le jour de la demo en changeant de wifi.
- `AlertOut` expose maintenant `decision` (BLOQUANT/INFORMATIF) : l'interface
  affiche la gravite renvoyee par le serveur au lieu de recopier les seuils
  0,92 / 0,75, qui restent a un seul endroit (`services/fuzzy_match.py`).

### Le RBAC n'a pas bouge - verifie, pas suppose

- 73 tests backend passent, dont les 13 de `test_visibility.py`.
- Verification a l'ecran (Playwright, donnees reelles du corpus) :
  - `guichet_dori` (role local) voit 3 clients / 3 comptes ; `conformite_reseau`
    en voit 8 / 9 sur le meme tableau de bord.
  - Un role reseau cherchant un client **avec** alerte vive voit son nom en
    clair ; le meme role cherchant NIKIEMA ALI (aucune alerte) obtient
    `N. A.` + badge "masque", et la chaine "NIKIEMA" est absente du DOM.
  - Le menu "Alertes" reste invisible pour AGENT_GUICHET.

## 2026-09-07 (tard) - Tableau de bord reel + detection reseau fiable (health-check)

Deux trous identifies lors d'une relecture critique d'un prompt de refonte
generique recu de l'equipe (la refonte elle-meme a ete ecartee - trop risquee a
la veille de la presentation - mais deux constats etaient reels et valables) :
aucun ecran d'accueil avec des chiffres reels, et l'indicateur de connexion ne
disait "en ligne" que d'apres `navigator.onLine`, qui reste `true` tant que le
wifi repond meme si le backend est injoignable (serveur eteint, mauvaise IP,
pare-feu).

### Ajoute - Tableau de bord

- `GET /dashboard/stats` (`backend/app/routers/dashboard.py`) : compteurs agreges
  (clients, comptes, solde total, filtrages, alertes ouvertes par gravite,
  clients PPE/risque eleve, taille des listes sanctions/PPE). Applique la meme
  visibilite differenciee que le reste de l'API - un role local ne voit que
  les chiffres de SA SFD (`_local_visible_client_fids`, meme regle que
  `client_visible_to_local_role`), un role reseau voit tout le reseau. Aucun
  nom de client n'y figure : accessible a tous les roles authentifies, y
  compris ADMIN_RESEAU, sans contredire la separation des taches.
- `frontend/src/screens/DashboardScreen.tsx`, route `/` (nouvelle page
  d'accueil pour tous les roles, y compris ADMIN_RESEAU - avant, `/`
  redirigeait directement vers `/clients` ou `/admin` sans jamais rien
  afficher). Utilise `cachedGet` comme le reste de l'app.
- Nouvelles classes `.stat-grid`/`.stat-tile` dans `index.css`.

### Ajoute - Detection reseau reelle (3 etats)

- `frontend/src/lib/health.ts` (`pingBackendHealth`) : verifie par un vrai
  appel `GET /health` (timeout 3s) que le backend repond, plutot que de se
  fier au seul evenement navigateur.
- `hooks/useOnlineStatus.ts` : nouveau `useConnectionStatus()` retourne
  `ONLINE | DEGRADED | OFFLINE` au lieu d'un booleen. `DEGRADED` = navigateur
  connecte mais backend injoignable - l'etat que l'ancien indicateur binaire
  ne pouvait pas detecter. `useOnlineStatus()` est gardee (deleguant a
  `useConnectionStatus`) pour ne pas casser les appelants existants.
- `components/SyncIndicator.tsx` affiche desormais trois pastilles distinctes :
  "Synchronise" / "Serveur injoignable" / "Hors-ligne".
- `lib/queue.ts` (`startQueueAutoSync`) : l'evenement navigateur `online` seul
  ne se redeclenche jamais si le wifi n'a jamais bouge pendant que le backend
  redemarrait (transition DEGRADED -> ONLINE) - la file d'ecritures restait
  bloquee jusqu'a une action manuelle. Un sondage `/health` toutes les 8s
  (seulement s'il y a des operations en attente) declenche desormais
  `flushQueue()` des que le backend redevient joignable, meme sans evenement
  `online`.

### Verifie en conditions reelles (backend + Playwright, pas juste relecture)

- `POST /auth/login` + `GET /dashboard/stats` sur les donnees reelles du
  corpus (`sentinel.db` seede) : `guichet_dori` voit 3 clients/3 comptes/2 145
  000 FCFA (perimetre Dori uniquement) ; `conformite_reseau` et
  `auditeur_reseau` voient les 8 clients/9 comptes/6 980 000 FCFA du reseau
  entier - la difference confirme que le filtrage par SFD fonctionne, pas
  seulement que l'endpoint repond.
- Simulation DEGRADED (requetes `/health` bloquees via `page.route`, sans
  couper le reseau navigateur) : la pastille passe a "Serveur injoignable"
  dans les 8s, confirmee par capture d'ecran.
- Simulation OFFLINE (`context.set_offline(true)`) : pastille "Hors-ligne",
  puis retour a "Synchronise" une fois la connexion retablie.

## 2026-09-07 (nuit) - Lecture hors-ligne : combler le seul vrai trou trouve en testant

En verifiant en direct (coupure reseau reelle, pas juste relecture de code) le
mode degrade demande par le TDR, un ecart honnete est apparu : la file
`lib/queue.ts` couvre les ECRITURES hors-ligne, mais aucune LECTURE (recherche,
fiche client, solde global) n'etait mise en cache - une coupure reseau pendant
une consultation produisait un ecran d'erreur.

### Ajoute

- `frontend/src/lib/cache.ts` (`cachedGet`) : toute lecture reussie en ligne est
  memorisee dans IndexedDB (nouvelle table `cachedReads`, `db.ts` v2). Si le
  meme appel echoue plus tard pour une raison reseau, la derniere reponse
  connue est servie a la place d'une erreur - jamais pour masquer une vraie
  erreur 403/404, seulement un echec reseau.
- Badge "Hors-ligne — cache de HH:MM" (`components/CacheBadge.tsx`) affiche sur
  l'ecran de recherche et la fiche client des que les donnees affichees
  viennent du cache plutot que du serveur.
- `ClientSearchScreen.tsx` et `ClientFicheScreen.tsx` utilisent maintenant
  `cachedGet` au lieu d'`apiFetch` direct pour leurs lectures.

### Verifie en conditions reelles (Playwright, coupure reseau simulee)

- Recherche "KABORE" en ligne, puis hors-ligne : memes resultats, badge cache
  affiche.
- Fiche client (KABORE AMADOU, comptes Dori+Banfora) ouverte en ligne, puis
  revisitee hors-ligne via navigation interne (pas un rechargement de page -
  voir note ci-dessous) : solde global 1 405 000 FCFA toujours affiche.
- Recherche d'un terme JAMAIS vu en ligne, hors-ligne : message d'erreur
  honnete ("rien en cache pour ce terme"), pas un ecran vide trompeur.

### Limite du mode developpement (non presente en production - verifie)

Un **rechargement complet de page** (F5, ou `page.reload()`) hors-ligne echoue
avant meme que le code de l'app ne s'execute en mode developpement
(`bun run dev`) : pas de service worker actif pour servir l'app shell
hors-ligne (le plugin PWA ne le genere qu'au `build` de production).

**Verifie separement sur le vrai build de production** (`bun run build` puis
`bun run preview`, service worker actif et confirme) : un F5 complet hors-ligne
fonctionne - app shell servi par le service worker, session conservee
(`localStorage`), fiche client rechargee depuis le cache `cachedReads`. La
limite n'existe qu'en dev ; le build qui sera reellement demontre demain n'est
pas concerne. A garder en tete si un membre de l'equipe teste sur
`bun run dev` la veille et croit voir un bug.

### Tests

- 73 tests backend inchanges (ce correctif est cote frontend uniquement).
- `frontend`: `bun run build` sans erreur TypeScript.

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
- Deux projets distincts existent pour la thematique 01 : `SentinelleCoop` (ce
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
