import { describe, expect, it, vi } from "vitest";
import { runGenerateCardBg } from "../../scripts/generate-card-bg.mjs";

describe("scripts/generate-card-bg.mjs runGenerateCardBg", () => {
  it("orchestre pdf / mkdir / writeFile", async () => {
    const pdf = vi.fn().mockResolvedValue({
      getPage: vi.fn().mockResolvedValue(Buffer.from("x")),
    });
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const mkdir = vi.fn().mockResolvedValue(undefined);
    await runGenerateCardBg({
      root: "/tmp/cardyo-repo-root",
      pdf,
      writeFile,
      mkdir,
    });
    expect(pdf).toHaveBeenCalled();
    expect(mkdir).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalled();
  });

  it("uses injectable generate runner for safer unit testing", async () => {
    const generate = vi.fn().mockResolvedValue(undefined);
    await runGenerateCardBg({
      root: "/tmp/repo",
      pdf: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      generate,
    });
    expect(generate).toHaveBeenCalledWith({
      pdfPath: "/tmp/repo/app/assets/Carte_digitale 1.pdf",
      outPath: "/tmp/repo/public/carte-digitale-bg.png",
      pdf: expect.any(Function),
      writeFile: expect.any(Function),
      mkdir: expect.any(Function),
    });
  });
});
