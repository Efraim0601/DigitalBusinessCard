import { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { preflightCheck, runScenario, timedRequest } from "../../scripts/perf-bench.mjs";

/**
 * Minimal unit tests for the perf script logic.
 * We avoid importing the module directly (it runs main()) and instead
 * validate the key behavior by executing it with controlled env and args.
 */

function runNodeScript(scriptPath: string, args: string[] = [], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

describe("scripts/perf-bench.mjs", () => {
  it("timedRequest returns response metadata", async () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2]).buffer),
    }));
    const out = await timedRequest("http://example.test", { timeoutMs: 1000 });
    expect(out).toMatchObject({ ok: true, status: 204, bytes: 2 });
    vi.stubGlobal("fetch", originalFetch);
  });

  it("runScenario aggregates successes and failures", async () => {
    const originalFetch = globalThis.fetch;
    let count = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
      count += 1;
      if (count % 2 === 0) throw new Error("network");
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(8),
      };
    }));
    const r = await runScenario({
      name: "scenario",
      url: "http://example.test",
      total: 4,
      concurrency: 2,
      warmup: 0,
      timeoutMs: 1000,
    });
    expect(r.stats.okCount + r.stats.errCount).toBe(4);
    expect(r.topStatuses.length).toBeGreaterThan(0);
    vi.stubGlobal("fetch", originalFetch);
  });

  it("preflightCheck retries before returning failure", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
      calls += 1;
      if (calls === 1) throw new Error("down");
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    }));
    const out = await preflightCheck(["http://example.test"], { timeoutMs: 1000, attempts: 2 });
    expect(out.ok).toBe(true);
    vi.stubGlobal("fetch", originalFetch);
  });

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

