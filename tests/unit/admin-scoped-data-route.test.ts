import type { H3Event } from "h3";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_DATA_IMPORT_SCOPES,
  adminDataScopeRequiredMessage,
  parseAdminDataImportScope,
  setAdminCsvDownloadHeaders,
} from "../../server/utils/admin-scoped-data-route";

describe("server/utils/admin-scoped-data-route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ADMIN_DATA_IMPORT_SCOPES liste les trois scopes", () => {
    expect(ADMIN_DATA_IMPORT_SCOPES).toEqual(["cards", "departments", "job_titles"]);
  });

  it("parseAdminDataImportScope accepte les trois scopes (casse / espaces)", () => {
    expect(parseAdminDataImportScope("cards")).toBe("cards");
    expect(parseAdminDataImportScope(" DEPARTMENTS ")).toBe("departments");
    expect(parseAdminDataImportScope("Job_Titles")).toBe("job_titles");
  });

  it("parseAdminDataImportScope refuse valeur inconnue ou vide", () => {
    expect(parseAdminDataImportScope("")).toBeNull();
    expect(parseAdminDataImportScope(undefined)).toBeNull();
    expect(parseAdminDataImportScope("all")).toBeNull();
  });

  it("parseAdminDataImportScope refuse un type non-string à l’exécution", () => {
    const parse = parseAdminDataImportScope as unknown as (raw: unknown) => ReturnType<
      typeof parseAdminDataImportScope
    >;
    expect(parse(42)).toBeNull();
    expect(parse({})).toBeNull();
  });

  it("adminDataScopeRequiredMessage retourne le texte attendu pour chaque endpoint", () => {
    expect(adminDataScopeRequiredMessage("data-import")).toBe(
      'Paramètre « scope » requis : cards, departments ou job_titles (ex. /api/admin/data-import?scope=cards).'
    );
    expect(adminDataScopeRequiredMessage("data-export")).toBe(
      'Paramètre « scope » requis : cards, departments ou job_titles (ex. /api/admin/data-export?scope=cards).'
    );
  });

  it("setAdminCsvDownloadHeaders appelle setHeader deux fois", () => {
    const setHeaderSpy = vi.spyOn(globalThis, "setHeader").mockImplementation(() => {});
    const event = {} as H3Event;
    setAdminCsvDownloadHeaders(event, "export.csv");
    expect(setHeaderSpy).toHaveBeenCalledTimes(2);
    expect(setHeaderSpy).toHaveBeenNthCalledWith(1, event, "Content-Type", "text/csv; charset=utf-8");
    expect(setHeaderSpy).toHaveBeenNthCalledWith(
      2,
      event,
      "Content-Disposition",
      'attachment; filename="export.csv"'
    );
  });
});
