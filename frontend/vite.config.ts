import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "SentinelleCoop - Filtrage LBC/FT/PPE",
        short_name: "SentinelleCoop",
        description: "Filtrage LBC/FT/PPE pour les SFD membres du reseau CIF",
        theme_color: "#0e6b60",
        background_color: "#f6f4ef",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // La couche hors-ligne "donnees" est geree par lib/queue.ts (IndexedDB) -
        // le service worker se limite a rendre l'app installable et a mettre en
        // cache les fichiers statiques (JS/CSS), pas les reponses API.
        runtimeCaching: [],
      },
    }),
  ],
});
