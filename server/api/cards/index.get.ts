import { query } from "../../utils/db";

const cardWithJoinsFields = `
  c.id, c.email, c.first_name, c.last_name, c.company, c.title, c.phone, c.fax, c.mobile,
  c.department_id, c.job_title_id,
  c.created_at, c.updated_at,
  d.label_fr AS department_label_fr, d.label_en AS department_label_en,
  j.label_fr AS job_title_label_fr, j.label_en AS job_title_label_en
`;

function mapRowToCard(r: any) {
  return {
    id: r.id,
    email: r.email,
    first_name: r.first_name,
    last_name: r.last_name,
    company: r.company,
    title: r.title,
    phone: r.phone,
    fax: r.fax,
    mobile: r.mobile,
    department_id: r.department_id ?? null,
    job_title_id: r.job_title_id ?? null,
    department:
      r.department_id && (r.department_label_fr != null || r.department_label_en != null)
        ? { label_fr: r.department_label_fr, label_en: r.department_label_en }
        : null,
    job_title:
      r.job_title_id && (r.job_title_label_fr != null || r.job_title_label_en != null)
        ? { label_fr: r.job_title_label_fr, label_en: r.job_title_label_en }
        : null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

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
