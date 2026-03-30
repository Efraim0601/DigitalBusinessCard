import { createHmac, timingSafeEqual } from "node:crypto";

export type AdminSessionPayload = {
  email: string;
  exp: number;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function signSessionBlob(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function serializeAdminSessionToken(payload: AdminSessionPayload, secret: string): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signSessionBlob(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function parseAdminSessionToken(token: string, secret: string): AdminSessionPayload | null {
  const [encodedPayload, providedSig] = token.split(".");
  if (!encodedPayload || !providedSig) return null;
  const expectedSig = signSessionBlob(encodedPayload, secret);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminSessionPayload;
    if (!payload?.email || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
