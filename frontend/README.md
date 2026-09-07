# Sentinel frontend

PWA React/Vite pour la demonstration terrain de cifSentinel. Elle consomme l'API
FastAPI situee dans `../backend`.

## Prerequis

- Bun ou Node 20+
- Backend lance sur `http://127.0.0.1:8000`

## Installation

```powershell
cd frontend
bun install
```

## Lancer en developpement

```powershell
bun run dev
```

Adresse habituelle : `http://localhost:5173`

## Structure

- `src/lib/api.ts` : client HTTP et erreurs reseau.
- `src/lib/auth.tsx` : session utilisateur et jeton JWT.
- `src/lib/db.ts` : stockage local IndexedDB (file d'ecritures + cache de lecture, v2).
- `src/lib/queue.ts` : file d'**ecritures** hors-ligne, rejouee sur reconnexion.
- `src/lib/cache.ts` : cache de **lecture** hors-ligne (`cachedGet`) - sert la
  derniere reponse connue quand un GET echoue pour raison reseau.
- `src/hooks/useOnlineStatus.ts` : etat reseau et compteurs de sync.
- `src/screens/` : ecrans principaux.
- `src/components/` : layout, navigation, indicateur de synchronisation
  (`SyncIndicator`) et badge de cache (`CacheBadge`).

## Flux attendus pour la demo

- Connexion agent.
- Creation client (fiche KYC complete, 8 sections).
- Recherche client.
- Consultation solde global et mouvements (avec badge vue locale/reseau).
- Creation d'operation, y compris retrait par procuration.
- File d'alertes conformite.
- Administration sanctions/PPE.
- Synchronisation offline des ecritures avec anti-doublon.
- **Consultation** offline (recherche + fiche deja vues en ligne) - voir
  `CHANGELOG.md`, entree "nuit".

## Ce qui n'a pas d'ecran dedie (Swagger uniquement)

Le backend expose ces endpoints, mais aucune interface ne les appelle encore :

- `POST /accounts` (creation de compte - contournee dans le guide de test via Swagger)
- `POST /mandats` en dehors du champ procuration sur le formulaire de transaction
  (pas d'ecran pour lister/gerer les mandats d'un client)
- `GET /audit`
- `POST /sync/push` / `GET /sync/pull` - mecanisme batche separe de la vraie
  file hors-ligne de la PWA (`lib/queue.ts`), voir le guide de test §9 pour la
  distinction.

Voir `docs/MAINTENANCE.md` pour le scenario de demo qui contourne ces trous via
Swagger la ou necessaire.
