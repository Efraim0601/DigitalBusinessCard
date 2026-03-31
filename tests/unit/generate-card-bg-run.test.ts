import { describe, expect, it, vi } from "vitest";
import { generateCardBackgroundToFile } from "../../scripts/lib/generate-card-bg-run.mjs";

describe("scripts/lib/generate-card-bg-run", () => {
  it("écrit la première page et crée le dossier cible", async () => {
    const pdf = vi.fn().mockResolvedValue({
      getPage: vi.fn().mockResolvedValue(Buffer.from("png-bytes")),
    });
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const mkdir = vi.fn().mockResolvedValue(undefined);
    await generateCardBackgroundToFile({
      pdfPath: "/in/a.pdf",
      outPath: "/out/dir/bg.png",
      pdf,
      writeFile,
      mkdir,
    });
    expect(pdf).toHaveBeenCalledWith("/in/a.pdf", { scale: 2 });
    expect(mkdir).toHaveBeenCalledWith("/out/dir", { recursive: true });
    expect(writeFile).toHaveBeenCalledWith("/out/dir/bg.png", expect.any(Buffer));
  });

  it("rejette si aucune page", async () => {
    const pdf = vi.fn().mockResolvedValue({
      getPage: vi.fn().mockResolvedValue(null),
    });
    await expect(
      generateCardBackgroundToFile({
        pdfPath: "/x.pdf",
        outPath: "/y.png",
        pdf,
        writeFile: vi.fn(),
        mkdir: vi.fn(),
      })
    ).rejects.toThrow("Aucune page");
  });
});
