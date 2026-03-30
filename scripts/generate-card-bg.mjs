#!/usr/bin/env node
/**
 * Génère public/carte-digitale-bg.png à partir de app/assets/Carte_digitale 1.pdf
 * (première page). À lancer une fois : node scripts/generate-card-bg.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pdf } from "pdf-to-img";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pdfPath = join(root, "app", "assets", "Carte_digitale 1.pdf");
const outPath = join(root, "public", "carte-digitale-bg.png");

try {
  const doc = await pdf(pdfPath, { scale: 2 });
  const firstPage = await doc.getPage(1);
  if (!firstPage) throw new Error("Aucune page dans le PDF");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, firstPage);
  console.log("OK: public/carte-digitale-bg.png généré.");
} catch (e) {
  console.error("Erreur:", e?.message || String(e));
  process.exit(1);
}
