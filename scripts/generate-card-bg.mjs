#!/usr/bin/env node
/**
 * Génère public/carte-digitale-bg.png à partir de app/assets/Carte_digitale 1.pdf
 * (première page). À lancer une fois : node scripts/generate-card-bg.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pdf } from "pdf-to-img";
import { cardBgPaths } from "./lib/generate-card-bg-paths.mjs";
import { generateCardBackgroundToFile } from "./lib/generate-card-bg-run.mjs";
import { isScriptPrimary } from "./lib/cli-is-primary.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

export async function runGenerateCardBg(deps) {
  const {
    root: repoRoot,
    pdf: pdfFn,
    writeFile: wf,
    mkdir: md,
    generate = generateCardBackgroundToFile,
  } = deps;
  const { pdfPath, outPath } = cardBgPaths(repoRoot);
  await generate({
    pdfPath,
    outPath,
    pdf: pdfFn,
    writeFile: wf,
    mkdir: md,
  });
}

if (isScriptPrimary(import.meta.url)) {
  try {
    await runGenerateCardBg({ root, pdf, writeFile, mkdir });
    console.log("OK: public/carte-digitale-bg.png généré.");
  } catch (e) {
    console.error("Erreur:", e?.message || String(e));
    process.exit(1);
  }
}
