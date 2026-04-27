import { describe, expect, it } from "vitest";
import {
  buildCardsSimplifiedCsvBuffer,
  buildDepartmentsCsvBuffer,
  buildJobTitlesCsvBuffer,
  CARD_CSV_HEADERS,
  parseScopedImportBuffer,
} from "../../server/utils/admin-spreadsheet";

describe("admin-spreadsheet (import/export par scope)", () => {
  it("parseScopedImportBuffer lit le CSV cartes et mappe les colonnes", () => {
    const csv = Buffer.from(
      `${CARD_CSV_HEADERS.join(";")}\n1;u@example.com;Jane;Doe;6 12 34 56;Chef;;;IT;;`,
      "utf8"
    );
    const parsed = parseScopedImportBuffer(csv, "test.csv", "cards");
    expect(parsed.scope).toBe("cards");
    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0]).toMatchObject({
      email: "u@example.com",
      first_name: "Jane",
      last_name: "Doe",
      posteLabel: "Chef",
      directionLabel: "IT",
    });
  });

  it("parseScopedImportBuffer lit les colonnes FR/EN pour direction et poste", () => {
    const csv = Buffer.from(
      `${CARD_CSV_HEADERS.join(";")}\n1;u@example.com;Jane;Doe;;Chef;Chef de service;Service Manager;IT;Direction Informatique;IT Department`,
      "utf8"
    );
    const parsed = parseScopedImportBuffer(csv, "test.csv", "cards");
    expect(parsed.scope).toBe("cards");
    expect(parsed.cards[0]).toMatchObject({
      email: "u@example.com",
      posteFr: "Chef de service",
      posteEn: "Service Manager",
      directionFr: "Direction Informatique",
      directionEn: "IT Department",
    });
  });

  it("parseScopedImportBuffer refuse ZIP", () => {
    expect(() => parseScopedImportBuffer(Buffer.from("x"), "bundle.zip", "cards")).toThrow();
  });

  it("parseScopedImportBuffer directions : paires label_fr / label_en", () => {
    const csv = Buffer.from("label_fr;label_en\nDirection A;Dept A\n", "utf8");
    const parsed = parseScopedImportBuffer(csv, "d.csv", "departments");
    expect(parsed.scope).toBe("departments");
    expect(parsed.departments).toEqual([{ label_fr: "Direction A", label_en: "Dept A" }]);
  });

  it("buildCardsSimplifiedCsvBuffer n’inclut que les colonnes maquette", () => {
    const buf = buildCardsSimplifiedCsvBuffer([
      {
        "N°": 1,
        email: "e@e.com",
        first_name: "A",
        last_name: "B",
        mobile: "111",
        poste: "P",
        poste_fr: "",
        poste_en: "",
        Direction: "D",
        direction_fr: "",
        direction_en: "",
      },
    ]);
    const text = buf.toString("utf8").replace(/^\uFEFF/, "");
    const first = text.split("\n")[0];
    expect(first.split(";")).toEqual([...CARD_CSV_HEADERS]);
  });

  it("buildDepartmentsCsvBuffer et buildJobTitlesCsvBuffer", () => {
    const d = buildDepartmentsCsvBuffer([{ label_fr: "FR", label_en: "EN" }]);
    expect(d.toString("utf8")).toContain("label_fr");
    expect(d.toString("utf8")).toContain("FR");
    const j = buildJobTitlesCsvBuffer([{ label_fr: "a", label_en: "b" }]);
    expect(j.toString("utf8")).toContain("a");
  });
});
