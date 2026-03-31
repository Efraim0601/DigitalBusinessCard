import type { Locale } from "~/locales/translations";
import {
  LOCALE_STORAGE_KEY,
  normalizeStoredLocale,
  translateWithFallback,
} from "~/utils/app-locale-core";

export function useAppLocale() {
  const locale = useState<Locale>("app-locale", () => "fr");
  const canUseStorage = () =>
    typeof globalThis !== "undefined" && typeof globalThis.localStorage !== "undefined";

  function setLocale(value: Locale) {
    locale.value = value;
    if (canUseStorage()) {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, value);
      } catch {
        /* navigateur privé / quota : conserver la locale en mémoire seulement */
      }
    }
  }

  function t(key: string, params?: Record<string, string>): string {
    return translateWithFallback(locale.value, key, params);
  }

  if (typeof globalThis !== "undefined") {
    try {
      const stored = normalizeStoredLocale(globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY));
      if (stored) locale.value = stored;
    } catch {
      /* lecture stockage impossible */
    }
  }

  return { locale, setLocale, t };
}
