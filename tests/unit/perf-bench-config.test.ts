import { describe, expect, it } from "vitest";
import {
  buildPerfPreflightUrls,
  resolvePerfBenchCliOptions,
} from "../../scripts/lib/perf-bench-config.mjs";

describe("scripts/lib/perf-bench-config.mjs", () => {
  it("uses defaults when argv/env are empty", () => {
    const opts = resolvePerfBenchCliOptions(["node", "perf-bench.mjs"], {});
    expect(opts.baseUrl).toBe("http://localhost:8766");
    expect(opts.email).toBe("demo@afrilandfirstbank.com");
    expect(opts.timeoutMs).toBe(15000);
    expect(opts.runs).toBe(1);
    expect(opts.skipPreflight).toBe(false);
    expect(opts.preflightAttempts).toBe(3);
  });

  it("prefers CLI args over env values", () => {
    const opts = resolvePerfBenchCliOptions(
      [
        "node",
        "perf-bench.mjs",
        "--base",
        "http://api.local",
        "--email",
        "x@y.z",
        "--timeoutMs",
        "900",
        "--runs",
        "7",
        "--outputDir",
        "custom-out",
        "--skipPreflight",
        "--preflightAttempts",
        "5",
      ],
      {
        BASE_URL: "http://env.local",
        EMAIL: "env@env.local",
        TIMEOUT_MS: "1",
        SSR_RUNS: "2",
        OUTPUT_DIR: "env-out",
        SKIP_PREFLIGHT: "",
        PREFLIGHT_ATTEMPTS: "2",
      }
    );
    expect(opts).toMatchObject({
      baseUrl: "http://api.local",
      email: "x@y.z",
      timeoutMs: 900,
      runs: 7,
      outputDir: "custom-out",
      skipPreflight: true,
      preflightAttempts: 5,
    });
  });

  it("builds all preflight endpoints", () => {
    expect(buildPerfPreflightUrls("http://api.local", "a%40b.com")).toEqual([
      "http://api.local/api/cards?limit=1&offset=0",
      "http://api.local/api/departments",
      "http://api.local/api/job-titles",
      "http://api.local/?email=a%40b.com",
    ]);
  });
});
