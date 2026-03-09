import { query } from "../../utils/db";

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
    }>(
      `
      SELECT id, email, first_name, last_name, company, title, phone, fax, mobile
      FROM cards
      WHERE lower(email) = lower($1)
      LIMIT 1
    `,
      [email]
    );

    if (!rows.length) {
      setResponseStatus(event, 404);
      return { error: "Card not found" };
    }

    return rows[0];
  }

  const q = getQuery(event);
  const limit = Number(q.limit ?? 50);
  const offset = Number(q.offset ?? 0);

  const { rows } = await query(
    `
    SELECT id, email, first_name, last_name, company, title, phone, fax, mobile, created_at, updated_at
    FROM cards
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `,
    [limit, offset]
  );

  return rows;
});

