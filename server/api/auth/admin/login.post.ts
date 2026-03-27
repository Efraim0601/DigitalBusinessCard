import { issueAdminSession, validateAdminCredentials } from "../../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event);
  const email = body?.email?.trim() || "";
  const password = body?.password || "";

  if (!email || !password) {
    setResponseStatus(event, 400);
    return { error: "email and password are required" };
  }

  if (!validateAdminCredentials(event, email, password)) {
    setResponseStatus(event, 401);
    return { error: "Invalid credentials" };
  }

  issueAdminSession(event, email);
  return { success: true };
});

