import { query } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ label_fr: string; label_en: string }>(event);
  if (!body?.label_fr?.trim() || !body?.label_en?.trim()) {
    setResponseStatus(event, 400);
    return { error: "label_fr and label_en are required" };
  }

  const { rows } = await query<{
    id: string;
    label_fr: string;
    label_en: string;
    created_at: string;
  }>(
    `INSERT INTO departments (label_fr, label_en)
     VALUES ($1, $2)
     RETURNING id, label_fr, label_en, created_at`,
    [body.label_fr.trim(), body.label_en.trim()]
  );
  return rows[0];
});
