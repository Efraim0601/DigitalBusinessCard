import { describe, expect, it, vi } from "vitest";

describe("app/composables/useAppLocale", () => {
  it("expose t() et la locale par défaut", async () => {
    const { useAppLocale } = await import("../../app/composables/useAppLocale");
    const { locale, t } = useAppLocale();
    expect(locale.value).toBe("fr");
    expect(t("action.share")).toBe("Partager");
  });

  it("setLocale met à jour la locale", async () => {
    const { useAppLocale } = await import("../../app/composables/useAppLocale");
    const { locale, setLocale, t } = useAppLocale();
    setLocale("en");
    expect(locale.value).toBe("en");
    expect(t("action.share")).toBe("Share");
  });

  it("initialise depuis localStorage si présent", async () => {
    localStorage.setItem("vcard-locale", "en");
    const { useAppLocale } = await import("../../app/composables/useAppLocale");
    const { locale } = useAppLocale();
    expect(locale.value).toBe("en");
    localStorage.removeItem("vcard-locale");
  });

  it("ignore une locale stockée invalide", async () => {
    localStorage.setItem("vcard-locale", "de");
    const { useAppLocale } = await import("../../app/composables/useAppLocale");
    const { locale } = useAppLocale();
    expect(locale.value).toBe("fr");
    localStorage.removeItem("vcard-locale");
  });

  it("tolère une erreur de lecture localStorage", async () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { useAppLocale } = await import("../../app/composables/useAppLocale");
    const { locale } = useAppLocale();
    expect(["fr", "en"]).toContain(locale.value);
    spy.mockRestore();
  });
});
