import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-192.png", "pwa-512.png"],
      devOptions: { enabled: true },
      manifest: {
        name: "HogarPlus",
        short_name: "HogarPlus",
        description: "Productos para el hogar con pagos semanales",
        theme_color: "#0B1F4A",
        background_color: "#0B1F4A",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "es-DO",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@hogarplus/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
    watch: {
      ignored: ["**/dist/**", "**/dev-dist/**"],
    },
  },
});
