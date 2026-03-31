import { describe, expect, it } from "vitest";
import { cardBgPaths } from "../../scripts/lib/generate-card-bg-paths.mjs";

describe("scripts/lib/generate-card-bg-paths", () => {
  it("résout pdf et png sous la racine du dépôt", () => {
    const { pdfPath, outPath } = cardBgPaths("/repo/root");
    expect(pdfPath).toMatch(/Carte_digitale 1\.pdf$/);
    expect(pdfPath).toContain("app");
    expect(pdfPath).toContain("assets");
    expect(outPath).toMatch(/carte-digitale-bg\.png$/);
    expect(outPath).toContain("public");
  });
});
