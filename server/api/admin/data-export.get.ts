import { requireAdmin } from "../../utils/admin-auth";
import type { AdminImportScope } from "../../utils/admin-data-types";
import {
  loadCardsSimplifiedExportRows,
  loadDepartmentsExportRows,
  loadJobTitlesExportRows,
} from "../../utils/admin-export-data";
import {
  adminDataScopeRequiredMessage,
  parseAdminDataImportScope,
  setAdminCsvDownloadHeaders,
} from "../../utils/admin-scoped-data-route";
import {
  buildCardsSimplifiedCsvBuffer,
  buildDepartmentsCsvBuffer,
  buildJobTitlesCsvBuffer,
} from "../../utils/admin-spreadsheet";

type ExportRow =
  | Awaited<ReturnType<typeof loadCardsSimplifiedExportRows>>
  | Awaited<ReturnType<typeof loadDepartmentsExportRows>>
  | Awaited<ReturnType<typeof loadJobTitlesExportRows>>;

const SCOPED_CSV: Record<
  AdminImportScope,
  {
    load: () => Promise<ExportRow>;
    build: (rows: ExportRow) => Buffer;
    filename: string;
  }
> = {
  cards: {
    load: loadCardsSimplifiedExportRows,
    build: (rows) => buildCardsSimplifiedCsvBuffer(rows as Awaited<ReturnType<typeof loadCardsSimplifiedExportRows>>),
    filename: "cartes.csv",
  },
  departments: {
    load: loadDepartmentsExportRows,
    build: (rows) => buildDepartmentsCsvBuffer(rows as Awaited<ReturnType<typeof loadDepartmentsExportRows>>),
    filename: "directions.csv",
  },
  job_titles: {
    load: loadJobTitlesExportRows,
    build: (rows) => buildJobTitlesCsvBuffer(rows as Awaited<ReturnType<typeof loadJobTitlesExportRows>>),
    filename: "titres-postes.csv",
  },
};

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const scope = parseAdminDataImportScope(getQuery(event).scope as string | undefined);
  if (!scope) {
    setResponseStatus(event, 400);
    return { error: adminDataScopeRequiredMessage("data-export") };
  }

  const cfg = SCOPED_CSV[scope];
  const rows = await cfg.load();
  const buf = cfg.build(rows);
  setAdminCsvDownloadHeaders(event, cfg.filename);
  return buf;
});
