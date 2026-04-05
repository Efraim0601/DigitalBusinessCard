import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const N = 16384;
const R = 8;
const P = 1;

export function hashAdminPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN, { N, r: R, p: P });
  return `v1$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyAdminPasswordHash(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[1]!, "base64");
    expected = Buffer.from(parts[2]!, "base64");
  } catch {
    return false;
  }
  const hash = scryptSync(plain, salt, expected.length, { N, r: R, p: P });
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}
