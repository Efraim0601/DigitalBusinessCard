import { query } from "../../utils/db";
import { FIXED_FAX, FIXED_PHONE, formatGroupedNumber } from "../../utils/contact-constants";
import { requireAdmin } from "../../utils/admin-auth";

type UpdateBody = {
  first_name?: string;
  last_name?: string;
  company?: string;
  title?: string;
  phone?: string;
  fax?: string;
  mobile?: string;
  department_id?: string | null;
  job_title_id?: string | null;
};

function buildUpdateQuery(params: {
  id: string;
  body: UpdateBody;
  includeRelations: boolean;
}) {
  const { id, body, includeRelations } = params;

  const fields: string[] = ["phone = $1", "fax = $2"];
  const values: unknown[] = [FIXED_PHONE, FIXED_FAX];
  let idx = 3;

  const entries: [keyof UpdateBody, string][] = [
    ["first_name", "first_name"],
    ["last_name", "last_name"],
    ["company", "company"],
    ["title", "title"],
    ["mobile", "mobile"],
    ...(includeRelations ? ([
      ["department_id", "department_id"],
      ["job_title_id", "job_title_id"],
    ] as [keyof UpdateBody, string][]) : []),
  ];

  for (const [key, column] of entries) {
    if (body[key] !== undefined) {
      fields.push(`${column} = $${idx}`);
      const v = body[key];
      values.push(key === "mobile" ? (formatGroupedNumber(v as any) || null) : v);
      idx += 1;
    }
  }

  values.push(id);
  return { fields, values, whereIdx: idx };
}

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    setResponseStatus(event, 400);
    return { error: "id is required" };
  }

  const body = await readBody<UpdateBody>(event);

  try {
    const { fields, values, whereIdx } = buildUpdateQuery({ id, body, includeRelations: true });
    const { rows } = await query(
      `
      UPDATE cards
      SET ${fields.join(", ")}, updated_at = now()
      WHERE id = $${whereIdx}
      RETURNING id, email, first_name, last_name, company, title, phone, fax, mobile, department_id, job_title_id, template_id, created_at, updated_at
    `,
      values
    );
    if (!rows.length) {
      setResponseStatus(event, 404);
      return { error: "Card not found" };
    }
    return rows[0];
  } catch {
    const { fields, values, whereIdx } = buildUpdateQuery({ id, body, includeRelations: false });
    const { rows } = await query(
      `UPDATE cards SET ${fields.join(", ")}, updated_at = now() WHERE id = $${whereIdx}
       RETURNING id, email, first_name, last_name, company, title, phone, fax, mobile, created_at, updated_at`,
      values
    );
    if (!rows.length) {
      setResponseStatus(event, 404);
      return { error: "Card not found" };
    }
    const r = rows[0] as any;
    return { ...r, department_id: null, job_title_id: null, template_id: null };
  }
});

