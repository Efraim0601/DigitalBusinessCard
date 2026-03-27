import { query } from "../../utils/db";
import { requireAdmin } from "../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody<{ label_fr: string; label_en: string }>(event);
  if (!body?.label_fr?.trim() || !body?.label_en?.trim()) {
    setResponseStatus(event, 400);
    return { error: "label_fr and label_en are required" };
  }

  try {
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
  } catch (e: any) {
    if (e?.code === "42P01" || e?.message?.includes("does not exist")) {
      setResponseStatus(event, 503);
      return {
        error: "Table 'departments' absente. Exécutez la migration : sql/migration_departments_job_titles.sql",
      };
    }
    throw e;
  }
});
