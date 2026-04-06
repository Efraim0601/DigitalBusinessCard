import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

/** Doit rester aligné avec `pwa.includeAssets` dans nuxt.config.ts */
const PWA_INCLUDE_ASSETS = [
  "favicon.ico",
  "apple-touch-icon.png",
  "favicon.svg",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
] as const;

async function loadPwaIncludeAssetsFromConfig(): Promise<string[]> {
  vi.stubGlobal("defineNuxtConfig", (config: unknown) => config);
  vi.resetModules();
  const mod = await import("../../nuxt.config.ts");
  vi.unstubAllGlobals();
  const cfg = mod.default as { pwa?: { includeAssets?: string[] } };
  return cfg.pwa?.includeAssets ?? [];
}

describe("PWA — fichiers publics référencés par @vite-pwa/nuxt", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("chaque entrée includeAssets existe sous public/", async () => {
    const fromConfig = await loadPwaIncludeAssetsFromConfig();
    expect(fromConfig.length).toBeGreaterThan(0);
    const publicDir = path.resolve(import.meta.dirname, "../../public");
    for (const name of fromConfig) {
      expect(existsSync(path.join(publicDir, name)), `manquant: public/${name}`).toBe(true);
    }
  });

  it("la liste de référence correspond à la config (évite dérive silencieuse)", async () => {
    const fromConfig = await loadPwaIncludeAssetsFromConfig();
    for (const name of PWA_INCLUDE_ASSETS) {
      expect(fromConfig).toContain(name);
    }
  });
});
