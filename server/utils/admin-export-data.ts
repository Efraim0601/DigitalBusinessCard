import type { AdminDataCard, AdminDataDepartment, AdminDataJobTitle } from "./admin-data-types";
import { query } from "./db";

/** Ancien bundle complet (non exposé par l’API actuelle). */
export type AdminExportRows = {
  departments: AdminDataDepartment[];
  job_titles: AdminDataJobTitle[];
  cards: AdminDataCard[];
};

/** Lignes export « cartes » : uniquement les colonnes métier (cf. modèle RH). */
export type CardSimplifiedExportRow = {
  "N°": number;
  email: string;
  first_name: string;
  last_name: string;
  mobile: string;
  poste: string;
  Direction: string;
};

export type DepartmentExportRow = { label_fr: string; label_en: string };
export type JobTitleExportRow = { label_fr: string; label_en: string };

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

export async function loadCardsSimplifiedExportRows(): Promise<CardSimplifiedExportRow[]> {
  try {
    const { rows } = await query<{
      email: string;
      first_name: string | null;
      last_name: string | null;
      mobile: string | null;
      title: string | null;
      jf: string | null;
      df: string | null;
    }>(
      `
      SELECT c.email, c.first_name, c.last_name, c.mobile, c.title,
             j.label_fr AS jf, d.label_fr AS df
      FROM cards c
      LEFT JOIN job_titles j ON c.job_title_id = j.id
      LEFT JOIN departments d ON c.department_id = d.id
      ORDER BY lower(c.email)
    `
    );
    return rows.map((r, i) => ({
      "N°": i + 1,
      email: r.email,
      first_name: r.first_name ?? "",
      last_name: r.last_name ?? "",
      mobile: r.mobile ?? "",
      poste: (r.jf && r.jf.trim()) || (r.title ?? "") || "",
      Direction: (r.df && r.df.trim()) || "",
    }));
  } catch {
    const { rows } = await query<{
      email: string;
      first_name: string | null;
      last_name: string | null;
      mobile: string | null;
      title: string | null;
    }>(
      `SELECT email, first_name, last_name, mobile, title FROM cards ORDER BY lower(email)`
    );
    return rows.map((r, i) => ({
      "N°": i + 1,
      email: r.email,
      first_name: r.first_name ?? "",
      last_name: r.last_name ?? "",
      mobile: r.mobile ?? "",
      poste: r.title ?? "",
      Direction: "",
    }));
  }
}

export async function loadDepartmentsExportRows(): Promise<DepartmentExportRow[]> {
  const { rows } = await query<{ label_fr: string; label_en: string }>(
    `SELECT label_fr, label_en FROM departments ORDER BY label_fr ASC NULLS LAST, label_en ASC`
  );
  return rows.map((r) => ({ label_fr: r.label_fr, label_en: r.label_en }));
}

export async function loadJobTitlesExportRows(): Promise<JobTitleExportRow[]> {
  const { rows } = await query<{ label_fr: string; label_en: string }>(
    `SELECT label_fr, label_en FROM job_titles ORDER BY label_fr ASC NULLS LAST, label_en ASC`
  );
  return rows.map((r) => ({ label_fr: r.label_fr, label_en: r.label_en }));
}
