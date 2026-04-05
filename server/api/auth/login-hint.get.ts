import { query } from "../../utils/db";
import { getEffectiveAdminEmailNormalized } from "../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  const email = String(getQuery(event).email || "").trim();
  if (!email) {
    setResponseStatus(event, 400);
    return { error: "email is required" };
  }

  const adminNorm = await getEffectiveAdminEmailNormalized(event);
  const isAdminEmail = adminNorm.length > 0 && email.toLowerCase() === adminNorm;

  let hasCard = false;
  try {
    const { rows } = await query(
      `SELECT 1 FROM cards WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );
    hasCard = rows.length > 0;
  } catch {
    hasCard = false;
  }

  return { isAdminEmail, hasCard };
});
