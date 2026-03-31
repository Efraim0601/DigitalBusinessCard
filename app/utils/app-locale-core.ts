import type { Locale } from "~/locales/translations";
import { translations } from "~/locales/translations";

export const LOCALE_STORAGE_KEY = "vcard-locale";

export function normalizeStoredLocale(stored: string | null | undefined): Locale | null {
  if (stored === "fr" || stored === "en") return stored;
  return null;
}

export function translateWithFallback(
  locale: Locale,
  key: string,
  params?: Record<string, string>
): string {
  const dict = translations[locale];
  let text = dict[key] ?? translations.fr[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replaceAll(`{${k}}`, v);
    });
  }
  return text;
}
