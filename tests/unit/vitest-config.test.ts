import { describe, expect, it } from "vitest";
import config from "../../vitest.config";

describe("vitest.config.ts", () => {
  it("configure les alias principaux", () => {
    const alias = (config.resolve as { alias: Record<string, string> }).alias;
    expect(alias["~"]).toContain("/app");
    expect(alias["@"]).toContain("/app");
    expect(alias["#ui/utils"]).toContain("tests/shims/nuxt-ui-utils.ts");
    expect(alias["#imports"]).toContain("tests/shims/nuxt-imports.ts");
  });

  it("configure la couverture avec les dossiers attendus", () => {
    const coverage = config.test?.coverage;
    expect(coverage?.provider).toBe("v8");
    expect(coverage?.reporter).toContain("lcov");
    expect(coverage?.include).toContain("app/**/*.{ts,vue}");
    expect(coverage?.include).toContain("server/**/*.ts");
    expect(coverage?.include).toContain("scripts/**/*.mjs");
    expect(coverage?.include).toContain("vitest.config.ts");
  });
});
