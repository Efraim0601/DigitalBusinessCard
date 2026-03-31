import { describe, expect, it } from "vitest";
import { fmtMs, nowStamp, percentile } from "../../scripts/lib/perf-bench-stats.mjs";

describe("scripts/lib/perf-bench-stats", () => {
  it("percentile sur liste vide retourne null", () => {
    expect(percentile([], 50)).toBeNull();
  });

  it("percentile p50 sur deux valeurs interpole", () => {
    expect(percentile([10, 20], 50)).toBe(15);
  });

  it("percentile sur une seule valeur", () => {
    expect(percentile([42], 99)).toBe(42);
  });

  it("fmtMs gère null et NaN", () => {
    expect(fmtMs(null)).toBe("n/a");
    expect(fmtMs(Number.NaN)).toBe("n/a");
    expect(fmtMs(1.234)).toBe("1.23ms");
  });

  it("nowStamp formate en heure locale", () => {
    const d = new Date(2026, 2, 30, 8, 5, 9);
    expect(nowStamp(d)).toBe(
      `2026-03-30_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`
    );
  });
});
