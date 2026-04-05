import { afterEach, describe, expect, it, vi } from "vitest";
import { hashAdminPassword, verifyAdminPasswordHash } from "../../server/utils/admin-password-hash";

describe("server/utils/admin-password-hash", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("vérifie un mot de passe hashé par hashAdminPassword", () => {
    const h = hashAdminPassword("Secret-1");
    expect(verifyAdminPasswordHash("Secret-1", h)).toBe(true);
    expect(verifyAdminPasswordHash("wrong", h)).toBe(false);
  });

  it("rejette un format invalide (version ou nombre de segments)", () => {
    expect(verifyAdminPasswordHash("x", "v2$a$b")).toBe(false);
    expect(verifyAdminPasswordHash("x", "v1$only")).toBe(false);
    expect(verifyAdminPasswordHash("x", "not-v1")).toBe(false);
  });

  it("rejette un hash dont le décodage base64 échoue", () => {
    const spy = vi.spyOn(Buffer, "from").mockImplementationOnce(() => {
      throw new TypeError("invalid");
    });
    expect(verifyAdminPasswordHash("p", "v1$YWJj$YWJj")).toBe(false);
    spy.mockRestore();
  });

  it("rejette si la longueur du hash attendu ne correspond pas à scrypt", () => {
    const salt = Buffer.alloc(16).toString("base64");
    const short = Buffer.alloc(8).toString("base64");
    const stored = `v1$${salt}$${short}`;
    expect(verifyAdminPasswordHash("password", stored)).toBe(false);
  });
});
