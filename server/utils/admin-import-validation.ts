/** Limites et validations pour l’import admin (fichiers et cellules). */

export const MAX_ADMIN_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_LABEL_LENGTH = 500;
export const MAX_NAME_LENGTH = 200;
export const MAX_EMAIL_LENGTH = 320;

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidEmail(email: string): boolean {
  const t = email.trim();
  if (!t || t.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_RE.test(t);
}

export function sanitizeCell(s: string | null | undefined, maxLen: number): string {
  if (s == null) return "";
  let o = String(s).replace(/\0/g, "").trim();
  if (o.length > maxLen) o = o.slice(0, maxLen);
  return o;
}
