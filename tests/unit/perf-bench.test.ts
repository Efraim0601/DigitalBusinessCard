import { describe, expect, it } from "vitest";

/**
 * Minimal unit tests for the perf script logic.
 * We avoid importing the module directly (it runs main()) and instead
 * validate the key behavior by executing it with controlled env and args.
 */

function runNodeScript(scriptPath: string, args: string[] = [], env: Record<string, string> = {}) {
  const { spawnSync } = require("node:child_process");
  return spawnSync(process.execPath, [scriptPath, ...args], {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

describe("scripts/perf-bench.mjs", () => {
  it("fails fast when preflight cannot reach BASE_URL", () => {
    const res = runNodeScript(
      "scripts/perf-bench.mjs",
      ["--runs", "1", "--outputDir", "perf-reports-test"],
      { BASE_URL: "http://127.0.0.1:9", EMAIL: "demo@afrilandfirstbank.com", TIMEOUT_MS: "200" }
    );
    expect(res.status).toBe(2);
    expect(res.stdout + res.stderr).toContain("Preflight failed");
  });

  it("supports --skipPreflight for offline dry runs (still may fail later)", () => {
    const res = runNodeScript(
      "scripts/perf-bench.mjs",
      ["--runs", "1", "--outputDir", "perf-reports-test", "--skipPreflight"],
      { BASE_URL: "http://127.0.0.1:9", EMAIL: "demo@afrilandfirstbank.com", TIMEOUT_MS: "200" }
    );
    // It will likely fail during scenarios (exit code 0 is not expected here).
    expect([0, 1]).toContain(res.status);
  });
});

