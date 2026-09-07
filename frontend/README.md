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
- `src/lib/db.ts` : stockage local IndexedDB.
- `src/lib/queue.ts` : file d'ecritures hors-ligne.
- `src/hooks/useOnlineStatus.ts` : etat reseau et compteurs de sync.
- `src/screens/` : ecrans principaux.
- `src/components/` : layout, navigation et indicateur de synchronisation.

## Flux attendus pour la demo

- Connexion agent.
- Creation client.
- Recherche client.
- Consultation solde global et mouvements.
- Creation d'operation.
- File d'alertes conformite.
- Administration sanctions/PPE.
- Synchronisation offline avec anti-doublon.

## Points a aligner avec le backend recent

Le backend expose maintenant aussi :

- `POST /accounts`
- `POST /mandats`
- `GET /audit`
- `POST /sync/push`
- `GET /sync/pull`

Verifier que l'interface montre ces flux avant la presentation finale.
