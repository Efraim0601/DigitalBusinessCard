import { query } from "../../utils/db";
import { cardWithJoinsFields, mapRowToCard } from "../../utils/card-mapper";
import { requireAdmin } from "../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  const email = getQuery(event).email as string | undefined;

  if (email) {
    try {
      const { rows } = await query(
        `
        SELECT ${cardWithJoinsFields}
        FROM cards c
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN job_titles j ON c.job_title_id = j.id
        WHERE lower(c.email) = lower($1)
        LIMIT 1
      `,
        [email]
      );
      if (rows.length) {
        return mapRowToCard(rows[0]);
      }
    } catch {
      // Schéma sans department_id / job_title_id : requête simple
    }
    const { rows } = await query(
      `SELECT id, email, first_name, last_name, company, title, phone, fax, mobile
       FROM cards WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );
    if (!rows.length) {
      setResponseStatus(event, 404);
      return { error: "Card not found" };
    }
    return { ...mapRowToCard(rows[0]), department_id: null, job_title_id: null, department: null, job_title: null };
  }

  requireAdmin(event);

  const q = getQuery(event);
  const limit = Math.min(200, Math.max(1, Number(q.limit ?? 20)));
  const offset = Math.max(0, Number(q.offset ?? 0));
  const search = typeof q.q === "string" ? q.q.trim() : "";
  const searchLike = search ? `%${search}%` : null;

  try {
    const { rows: totalRows } = await query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM cards c
      WHERE ($1::text IS NULL)
         OR (c.email ILIKE $1 OR c.first_name ILIKE $1 OR c.last_name ILIKE $1)
    `,
      [searchLike]
    );
    const total = totalRows[0]?.total ?? 0;

    const { rows } = await query(
      `
      SELECT ${cardWithJoinsFields}
      FROM cards c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN job_titles j ON c.job_title_id = j.id
      WHERE ($3::text IS NULL)
         OR (c.email ILIKE $3 OR c.first_name ILIKE $3 OR c.last_name ILIKE $3)
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset, searchLike]
    );
    return { items: rows.map(mapRowToCard), total, limit, offset };
  } catch {
    const { rows: totalRows } = await query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM cards c
      WHERE ($1::text IS NULL)
         OR (c.email ILIKE $1 OR c.first_name ILIKE $1 OR c.last_name ILIKE $1)
    `,
      [searchLike]
    );
    const total = totalRows[0]?.total ?? 0;

    const { rows } = await query(
      `SELECT id, email, first_name, last_name, company, title, phone, fax, mobile, created_at, updated_at
       FROM cards
       WHERE ($3::text IS NULL)
          OR (email ILIKE $3 OR first_name ILIKE $3 OR last_name ILIKE $3)
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset, searchLike]
    );
    const items = rows.map((r: any) => ({
      ...mapRowToCard(r),
      department_id: null,
      job_title_id: null,
      department: null,
      job_title: null,
    }));
    return { items, total, limit, offset };
  }
});
