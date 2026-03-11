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

  const allEntries: [string, string][] = [
    ["first_name", "first_name"],
    ["last_name", "last_name"],
    ["company", "company"],
    ["title", "title"],
    ["phone", "phone"],
    ["fax", "fax"],
    ["mobile", "mobile"],
    ["department_id", "department_id"],
    ["job_title_id", "job_title_id"],
  ];

  for (const [key, column] of allEntries) {
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

  try {
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
  } catch {
    const fieldsBasic: string[] = [];
    const valuesBasic: unknown[] = [];
    let i = 1;
    for (const [key, column] of allEntries) {
      if (column === "department_id" || column === "job_title_id") continue;
      if (body[key as keyof typeof body] !== undefined) {
        fieldsBasic.push(`${column} = $${i}`);
        valuesBasic.push(body[key as keyof typeof body]);
        i += 1;
      }
    }
    if (!fieldsBasic.length) {
      setResponseStatus(event, 400);
      return { error: "nothing to update" };
    }
    valuesBasic.push(id);
    const { rows } = await query(
      `UPDATE cards SET ${fieldsBasic.join(", ")}, updated_at = now() WHERE id = $${i}
       RETURNING id, email, first_name, last_name, company, title, phone, fax, mobile, created_at, updated_at`,
      valuesBasic
    );
    if (!rows.length) {
      setResponseStatus(event, 404);
      return { error: "Card not found" };
    }
    const r = rows[0] as any;
    return { ...r, department_id: null, job_title_id: null };
  }
});

