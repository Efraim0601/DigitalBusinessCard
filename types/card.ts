/**
 * Carte (aperçu / QR). `color` suit les tokens Nuxt UI (`primary`, `blue`, etc.).
 */
export interface Card {
  color: string;
  title?: string;
  fName: string;
  lName: string;
  email?: string;
  phone: string;
  fax?: string;
  mobile?: string;
  co?: string;
  /** Libellés FR/EN quand la carte est liée à un titre ou département géré (API) */
  department?: { label_fr: string; label_en: string };
  job_title?: { label_fr: string; label_en: string };
}
