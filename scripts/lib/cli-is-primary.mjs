import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** True quand ce fichier est lancé directement avec `node script.mjs`. */
export function isScriptPrimary(importMetaUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(resolve(entry)).href === importMetaUrl;
  } catch {
    return false;
  }
}
