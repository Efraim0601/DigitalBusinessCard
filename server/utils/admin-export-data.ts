import type { AdminDataCard } from "./admin-data-types";
import { query } from "./db";
import type { AdminExportRows } from "./admin-spreadsheet";

export async function loadAdminExportRows(): Promise<AdminExportRows> {
  const { rows: departments } = await query<{ id: string; label_fr: string; label_en: string }>(
    `SELECT id, label_fr, label_en FROM departments ORDER BY label_fr ASC NULLS LAST, label_en ASC`
  );
  const { rows: job_titles } = await query<{ id: string; label_fr: string; label_en: string }>(
    `SELECT id, label_fr, label_en FROM job_titles ORDER BY label_fr ASC NULLS LAST, label_en ASC`
  );

  let cards: AdminDataCard[];
  try {
    const { rows } = await query<AdminDataCard & { id: string }>(
      `
      SELECT id, email, first_name, last_name, company, title, phone, fax, mobile, department_id, job_title_id
      FROM cards
      ORDER BY lower(email)
    `
    );
    cards = rows.map((r) => ({
      id: r.id,
      email: r.email,
      first_name: r.first_name,
      last_name: r.last_name,
      company: r.company,
      title: r.title,
      phone: r.phone,
      fax: r.fax,
      mobile: r.mobile,
      department_id: r.department_id ?? null,
      job_title_id: r.job_title_id ?? null,
    }));
  } catch {
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
      ORDER BY lower(email)
    `
    );
    cards = rows.map((r) => ({
      ...r,
      department_id: null,
      job_title_id: null,
    }));
  }

  return { departments, job_titles, cards };
}
