import type { H3Event } from "h3";
import {
  parseAdminSessionToken,
  serializeAdminSessionToken,
  type AdminSessionPayload,
} from "./admin-session-token";

const SESSION_COOKIE = "vcard_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getAdminAuthConfig(event: H3Event) {
  const config = useRuntimeConfig(event);
  return {
    email: String(config.adminEmail || ""),
    password: String(config.adminPassword || ""),
    secret: String(config.adminSessionSecret || ""),
  };
}

export function validateAdminCredentials(event: H3Event, email: string, password: string): boolean {
  const auth = getAdminAuthConfig(event);
  if (!auth.email || !auth.password) return false;
  return auth.email.toLowerCase() === email.trim().toLowerCase() && auth.password === password;
}

export function issueAdminSession(event: H3Event, email: string) {
  const auth = getAdminAuthConfig(event);
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = serializeAdminSessionToken({ email, exp }, auth.secret);
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSession(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { path: "/" });
}

export function getAdminSession(event: H3Event): AdminSessionPayload | null {
  const auth = getAdminAuthConfig(event);
  if (!auth.secret) return null;
  const token = getCookie(event, SESSION_COOKIE);
  if (!token) return null;
  return parseAdminSessionToken(token, auth.secret);
}

export function requireAdmin(event: H3Event): AdminSessionPayload {
  const session = getAdminSession(event);
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      data: { error: "Admin authentication required" },
    });
  }
  return session;
}

