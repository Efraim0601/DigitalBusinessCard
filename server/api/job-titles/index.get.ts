import { query } from "../../utils/db";

export default defineEventHandler(async () => {
  const { rows } = await query<{
    id: string;
    label_fr: string;
    label_en: string;
    created_at: string;
  }>(
    `SELECT id, label_fr, label_en, created_at FROM job_titles ORDER BY label_fr ASC`
  );
  return rows;
});
