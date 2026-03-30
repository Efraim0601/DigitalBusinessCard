import { describe, expect, it } from "vitest";
import { translations } from "../../app/locales/translations";

describe("app/locales/translations", () => {
  it("FR and EN define the same set of keys", () => {
    const frKeys = new Set(Object.keys(translations.fr));
    const enKeys = new Set(Object.keys(translations.en));

    const missingInEn = [...frKeys].filter((k) => !enKeys.has(k));
    const missingInFr = [...enKeys].filter((k) => !frKeys.has(k));

    expect(missingInEn, `Missing in EN: ${missingInEn.join(", ")}`).toEqual([]);
    expect(missingInFr, `Missing in FR: ${missingInFr.join(", ")}`).toEqual([]);
  });

  it("placeholder tokens in strings are consistent between locales (bracket style)", () => {
    for (const key of Object.keys(translations.fr)) {
      const fr = translations.fr[key] ?? "";
      const en = translations.en[key] ?? "";
      const frPh = [...fr.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
      const enPh = [...en.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
      expect(enPh, `Placeholder mismatch for "${key}"`).toBe(frPh);
    }
  });
});
