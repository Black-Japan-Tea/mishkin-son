import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Мишкин сон — трекер малыша",
        short_name: "Мишкин сон",
        description: "Суточный трекер сна и кормлений младенца",
        lang: "ru",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#D8DCE1",
        theme_color: "#D8DCE1",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        // HTML в прекэш не кладём и navigateFallback отключаем (у плагина дефолт
        // "index.html"; undefined перебивает его при Object.assign-мерже): оба пути
        // отдают устаревший index.html после нового деплоя — источник белого экрана.
        // Навигации вместо этого идут network-first: свежая страница с сервера,
        // офлайн — последний закэшированный ответ из runtime-кэша.
        navigateFallback: undefined,
        globPatterns: ["**/*.{js,css,svg,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "navigations",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 16, purgeOnQuotaError: true },
            },
          },
        ],
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
