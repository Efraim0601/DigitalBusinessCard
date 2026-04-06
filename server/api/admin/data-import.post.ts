import { readMultipartFormData } from "h3";
import { requireAdmin } from "../../utils/admin-auth";
import { applyScopedImport } from "../../utils/admin-data-import-apply";
import { MAX_ADMIN_UPLOAD_BYTES } from "../../utils/admin-import-validation";
import {
  adminDataScopeRequiredMessage,
  parseAdminDataImportScope,
} from "../../utils/admin-scoped-data-route";
import { parseScopedImportBuffer } from "../../utils/admin-spreadsheet";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const scope = parseAdminDataImportScope(getQuery(event).scope as string | undefined);
  if (!scope) {
    setResponseStatus(event, 400);
    return { error: adminDataScopeRequiredMessage("data-import") };
  }

  const parts = await readMultipartFormData(event);
  const file = parts?.find((p) => p.name === "file" && p.filename && p.data && p.data.length > 0);
  if (!file?.data || !file.filename) {
    setResponseStatus(event, 400);
    return { error: "Fichier requis (multipart, champ « file »)." };
  }

  const buf = Buffer.from(file.data);
  if (buf.length > MAX_ADMIN_UPLOAD_BYTES) {
    setResponseStatus(event, 413);
    return { error: `Fichier trop volumineux (max ${MAX_ADMIN_UPLOAD_BYTES} octets).` };
  }

  const parsed = parseScopedImportBuffer(buf, file.filename, scope);
  return applyScopedImport(parsed);
});
