import { requireAdmin } from "../../utils/admin-auth";
import { isUuid } from "../../utils/admin-data-types";
import { query } from "../../utils/db";
import { invalidateLabelListCache } from "../../utils/label-list-cache";

const MAX_IDS = 500;

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody<{ ids?: unknown }>(event);
  const raw = Array.isArray(body?.ids) ? body.ids : [];
  const ids = raw.filter((x): x is string => typeof x === "string" && isUuid(x));
  if (!ids.length) {
    setResponseStatus(event, 400);
    return { error: "ids must be a non-empty array of UUIDs" };
  }
  if (ids.length > MAX_IDS) {
    setResponseStatus(event, 400);
    return { error: `Maximum ${MAX_IDS} ids per request` };
  }

  const { rows } = await query<{ id: string }>(
    `DELETE FROM job_titles WHERE id = ANY($1::uuid[]) RETURNING id`,
    [ids]
  );
  invalidateLabelListCache("job_titles");
  return { success: true, deleted: rows.length };
});
