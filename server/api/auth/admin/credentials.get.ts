import { getConfiguredAdminCredentials, requireAdmin } from "../../../utils/admin-auth";
import { getAdminLoginRow } from "../../../utils/admin-credentials-db";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const row = await getAdminLoginRow();
  const config = getConfiguredAdminCredentials(event);
  return {
    email: row?.email?.trim() || config.email || "",
    storedInDatabase: Boolean(row),
  };
});
