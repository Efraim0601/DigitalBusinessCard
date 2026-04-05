import {
  getConfiguredAdminCredentials,
  issueAdminSession,
  requireAdmin,
  validateAdminCredentials,
} from "../../../utils/admin-auth";
import { getAdminLoginRow, upsertAdminLoginRow } from "../../../utils/admin-credentials-db";
import { hashAdminPassword } from "../../../utils/admin-password-hash";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody<{
    currentPassword?: string;
    newEmail?: string;
    newPassword?: string;
  }>(event);

  const currentPassword = body?.currentPassword ?? "";
  const newEmail = typeof body?.newEmail === "string" ? body.newEmail.trim() : "";
  const newPassword = body?.newPassword;

  if (!currentPassword) {
    setResponseStatus(event, 400);
    return { error: "currentPassword is required" };
  }
  if (!newEmail && (newPassword === undefined || newPassword === null || String(newPassword) === "")) {
    setResponseStatus(event, 400);
    return { error: "newEmail or newPassword is required" };
  }

  const row = await getAdminLoginRow();
  const config = getConfiguredAdminCredentials(event);
  const loginEmail = (row?.email?.trim() || config.email).trim();
  if (!loginEmail) {
    setResponseStatus(event, 500);
    return { error: "Admin not configured" };
  }

  if (!(await validateAdminCredentials(event, loginEmail, currentPassword))) {
    setResponseStatus(event, 401);
    return { error: "Invalid current password" };
  }

  const nextEmail = (newEmail || loginEmail).trim();

  let nextHash: string;
  if (newPassword !== undefined && newPassword !== null && String(newPassword).length > 0) {
    nextHash = hashAdminPassword(String(newPassword));
  } else if (row?.password_hash) {
    nextHash = row.password_hash;
  } else {
    nextHash = hashAdminPassword(currentPassword);
  }

  await upsertAdminLoginRow(nextEmail, nextHash);
  issueAdminSession(event, nextEmail);
  return { success: true };
});
