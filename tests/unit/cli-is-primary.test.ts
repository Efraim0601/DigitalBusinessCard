import { afterEach, describe, expect, it } from "vitest";
import { isScriptPrimary } from "../../scripts/lib/cli-is-primary.mjs";

describe("scripts/lib/cli-is-primary", () => {
  const saved = [...process.argv];

  afterEach(() => {
    process.argv.length = 0;
    process.argv.push(...saved);
  });

  it("retourne false sans argv script", () => {
    process.argv = [process.execPath];
    expect(isScriptPrimary("file:///any")).toBe(false);
  });

  it("retourne true si argv[1] résout vers la même URL", async () => {
    const { pathToFileURL } = await import("node:url");
    const { resolve } = await import("node:path");
    const p = resolve("scripts/lib/cli-is-primary.mjs");
    process.argv = [process.execPath, p];
    expect(isScriptPrimary(pathToFileURL(p).href)).toBe(true);
  });
});
