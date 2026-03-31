import { afterEach, describe, expect, it, vi } from "vitest";

describe("scripts/generate-card-bg.mjs CLI main block", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("exécute la branche catch et process.exit(1) en erreur", async () => {
    vi.doMock("../../scripts/lib/cli-is-primary.mjs", () => ({
      isScriptPrimary: () => true,
    }));
    vi.doMock("pdf-to-img", () => ({
      pdf: vi.fn().mockRejectedValue(new Error("pdf failed")),
    }));

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(import("../../scripts/generate-card-bg.mjs")).rejects.toThrow("exit:1");
    expect(errSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
