import { query } from "../../utils/db";
import { FIXED_FAX, FIXED_PHONE, formatGroupedNumber } from "../../utils/contact-constants";
import { requireAdmin } from "../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
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

  const fields: string[] = ["phone = $1", "fax = $2"];
  const values: unknown[] = [];
  values.push(FIXED_PHONE, FIXED_FAX);
  let idx = 3;

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
      values.push(key === "mobile" ? (formatGroupedNumber(body[key]) || null) : body[key]);
      idx += 1;
    }
  }

  // fields contains at least phone/fax fixed values to enforce uniform data.

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
    const fieldsBasic: string[] = ["phone = $1", "fax = $2"];
    const valuesBasic: unknown[] = [];
    valuesBasic.push(FIXED_PHONE, FIXED_FAX);
    let i = 3;
    for (const [key, column] of allEntries) {
      if (column === "department_id" || column === "job_title_id") continue;
      if (body[key as keyof typeof body] !== undefined) {
        fieldsBasic.push(`${column} = $${i}`);
        const val = body[key as keyof typeof body];
        valuesBasic.push(key === "mobile" ? (formatGroupedNumber(val as string | null | undefined) || null) : val);
        i += 1;
      }
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

