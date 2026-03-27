import { getAdminSession } from "../../../utils/admin-auth";

export default defineEventHandler((event) => {
  const session = getAdminSession(event);
  if (!session) {
    setResponseStatus(event, 401);
    return { authenticated: false };
  }
  return { authenticated: true, email: session.email };
});

