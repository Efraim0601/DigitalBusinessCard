import { describe, expect, it } from "vitest";
import { parseArgs } from "../../scripts/lib/perf-bench-args.mjs";

describe("scripts/lib/perf-bench-args parseArgs", () => {
  it("lit les couples --clé valeur et les drapeaux booléens", () => {
    expect(
      parseArgs(["node", "perf-bench.mjs", "--base", "http://localhost:8766", "--runs", "3", "--json"])
    ).toEqual({ base: "http://localhost:8766", runs: "3", json: true });
  });

  it("retourne un objet vide sans options", () => {
    expect(parseArgs(["node", "perf-bench.mjs"])).toEqual({});
  });
});
