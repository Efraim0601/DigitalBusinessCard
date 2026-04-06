import { requireAdmin } from "../../utils/admin-auth";
import { parseBulkDeleteUuids } from "../../utils/admin-bulk-delete";
import { query } from "../../utils/db";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody<{ ids?: unknown }>(event);
  const parsed = parseBulkDeleteUuids(body);
  if (!parsed.ok) {
    setResponseStatus(event, parsed.statusCode);
    return { error: parsed.error };
  }

  const { rows } = await query<{ id: string }>(
    `DELETE FROM cards WHERE id = ANY($1::uuid[]) RETURNING id`,
    [parsed.ids]
  );
  return { success: true, deleted: rows.length };
});
