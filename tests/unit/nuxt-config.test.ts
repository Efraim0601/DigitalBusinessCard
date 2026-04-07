import { afterEach, describe, expect, it, vi } from "vitest";

type NuxtConfigShape = {
  modules: string[];
  fonts?: { families: Array<{ name: string; provider: string }> };
  runtimeConfig: { adminEmail: string };
  routeRules: Record<string, { cors: boolean }>;
  nitro?: { prerender?: { routes?: string[] } };
  pwa?: {
    injectRegister?: string;
    registerWebManifestInRouteRules?: boolean;
    includeAssets?: string[];
    workbox?: { globPatterns?: string[] };
    manifest?: {
      name?: string;
      short_name?: string;
      start_url?: string;
      scope?: string;
      display?: string;
      theme_color?: string;
      icons?: Array<{ src?: string; sizes?: string; type?: string; purpose?: string }>;
    };
  };
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id: string) => string | undefined;
        };
      };
    };
  };
};

async function importNuxtConfig(disableFonts?: string) {
  if (disableFonts === undefined) {
    delete process.env.NUXT_DISABLE_FONTS;
  } else {
    process.env.NUXT_DISABLE_FONTS = disableFonts;
  }

  vi.stubGlobal("defineNuxtConfig", (config: unknown) => config);
  vi.resetModules();
  const mod = await import("../../nuxt.config.ts");
  return mod.default as NuxtConfigShape;
}

describe("nuxt.config.ts", () => {
  afterEach(() => {
    delete process.env.NUXT_DISABLE_FONTS;
    vi.unstubAllGlobals();
  });

  it("keeps fonts module by default", async () => {
    const config = await importNuxtConfig();
    expect(config.modules).toContain("@nuxt/fonts");
    expect(config.runtimeConfig.adminEmail).toBeTruthy();
    expect(config.routeRules["/api/cards"]).toEqual({ cors: true });
  });

  it("removes fonts module when explicitly disabled", async () => {
    const config = await importNuxtConfig("1");
    expect(config.modules).not.toContain("@nuxt/fonts");
    expect(config.fonts).toBeUndefined();
  });

  it("removes fonts module when disable flag is true", async () => {
    const config = await importNuxtConfig("true");
    expect(config.modules).not.toContain("@nuxt/fonts");
    expect(config.fonts).toBeUndefined();
  });

  it("returns expected manual chunks", async () => {
    const config = await importNuxtConfig();
    const chunker = config.vite.build.rollupOptions.output.manualChunks;
    expect(chunker("/x/node_modules/html-to-image/index.js")).toBe("html-to-image");
    expect(chunker("/x/node_modules/nuxt-qrcode/index.js")).toBe("qrcode");
    expect(chunker("/x/node_modules/uqr/index.js")).toBe("qrcode");
    expect(chunker("/x/src/main.ts")).toBeUndefined();
  });

  it("active le module PWA avec manifest et icônes", async () => {
    const config = await importNuxtConfig();
    expect(config.modules).toContain("@vite-pwa/nuxt");
    expect(config.pwa?.injectRegister).toBe("auto");
    expect(config.pwa?.registerWebManifestInRouteRules).toBe(true);
    expect(config.pwa?.includeAssets?.length).toBeGreaterThan(0);
    expect(config.pwa?.manifest?.short_name).toBeTruthy();
    expect(config.pwa?.manifest?.start_url).toBe("/");
    expect(config.pwa?.manifest?.scope).toBe("/");
    expect(config.pwa?.manifest?.display).toBe("standalone");
    expect(config.pwa?.manifest?.icons?.length).toBeGreaterThanOrEqual(2);
    const png192 = config.pwa?.manifest?.icons?.find((i) => i.sizes === "192x192");
    expect(png192?.src).toMatch(/192/);
    expect(config.pwa?.workbox?.globPatterns).toContain("index.html");
    expect(config.nitro?.prerender?.routes).toContain("/");
  });
});
