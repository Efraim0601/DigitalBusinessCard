import { query } from "../../utils/db";
import { ensureTemplatesSchema, getAppSettings } from "../../utils/app-settings";
import { isValidTemplateId } from "../../../types/template";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string; template_id?: string }>(event);
  const email = (body?.email ?? "").trim();
  const templateId = body?.template_id;

  if (!email) {
    setResponseStatus(event, 400);
    return { error: "email is required" };
  }
  if (!isValidTemplateId(templateId)) {
    setResponseStatus(event, 400);
    return { error: "invalid template_id" };
  }

  const settings = await getAppSettings();
  if (!settings.allowUserTemplate) {
    setResponseStatus(event, 403);
    return { error: "user template selection is disabled" };
  }

  await ensureTemplatesSchema();
  const { rows } = await query<{ id: string; template_id: string | null }>(
    `UPDATE cards
     SET template_id = $1, updated_at = now()
     WHERE lower(email) = lower($2)
     RETURNING id, template_id`,
    [templateId, email]
  );
  if (!rows.length) {
    setResponseStatus(event, 404);
    return { error: "Card not found" };
  }
  return { success: true, template_id: rows[0]!.template_id };
});
