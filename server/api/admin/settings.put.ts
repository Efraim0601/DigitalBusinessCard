import { requireAdmin } from "../../utils/admin-auth";
import { setAppSettings } from "../../utils/app-settings";
import { isValidTemplateId, type TemplateId } from "../../../types/template";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody<{
    allowUserTemplate?: unknown;
    defaultTemplate?: unknown;
  }>(event);

  const patch: { allowUserTemplate?: boolean; defaultTemplate?: TemplateId } = {};
  if (typeof body?.allowUserTemplate === "boolean") {
    patch.allowUserTemplate = body.allowUserTemplate;
  }
  if (isValidTemplateId(body?.defaultTemplate)) {
    patch.defaultTemplate = body.defaultTemplate;
  }

  return setAppSettings(patch);
});
