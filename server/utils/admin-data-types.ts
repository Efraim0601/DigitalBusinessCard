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

/** Ligne fichier cartes (poste / direction = libellés à résoudre).
 *
 * Trois manières (par ordre de priorité) de lier une direction ou un poste :
 *   1. `*Fr` + `*En` : upsert dans la table correspondante (creation/maj automatique).
 *   2. `*Fr` ou `*En` seul : recherche existante par libellé FR ou EN.
 *   3. `*Label` (ancien) : recherche existante par libellé FR ou EN (rétrocompatibilité).
 */
export type AdminSimplifiedCardInput = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
  posteLabel: string;
  posteFr?: string | null;
  posteEn?: string | null;
  directionLabel: string;
  directionFr?: string | null;
  directionEn?: string | null;
};

export type AdminLabelPairInput = { label_fr: string; label_en: string };

export type ParsedScopedImport =
  | { scope: "cards"; cards: AdminSimplifiedCardInput[] }
  | { scope: "departments"; departments: AdminLabelPairInput[] }
  | { scope: "job_titles"; job_titles: AdminLabelPairInput[] };

export type AdminImportScope = "cards" | "departments" | "job_titles";

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
