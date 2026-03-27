import { createHmac, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";

const SESSION_COOKIE = "vcard_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

type SessionPayload = {
  email: string;
  exp: number;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAdminAuthConfig(event: H3Event) {
  const config = useRuntimeConfig(event);
  return {
    email: String(config.adminEmail || ""),
    password: String(config.adminPassword || ""),
    secret: String(config.adminSessionSecret || ""),
  };
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function serializeSession(payload: SessionPayload, secret: string): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

function parseSession(token: string, secret: string): SessionPayload | null {
  const [encodedPayload, providedSig] = token.split(".");
  if (!encodedPayload || !providedSig) return null;
  const expectedSig = sign(encodedPayload, secret);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (!payload?.email || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function validateAdminCredentials(event: H3Event, email: string, password: string): boolean {
  const auth = getAdminAuthConfig(event);
  if (!auth.email || !auth.password) return false;
  return auth.email.toLowerCase() === email.trim().toLowerCase() && auth.password === password;
}

export function issueAdminSession(event: H3Event, email: string) {
  const auth = getAdminAuthConfig(event);
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = serializeSession({ email, exp }, auth.secret);
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

export function getAdminSession(event: H3Event): SessionPayload | null {
  const auth = getAdminAuthConfig(event);
  if (!auth.secret) return null;
  const token = getCookie(event, SESSION_COOKIE);
  if (!token) return null;
  return parseSession(token, auth.secret);
}

export function requireAdmin(event: H3Event): SessionPayload {
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

