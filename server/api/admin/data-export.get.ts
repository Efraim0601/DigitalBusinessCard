import { setResponseHeader } from "h3";
import { requireAdmin } from "../../utils/admin-auth";
import {
  loadCardsSimplifiedExportRows,
  loadDepartmentsExportRows,
  loadJobTitlesExportRows,
} from "../../utils/admin-export-data";
import type { AdminImportScope } from "../../utils/admin-data-types";
import {
  buildCardsSimplifiedCsvBuffer,
  buildDepartmentsCsvBuffer,
  buildJobTitlesCsvBuffer,
} from "../../utils/admin-spreadsheet";

const SCOPES: AdminImportScope[] = ["cards", "departments", "job_titles"];

function parseScope(raw: string | undefined): AdminImportScope | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  return SCOPES.includes(s as AdminImportScope) ? (s as AdminImportScope) : null;
}

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const scope = parseScope(getQuery(event).scope as string | undefined);
  if (!scope) {
    setResponseStatus(event, 400);
    return {
      error:
        "Paramètre « scope » requis : cards, departments ou job_titles (ex. /api/admin/data-export?scope=cards).",
    };
  }

  if (scope === "cards") {
    const rows = await loadCardsSimplifiedExportRows();
    const buf = buildCardsSimplifiedCsvBuffer(rows);
    setResponseHeader(event, "Content-Type", "text/csv; charset=utf-8");
    setResponseHeader(event, "Content-Disposition", 'attachment; filename="cartes.csv"');
    return buf;
  }

  if (scope === "departments") {
    const rows = await loadDepartmentsExportRows();
    const buf = buildDepartmentsCsvBuffer(rows);
    setResponseHeader(event, "Content-Type", "text/csv; charset=utf-8");
    setResponseHeader(event, "Content-Disposition", 'attachment; filename="directions.csv"');
    return buf;
  }

  const rows = await loadJobTitlesExportRows();
  const buf = buildJobTitlesCsvBuffer(rows);
  setResponseHeader(event, "Content-Type", "text/csv; charset=utf-8");
  setResponseHeader(event, "Content-Disposition", 'attachment; filename="titres-postes.csv"');
  return buf;
});
