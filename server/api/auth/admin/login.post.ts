import { issueAdminSession, validateAdminCredentials } from "../../../utils/admin-auth";
import { createConcurrentLimiter } from "../../../utils/concurrent-limit";

const loginLimiter = createConcurrentLimiter(
  Math.max(1, Number(process.env.ADMIN_LOGIN_MAX_CONCURRENT || 20))
);

export default defineEventHandler(async (event) =>
  loginLimiter.run(async () => {
    const body = await readBody<{ email?: string; password?: string }>(event);
    const email = body?.email?.trim() || "";
    const password = body?.password || "";

    if (!email || !password) {
      setResponseStatus(event, 400);
      return { error: "email and password are required" };
    }

    if (!(await validateAdminCredentials(event, email, password))) {
      setResponseStatus(event, 401);
      return { error: "Invalid credentials" };
    }

    issueAdminSession(event, email);
    return { success: true };
  })
);

