import { describe, expect, it, vi } from "vitest";
import {
  parseAdminSessionToken,
  serializeAdminSessionToken,
  signSessionBlob,
} from "../../server/utils/admin-session-token";

describe("server/utils/admin-session-token", () => {
  const secret = "test-secret-key";

  it("round-trips a valid non-expired token", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = serializeAdminSessionToken({ email: "admin@example.com", exp }, secret);
    const parsed = parseAdminSessionToken(token, secret);
    expect(parsed).toEqual({ email: "admin@example.com", exp });
  });

  it("rejects expired tokens", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    const exp = Math.floor(Date.now() / 1000) - 10;
    const token = serializeAdminSessionToken({ email: "a@b.c", exp }, secret);
    expect(parseAdminSessionToken(token, secret)).toBeNull();
    vi.useRealTimers();
  });

  it("rejects tampered payload or wrong secret", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = serializeAdminSessionToken({ email: "admin@example.com", exp }, secret);
    const [payload, sig] = token.split(".");
    expect(parseAdminSessionToken(`${payload.slice(0, -1)}x.${sig}`, secret)).toBeNull();
    expect(parseAdminSessionToken(token, "other-secret")).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(parseAdminSessionToken("not-a-jwt", secret)).toBeNull();
    expect(parseAdminSessionToken("a.b.c", secret)).toBeNull();
  });

  it("rejects valid signature but non-JSON payload", () => {
    const encodedPayload = Buffer.from("not-json", "utf8").toString("base64url");
    const sig = signSessionBlob(encodedPayload, secret);
    expect(parseAdminSessionToken(`${encodedPayload}.${sig}`, secret)).toBeNull();
  });

  it("signSessionBlob is deterministic for same inputs", () => {
    const encoded = "eyJlbWFpbCI6ImEifQ";
    expect(signSessionBlob(encoded, secret)).toBe(signSessionBlob(encoded, secret));
    expect(signSessionBlob(encoded, "x")).not.toBe(signSessionBlob(encoded, secret));
  });
});
