import { afterEach, describe, expect, it, vi } from "vitest";

describe("scripts/perf-bench.mjs main export", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("execute runPerfBenchMain avec fetch mocke", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(16),
    });
    vi.stubGlobal("fetch", fetchMock);

    const savedArgv = [...process.argv];
    process.argv = [
      process.execPath,
      "scripts/perf-bench.mjs",
      "--skipPreflight",
      "--runs",
      "0",
      "--outputDir",
      "perf-reports-test",
      "--timeoutMs",
      "5",
    ];

    const mod = await import("../../scripts/perf-bench.mjs");
    await expect(mod.runPerfBenchMain()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalled();

    process.argv = savedArgv;
  }, 20000);
});
