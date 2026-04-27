import { query } from "./db";
import { DEFAULT_TEMPLATE_ID, isValidTemplateId, type TemplateId } from "../../types/template";

export type AppSettings = {
  allowUserTemplate: boolean;
  defaultTemplate: TemplateId;
};

const DEFAULTS: AppSettings = {
  allowUserTemplate: false,
  defaultTemplate: DEFAULT_TEMPLATE_ID,
};

let schemaEnsured: Promise<void> | null = null;

/** Idempotent : crée table `app_settings` et colonne `cards.template_id` si manquantes.
 *  Permet à la feature templates de fonctionner même si la migration SQL n'a pas
 *  été exécutée (utile en déploiement où l'étape psql peut être oubliée). */
export function ensureTemplatesSchema(): Promise<void> {
  if (!schemaEnsured) {
    schemaEnsured = (async () => {
      try {
        await query(
          `CREATE TABLE IF NOT EXISTS app_settings (
             key TEXT PRIMARY KEY,
             value TEXT NOT NULL,
             updated_at TIMESTAMPTZ DEFAULT now()
           )`
        );
        await query(`ALTER TABLE cards ADD COLUMN IF NOT EXISTS template_id TEXT`);
      } catch (e) {
        schemaEnsured = null; // re-essayer à la prochaine lecture/écriture
        throw e;
      }
    })();
  }
  return schemaEnsured;
}

export async function getAppSettings(): Promise<AppSettings> {
  try {
    await ensureTemplatesSchema();
    const { rows } = await query<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings WHERE key IN ('allow_user_template', 'default_template')`
    );
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const rawDefault = map.get("default_template");
    return {
      allowUserTemplate: map.get("allow_user_template") === "true",
      defaultTemplate: isValidTemplateId(rawDefault) ? rawDefault : DEFAULTS.defaultTemplate,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  await ensureTemplatesSchema();
  const entries: [string, string][] = [];
  if (typeof patch.allowUserTemplate === "boolean") {
    entries.push(["allow_user_template", patch.allowUserTemplate ? "true" : "false"]);
  }
  if (patch.defaultTemplate && isValidTemplateId(patch.defaultTemplate)) {
    entries.push(["default_template", patch.defaultTemplate]);
  }
  for (const [key, value] of entries) {
    await query(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, value]
    );
  }
  return getAppSettings();
}
