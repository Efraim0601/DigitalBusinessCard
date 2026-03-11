import { query } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    setResponseStatus(event, 400);
    return { error: "id is required" };
  }

  const body = await readBody<{
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

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, column] of Object.entries({
    first_name: "first_name",
    last_name: "last_name",
    company: "company",
    title: "title",
    phone: "phone",
    fax: "fax",
    mobile: "mobile",
    department_id: "department_id",
    job_title_id: "job_title_id",
  })) {
    if (body[key as keyof typeof body] !== undefined) {
      fields.push(`${column} = $${idx}`);
      // @ts-expect-error index access
      values.push(body[key]);
      idx += 1;
    }
  }

  if (!fields.length) {
    return { error: "nothing to update" };
  }

  values.push(id);

  const { rows } = await query(
    `
    UPDATE cards
    SET ${fields.join(", ")}, updated_at = now()
    WHERE id = $${idx}
    RETURNING id, email, first_name, last_name, company, title, phone, fax, mobile, department_id, job_title_id, created_at, updated_at
  `,
    values
  );

  if (!rows.length) {
    setResponseStatus(event, 404);
    return { error: "Card not found" };
  }

  return rows[0];
});

