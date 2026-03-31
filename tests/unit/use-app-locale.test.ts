import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppLocale } from "../../app/composables/useAppLocale";
import { LOCALE_STORAGE_KEY } from "../../app/utils/app-locale-core";

describe("app/composables/useAppLocale.ts", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads stored locale when available", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => "en"),
      setItem: vi.fn(),
    });
    const { locale } = useAppLocale();
    expect(locale.value).toBe("en");
  });

  it("writes locale to storage when setLocale is called", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem,
    });
    const { locale, setLocale } = useAppLocale();
    setLocale("en");
    expect(locale.value).toBe("en");
    expect(setItem).toHaveBeenCalledWith(LOCALE_STORAGE_KEY, "en");
  });

  it("keeps working when storage access throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => {
        throw new Error("denied");
      }),
      setItem: vi.fn(() => {
        throw new Error("denied");
      }),
    });
    const { locale, setLocale } = useAppLocale();
    expect(locale.value).toBe("fr");
    expect(() => setLocale("en")).not.toThrow();
    expect(locale.value).toBe("en");
  });
});
