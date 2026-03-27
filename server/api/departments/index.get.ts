import { query } from "../../utils/db";
import { requireAdmin } from "../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const q = getQuery(event);
  const limit = Math.min(200, Math.max(1, Number(q.limit ?? 20)));
  const offset = Math.max(0, Number(q.offset ?? 0));
  const search = typeof q.q === "string" ? q.q.trim() : "";
  const searchLike = search ? `%${search}%` : null;

  const { rows: totalRows } = await query<{ total: number }>(
    `
    SELECT COUNT(*)::int AS total
    FROM departments
    WHERE ($1::text IS NULL) OR (label_fr ILIKE $1 OR label_en ILIKE $1)
  `,
    [searchLike]
  );
  const total = totalRows[0]?.total ?? 0;

  const { rows } = await query<{
    id: string;
    label_fr: string;
    label_en: string;
    created_at: string;
  }>(
    `SELECT id, label_fr, label_en, created_at
     FROM departments
     WHERE ($3::text IS NULL) OR (label_fr ILIKE $3 OR label_en ILIKE $3)
     ORDER BY label_fr ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset, searchLike]
  );
  return { items: rows, total, limit, offset };
});
