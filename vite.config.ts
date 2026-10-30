import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Vaela Table",
        short_name: "Vaela Table",
        description: "Table feed, private inboxes and player kit for A Finding of Good Standing",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0A0F12",
        theme_color: "#0A0F12",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // The app shell is precached; the feed and inboxes (content/) are always fetched fresh,
        // with the last copy kept for offline reading.
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,woff2}"],
        globIgnores: ["content/**"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/content/"),
            handler: "NetworkFirst",
            options: { cacheName: "table-content", networkTimeoutSeconds: 6 },
          },
        ],
      },
    }),
  ],
  test: { environment: "node" },
} as any);
