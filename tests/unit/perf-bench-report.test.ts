import { describe, expect, it } from "vitest";
import { renderMarkdownReport } from "../../scripts/lib/perf-bench-report.mjs";

describe("perf-bench-report", () => {
  it("includes header and scenario", () => {
    const meta = {
      generatedAt: "2026-01-01T00:00:00.000Z",
      node: "v22",
      baseUrl: "http://localhost:8766",
      email: "a@b.com",
      timeoutMs: 5000,
    };
    const row = {
      name: "S1",
      url: "http://x",
      total: 10,
      concurrency: 2,
      warmup: 1,
      durationMs: 100,
      stats: {
        avgMs: 10,
        p50Ms: 9,
        p90Ms: 15,
        p95Ms: 18,
        p99Ms: 20,
        p999Ms: 25,
        okCount: 10,
        errCount: 0,
        avgBytes: 100,
      },
      topStatuses: [[200, 10]],
      topErrors: [],
      sampleErrors: [] as never[],
    };
    const md = renderMarkdownReport(meta, [row]);
    expect(md).toContain("vcard Performance Report");
    expect(md).toContain("Afriland First Bank");
    expect(md).toContain("logo.png");
    expect(md).toContain("S1");
  });

  it("lists sample errors in markdown", () => {
    const meta = { generatedAt: "t", node: "n", baseUrl: "b", email: "e", timeoutMs: 1 };
    const row = {
      name: "E",
      url: "u",
      total: 1,
      concurrency: 1,
      warmup: 0,
      durationMs: 1,
      stats: {
        avgMs: 1,
        p50Ms: 1,
        p90Ms: 1,
        p95Ms: 1,
        p99Ms: 1,
        p999Ms: 1,
        okCount: 0,
        errCount: 1,
        avgBytes: 0,
      },
      topStatuses: [],
      topErrors: [],
      sampleErrors: [{ at: 0, status: 0, ms: 1, error: { name: "AbortError", message: "aborted" } }],
    };
    expect(renderMarkdownReport(meta, [row])).toContain("AbortError");
  });
});
