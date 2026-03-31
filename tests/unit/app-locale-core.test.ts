import { describe, expect, it } from "vitest";
import {
  LOCALE_STORAGE_KEY,
  normalizeStoredLocale,
  translateWithFallback,
} from "../../app/utils/app-locale-core";

describe("app/utils/app-locale-core", () => {
  it("exposes the storage key used by the composable", () => {
    expect(LOCALE_STORAGE_KEY).toBe("vcard-locale");
  });

  it("normalizeStoredLocale n'accepte que fr/en", () => {
    expect(normalizeStoredLocale(null)).toBeNull();
    expect(normalizeStoredLocale(undefined)).toBeNull();
    expect(normalizeStoredLocale("de")).toBeNull();
    expect(normalizeStoredLocale("fr")).toBe("fr");
    expect(normalizeStoredLocale("en")).toBe("en");
  });

  it("translateWithFallback utilise la locale puis le français puis la clé", () => {
    expect(translateWithFallback("fr", "action.share")).toBe("Partager");
    expect(translateWithFallback("en", "action.share")).toBe("Share");
    expect(translateWithFallback("en", "__missing_key__")).toBe(
      translateWithFallback("fr", "__missing_key__")
    );
  });

  it("translateWithFallback remplace les paramètres {name}", () => {
    const fr = translateWithFallback("fr", "share.discover", { name: "Jean" });
    expect(fr).toContain("Jean");
    expect(fr).not.toContain("{name}");
  });
});
