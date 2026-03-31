import { dirname } from "node:path";

/**
 * @param {{ pdfPath: string, outPath: string, pdf: Function, writeFile: Function, mkdir: Function }} deps
 */
export async function generateCardBackgroundToFile(deps) {
  const { pdfPath, outPath, pdf, writeFile, mkdir } = deps;
  const doc = await pdf(pdfPath, { scale: 2 });
  const firstPage = await doc.getPage(1);
  if (!firstPage) throw new Error("Aucune page dans le PDF");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, firstPage);
}
