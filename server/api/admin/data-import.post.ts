import { readMultipartFormData } from "h3";
import { requireAdmin } from "../../utils/admin-auth";
import { applyAdminDataImport } from "../../utils/admin-data-import-apply";
import { parseAdminImportBuffer } from "../../utils/admin-spreadsheet";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const parts = await readMultipartFormData(event);
  const file = parts?.find((p) => p.name === "file" && p.filename && p.data && p.data.length > 0);
  if (!file?.data || !file.filename) {
    setResponseStatus(event, 400);
    return { error: "Fichier requis (multipart, champ « file »)." };
  }

  const buf = Buffer.from(file.data);
  const bundle = await parseAdminImportBuffer(buf, file.filename);
  return applyAdminDataImport(bundle);
});
