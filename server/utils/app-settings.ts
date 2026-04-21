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

export async function getAppSettings(): Promise<AppSettings> {
  try {
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
