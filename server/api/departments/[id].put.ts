import { query } from "../../utils/db";
import { requireAdmin } from "../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    setResponseStatus(event, 400);
    return { error: "id is required" };
  }

  const body = await readBody<{ label_fr?: string; label_en?: string }>(event);
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (body?.label_fr !== undefined) {
    updates.push(`label_fr = $${idx}`);
    values.push(body.label_fr);
    idx += 1;
  }
  if (body?.label_en !== undefined) {
    updates.push(`label_en = $${idx}`);
    values.push(body.label_en);
    idx += 1;
  }

  if (!updates.length) {
    setResponseStatus(event, 400);
    return { error: "nothing to update" };
  }

  values.push(id);
  const { rows } = await query<{
    id: string;
    label_fr: string;
    label_en: string;
    created_at: string;
  }>(
    `UPDATE departments SET ${updates.join(", ")} WHERE id = $${idx}
     RETURNING id, label_fr, label_en, created_at`,
    values
  );
  if (!rows.length) {
    setResponseStatus(event, 404);
    return { error: "Department not found" };
  }
  return rows[0];
});
