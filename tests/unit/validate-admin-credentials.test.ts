import { describe, expect, it, vi } from "vitest";
import { validateAdminCredentials } from "../../server/utils/admin-auth";

function makeEvent(runtime: { adminEmail?: string; adminPassword?: string }) {
  return {
    context: {},
    __mockRuntime: runtime,
  } as unknown as Parameters<typeof validateAdminCredentials>[0];
}

describe("server/utils/admin-auth validateAdminCredentials", () => {
  it("returns false when admin email or password is not configured", () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ adminEmail: "", adminPassword: "p", adminSessionSecret: "s" }));
    expect(validateAdminCredentials(makeEvent({}), "a@b.com", "p")).toBe(false);

    vi.stubGlobal("useRuntimeConfig", () => ({ adminEmail: "a@b.com", adminPassword: "", adminSessionSecret: "s" }));
    expect(validateAdminCredentials(makeEvent({}), "a@b.com", "p")).toBe(false);
  });

  it("matches email case-insensitively and password exactly", () => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      adminEmail: "Admin@Bank.com",
      adminPassword: "Secret!",
      adminSessionSecret: "x",
    }));
    const ev = makeEvent({});
    expect(validateAdminCredentials(ev, "admin@bank.com", "Secret!")).toBe(true);
    expect(validateAdminCredentials(ev, "  admin@bank.com  ", "Secret!")).toBe(true);
    expect(validateAdminCredentials(ev, "admin@bank.com", "wrong")).toBe(false);
    expect(validateAdminCredentials(ev, "other@bank.com", "Secret!")).toBe(false);
  });
});
