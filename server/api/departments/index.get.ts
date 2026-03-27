import { query } from "../../utils/db";
import { requireAdmin } from "../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const { rows } = await query<{
    id: string;
    label_fr: string;
    label_en: string;
    created_at: string;
  }>(
    `SELECT id, label_fr, label_en, created_at FROM departments ORDER BY label_fr ASC`
  );
  return rows;
});
