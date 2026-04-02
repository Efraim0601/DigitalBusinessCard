// https://nuxt.com/docs/api/configuration/nuxt-config

const disableFonts = process.env.NUXT_DISABLE_FONTS === "1" || process.env.NUXT_DISABLE_FONTS === "true";
export default defineNuxtConfig({
  devtools: { enabled: true },
  devServer: {
    host: "0.0.0.0",
  },

  app: {
    head: {
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, user-scalable=yes",
        },
      ],
    },
  },

  runtimeConfig: {
    adminEmail: process.env.ADMIN_EMAIL || "admin@afrilandfirstbank.com",
    adminPassword: process.env.ADMIN_PASSWORD || "adminabf@afrilandfirstbank.com",
    adminSessionSecret: process.env.ADMIN_SESSION_SECRET || "change-this-secret-in-production",
  },

  routeRules: {
    "/api/cards": { cors: true },
    "/api/departments": { cors: true },
    "/api/job-titles": { cors: true },
  },

  experimental: {
    payloadExtraction: true,
    componentIslands: false,
  },

  vite: {
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules/html-to-image")) return "html-to-image";
            if (id.includes("node_modules/nuxt-qrcode") || id.includes("node_modules/uqr")) return "qrcode";
          },
        },
      },
    },
  },

  modules: [
    "@nuxt/ui",
    "@nuxt/eslint",
    ...(disableFonts ? [] : ["@nuxt/fonts"]),
    "@nuxt/icon",
    "@nuxt/image",

    "nuxt-qrcode",
    "@vueuse/nuxt",
    "@vite-pwa/nuxt",
  ],

  // Lors des builds Docker en environnements sans accès réseau, on désactive le module fonts.
  ...(disableFonts
    ? {}
    : {
        // Éviter les timeouts réseau au build : utiliser Google pour Public Sans (plus fiable que fontshare en CI)
        fonts: {
          families: [{ name: "Public Sans", provider: "google" }],
        },
      }),

  css: ["~/assets/css/main.css"],

  future: {
    compatibilityVersion: 4,
  },
  pwa: {
    injectRegister: "auto",

    includeAssets: ["favicon.ico", "apple-touch-icon.png", "favicon.svg"],
    manifest: {
      name: "vcard",
      short_name: "vcard",
      description: "A simple, URL based, digital card system.",
      theme_color: "#000000",
      icons: [
        {
          src: "web-app-manifest-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "web-app-manifest-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "favicon.svg",
          sizes: "512x512",
          type: "image/svg",
          purpose: "any",
        },
      ],
    },
  },

  compatibilityDate: "2024-11-27",

  /** Timeout HTTP requête (rapport DSIT DA-03) — 503 côté Node si dépassé. */
  nitro: {
    hooks: {
      listen(server) {
        const ms = Math.max(1000, Number(process.env.NITRO_REQUEST_TIMEOUT_MS || 2000));
        server.requestTimeout = ms;
      },
    },
  },
});
