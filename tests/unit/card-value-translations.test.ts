import { describe, expect, it } from "vitest";
import { translateCardDepartment, translateCardTitle } from "../../app/locales/card-value-translations";

describe("card-value-translations", () => {
  it("returns empty string for null/undefined/'undefined'", () => {
    expect(translateCardTitle(undefined, "fr")).toBe("");
    expect(translateCardTitle(null, "fr")).toBe("");
    expect(translateCardTitle("undefined", "fr")).toBe("");

    expect(translateCardDepartment(undefined, "fr")).toBe("");
    expect(translateCardDepartment(null, "fr")).toBe("");
    expect(translateCardDepartment("undefined", "fr")).toBe("");
  });

  it("does not translate when locale is not 'en'", () => {
    expect(translateCardTitle("Directeur", "fr")).toBe("Directeur");
    expect(translateCardDepartment("Informatique", "fr")).toBe("Informatique");
  });

  it("translates known values for locale 'en' (with normalization)", () => {
    expect(translateCardTitle("Ingénieur d'étude", "en")).toBe("Study Engineer");
    expect(translateCardTitle("  Ingénieur d'étude  ", "en")).toBe("Study Engineer");
    expect(translateCardTitle("Chef de Département", "en")).toBe("Department Head");

    expect(translateCardDepartment("Ressources Humaines", "en")).toBe("Human Resources");
    expect(translateCardDepartment("  Ressources   Humaines ", "en")).toBe("Human Resources");
    expect(translateCardDepartment("DSI", "en")).toBe("IT");
  });

  it("falls back to original if unknown value", () => {
    expect(translateCardTitle("Titre Inconnu", "en")).toBe("Titre Inconnu");
    expect(translateCardDepartment("Departement Inconnu", "en")).toBe("Departement Inconnu");
  });
});

