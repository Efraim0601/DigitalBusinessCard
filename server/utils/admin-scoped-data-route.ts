import type { H3Event } from "h3";
import type { AdminImportScope } from "./admin-data-types";

export const ADMIN_DATA_IMPORT_SCOPES: readonly AdminImportScope[] = ["cards", "departments", "job_titles"];

export function parseAdminDataImportScope(raw: string | undefined): AdminImportScope | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  return ADMIN_DATA_IMPORT_SCOPES.includes(s as AdminImportScope) ? (s as AdminImportScope) : null;
}

/** Message 400 commun ; `endpoint` = suffixe route (ex. data-import, data-export). */
export function adminDataScopeRequiredMessage(endpoint: "data-import" | "data-export"): string {
  return `Paramètre « scope » requis : cards, departments ou job_titles (ex. /api/admin/${endpoint}?scope=cards).`;
}

export function setAdminCsvDownloadHeaders(event: H3Event, filename: string) {
  setHeader(event, "Content-Type", "text/csv; charset=utf-8");
  setHeader(event, "Content-Disposition", `attachment; filename="${filename}"`);
}
