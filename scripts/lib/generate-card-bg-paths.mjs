import { join } from "node:path";

/** Chemins d’entrée / sortie relatifs à la racine du dépôt. */
export function cardBgPaths(repoRoot) {
  return {
    pdfPath: join(repoRoot, "app", "assets", "Carte_digitale 1.pdf"),
    outPath: join(repoRoot, "public", "carte-digitale-bg.png"),
  };
}
