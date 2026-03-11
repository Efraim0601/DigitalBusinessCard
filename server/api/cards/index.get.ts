import { query } from "../../utils/db";

const cardWithJoinsFields = `
  c.id, c.email, c.first_name, c.last_name, c.company, c.title, c.phone, c.fax, c.mobile,
  c.department_id, c.job_title_id,
  c.created_at, c.updated_at,
  d.label_fr AS department_label_fr, d.label_en AS department_label_en,
  j.label_fr AS job_title_label_fr, j.label_en AS job_title_label_en
`;

export default defineEventHandler(async (event) => {
  const email = getQuery(event).email as string | undefined;

  if (email) {
    const { rows } = await query<{
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      company: string | null;
      title: string | null;
      phone: string | null;
      fax: string | null;
      mobile: string | null;
      department_id: string | null;
      job_title_id: string | null;
      department_label_fr: string | null;
      department_label_en: string | null;
      job_title_label_fr: string | null;
      job_title_label_en: string | null;
    }>(
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

    if (!rows.length) {
      setResponseStatus(event, 404);
      return { error: "Card not found" };
    }

    const r = rows[0];
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
      department_id: r.department_id,
      job_title_id: r.job_title_id,
      department: r.department_id
        ? { label_fr: r.department_label_fr, label_en: r.department_label_en }
        : null,
      job_title: r.job_title_id
        ? { label_fr: r.job_title_label_fr, label_en: r.job_title_label_en }
        : null,
    };
  }

  const q = getQuery(event);
  const limit = Number(q.limit ?? 50);
  const offset = Number(q.offset ?? 0);

  const { rows } = await query<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    company: string | null;
    title: string | null;
    phone: string | null;
    fax: string | null;
    mobile: string | null;
    department_id: string | null;
    job_title_id: string | null;
    department_label_fr: string | null;
    department_label_en: string | null;
    job_title_label_fr: string | null;
    job_title_label_en: string | null;
    created_at: string;
    updated_at: string;
  }>(
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

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    first_name: r.first_name,
    last_name: r.last_name,
    company: r.company,
    title: r.title,
    phone: r.phone,
    fax: r.fax,
    mobile: r.mobile,
    department_id: r.department_id,
    job_title_id: r.job_title_id,
    department: r.department_id
      ? { label_fr: r.department_label_fr, label_en: r.department_label_en }
      : null,
    job_title: r.job_title_id
      ? { label_fr: r.job_title_label_fr, label_en: r.job_title_label_en }
      : null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
});

