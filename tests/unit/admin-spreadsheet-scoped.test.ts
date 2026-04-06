import { describe, expect, it } from "vitest";
import {
  buildCardsSimplifiedCsvBuffer,
  buildDepartmentsCsvBuffer,
  buildJobTitlesCsvBuffer,
  CARD_CSV_HEADERS,
  parseScopedImportBuffer,
} from "../../server/utils/admin-spreadsheet";

describe("admin-spreadsheet (scoped)", () => {
  it("parseScopedImportBuffer parse un CSV cartes", () => {
    const csv = `email;first_name;last_name;mobile;poste;Direction
a@b.com;Ann;Bee;123;Mgr;IT`;
    const buf = Buffer.from(csv, "utf8");
    const parsed = parseScopedImportBuffer(buf, "t.csv", "cards");
    expect(parsed.scope).toBe("cards");
    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0]).toMatchObject({
      email: "a@b.com",
      first_name: "Ann",
      last_name: "Bee",
      posteLabel: "Mgr",
      directionLabel: "IT",
    });
  });

  it("parseScopedImportBuffer parse des directions label_fr/en", () => {
    const csv = "label_fr;label_en\nDir FR;Dir EN";
    const parsed = parseScopedImportBuffer(Buffer.from(csv), "d.csv", "departments");
    expect(parsed.scope).toBe("departments");
    expect(parsed.departments).toEqual([{ label_fr: "Dir FR", label_en: "Dir EN" }]);
  });

  it("parseScopedImportBuffer parse des titres", () => {
    const csv = "label_fr;label_en\nTitre FR;Title EN";
    const parsed = parseScopedImportBuffer(Buffer.from(csv), "j.csv", "job_titles");
    expect(parsed.job_titles).toEqual([{ label_fr: "Titre FR", label_en: "Title EN" }]);
  });

  it("refuse ZIP sur import scopé", () => {
    expect(() => parseScopedImportBuffer(Buffer.from("x"), "x.zip", "cards")).toThrow();
    try {
      parseScopedImportBuffer(Buffer.from("x"), "x.zip", "cards");
    } catch (e) {
      expect(e).toMatchObject({
        statusCode: 400,
        data: { error: expect.stringContaining("ZIP") },
      });
    }
  });

  it("buildCardsSimplifiedCsvBuffer n’inclut que les colonnes maquette", () => {
    const buf = buildCardsSimplifiedCsvBuffer([
      {
        "N°": 1,
        email: "x@y.com",
        first_name: "A",
        last_name: "B",
        mobile: "123",
        poste: "P",
        Direction: "D",
      },
    ]);
    const text = buf.toString("utf8").replace(/^\uFEFF/, "");
    const first = text.split("\n")[0];
    expect(first.split(";")).toEqual([...CARD_CSV_HEADERS]);
    expect(text).toContain("x@y.com");
    expect(text).not.toMatch(/id|company|uuid/i);
  });

  it("buildDepartmentsCsvBuffer et buildJobTitlesCsvBuffer", () => {
    const d = buildDepartmentsCsvBuffer([{ label_fr: "A", label_en: "B" }]).toString("utf8");
    expect(d).toContain("label_fr");
    expect(d).toContain("A");
    const j = buildJobTitlesCsvBuffer([{ label_fr: "C", label_en: "D" }]).toString("utf8");
    expect(j).toContain("C");
  });
});
