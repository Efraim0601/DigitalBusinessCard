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
  const limit = Number(q.limit ?? 50);
  const offset = Number(q.offset ?? 0);

  try {
    const { rows } = await query(
      `
      SELECT ${cardWithJoinsFields}
      FROM cards c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN job_titles j ON c.job_title_id = j.id
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset]
    );
    return rows.map(mapRowToCard);
  } catch {
    const { rows } = await query(
      `SELECT id, email, first_name, last_name, company, title, phone, fax, mobile, created_at, updated_at
       FROM cards ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows.map((r: any) => ({
      ...mapRowToCard(r),
      department_id: null,
      job_title_id: null,
      department: null,
      job_title: null,
    }));
  }
});
