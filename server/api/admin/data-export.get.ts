import { requireAdmin } from "../../utils/admin-auth";
import { loadAdminExportRows } from "../../utils/admin-export-data";
import { buildCsvZipBuffer, buildXlsxBuffer } from "../../utils/admin-spreadsheet";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const format = String(getQuery(event).format || "xlsx").toLowerCase();
  const data = await loadAdminExportRows();

  if (format === "csv" || format === "zip") {
    const buf = await buildCsvZipBuffer(data);
    setHeader(event, "Content-Type", "application/zip");
    setHeader(event, "Content-Disposition", 'attachment; filename="vcard-export-csv.zip"');
    return buf;
  }

  const buf = buildXlsxBuffer(data);
  setHeader(
    event,
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  setHeader(event, "Content-Disposition", 'attachment; filename="vcard-export.xlsx"');
  return buf;
});
