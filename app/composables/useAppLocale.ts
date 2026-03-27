import type { Locale } from "~/locales/translations";
import { translations } from "~/locales/translations";

const STORAGE_KEY = "vcard-locale";

export function useAppLocale() {
  const locale = useState<Locale>("app-locale", () => "fr");

  function setLocale(value: Locale) {
    locale.value = value;
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {}
    }
  }

  function t(key: string, params?: Record<string, string>): string {
    const dict = translations[locale.value];
    let text = dict[key] ?? translations.fr[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
      });
    }
    return text;
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === "fr" || stored === "en") locale.value = stored;
    } catch {}
  }

  return { locale, setLocale, t };
}
