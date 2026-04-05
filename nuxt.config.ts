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
    "/api/openapi": { cors: true },
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

  /**
   * Thème clair par défaut sur toutes les pages. Ancienne clé localStorage `nuxt-color-mode`
   * ignorée : nouvelle clé pour que le défaut s’applique même aux profils déjà en « sombre ».
   * La préférence choisie via le bouton thème est toujours enregistrée sous `storageKey`.
   */
  colorMode: {
    preference: "light",
    fallback: "light",
    storageKey: "cardyo-color-mode",
    classSuffix: "",
    disableTransition: true,
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

    includeAssets: [
      "favicon.ico",
      "apple-touch-icon.png",
      "favicon.svg",
      "favicon-16x16.png",
      "favicon-32x32.png",
      "android-chrome-192x192.png",
      "android-chrome-512x512.png",
    ],
    manifest: {
      name: "vcard",
      short_name: "vcard",
      description: "A simple, URL based, digital card system.",
      theme_color: "#000000",
      icons: [
        {
          src: "android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "android-chrome-512x512.png",
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

  /**
   * Timeout socket HTTP : au-dessus du middleware API (NITRO_HANDLER_TIMEOUT_MS, défaut 2000)
   * pour laisser le temps d’émettre le 503 applicatif avant fermeture Node.
   */
  nitro: {
    hooks: {
      listen(server) {
        const handlerMs = Math.max(500, Number(process.env.NITRO_HANDLER_TIMEOUT_MS || 2000));
        const explicit = Number(process.env.NITRO_REQUEST_TIMEOUT_MS || 0);
        server.requestTimeout = explicit > 0 ? explicit : handlerMs + 1500;
      },
    },
  },
});
