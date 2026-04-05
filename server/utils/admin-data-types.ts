/** Bundle exporté / importé (cartes + directions + titres). */
export const ADMIN_DATA_FORMAT_VERSION = 1;

export type AdminDataDepartment = { id: string; label_fr: string; label_en: string };
export type AdminDataJobTitle = { id: string; label_fr: string; label_en: string };
export type AdminDataCard = {
  id?: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  title?: string | null;
  phone?: string | null;
  fax?: string | null;
  mobile?: string | null;
  department_id?: string | null;
  job_title_id?: string | null;
};

export type AdminDataBundle = {
  formatVersion: number;
  exportedAt: string;
  departments: AdminDataDepartment[];
  job_titles: AdminDataJobTitle[];
  cards: AdminDataCard[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

export const MAX_IMPORT_DEPARTMENTS = 5000;
export const MAX_IMPORT_JOB_TITLES = 5000;
export const MAX_IMPORT_CARDS = 20000;
