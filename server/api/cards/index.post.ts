import { query } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email: string;
    first_name?: string;
    last_name?: string;
    company?: string;
    title?: string;
    phone?: string;
    fax?: string;
    mobile?: string;
    department_id?: string | null;
    job_title_id?: string | null;
  }>(event);

  if (!body.email) {
    setResponseStatus(event, 400);
    return { error: "email is required" };
  }

  const params = [
    body.email,
    body.first_name ?? null,
    body.last_name ?? null,
    body.company ?? null,
    body.title ?? null,
    body.phone ?? null,
    body.fax ?? null,
    body.mobile ?? null,
    body.department_id ?? null,
    body.job_title_id ?? null,
  ];

  const { rows } = await query(
    `
    INSERT INTO cards (email, first_name, last_name, company, title, phone, fax, mobile, department_id, job_title_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (email) DO UPDATE
      SET first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          company = EXCLUDED.company,
          title = EXCLUDED.title,
          phone = EXCLUDED.phone,
          fax = EXCLUDED.fax,
          mobile = EXCLUDED.mobile,
          department_id = EXCLUDED.department_id,
          job_title_id = EXCLUDED.job_title_id,
          updated_at = now()
    RETURNING id, email, first_name, last_name, company, title, phone, fax, mobile, department_id, job_title_id, created_at, updated_at
  `,
    params
  );

  return rows[0];
});

