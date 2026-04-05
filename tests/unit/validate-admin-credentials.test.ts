import { afterEach, describe, expect, it, vi } from "vitest";
import { hashAdminPassword } from "../../server/utils/admin-password-hash";

vi.mock("../../server/utils/admin-credentials-db", () => ({
  getAdminLoginRow: vi.fn(() => Promise.resolve(null)),
}));

import { validateAdminCredentials } from "../../server/utils/admin-auth";
import { getAdminLoginRow } from "../../server/utils/admin-credentials-db";

function makeEvent(runtime: { adminEmail?: string; adminPassword?: string }) {
  return {
    context: {},
    __mockRuntime: runtime,
  } as unknown as Parameters<typeof validateAdminCredentials>[0];
}

describe("server/utils/admin-auth validateAdminCredentials", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(getAdminLoginRow).mockReset();
    vi.mocked(getAdminLoginRow).mockResolvedValue(null);
  });

  it("returns false when admin email or password is not configured", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ adminEmail: "", adminPassword: "p", adminSessionSecret: "s" }));
    expect(await validateAdminCredentials(makeEvent({}), "a@b.com", "p")).toBe(false);

    vi.stubGlobal("useRuntimeConfig", () => ({ adminEmail: "a@b.com", adminPassword: "", adminSessionSecret: "s" }));
    expect(await validateAdminCredentials(makeEvent({}), "a@b.com", "p")).toBe(false);
  });

  it("matches env when no DB row", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      adminEmail: "Admin@Bank.com",
      adminPassword: "Secret!",
      adminSessionSecret: "x",
    }));
    const ev = makeEvent({});
    expect(await validateAdminCredentials(ev, "admin@bank.com", "Secret!")).toBe(true);
    expect(await validateAdminCredentials(ev, "  admin@bank.com  ", "Secret!")).toBe(true);
    expect(await validateAdminCredentials(ev, "admin@bank.com", "wrong")).toBe(false);
    expect(await validateAdminCredentials(ev, "other@bank.com", "Secret!")).toBe(false);
  });

  it("uses DB row when present", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      adminEmail: "env@bank.com",
      adminPassword: "wrong-env",
      adminSessionSecret: "x",
    }));
    vi.mocked(getAdminLoginRow).mockResolvedValue({
      email: "db@bank.com",
      password_hash: hashAdminPassword("DbSecret!"),
    });
    const ev = makeEvent({});
    expect(await validateAdminCredentials(ev, "db@bank.com", "DbSecret!")).toBe(true);
    expect(await validateAdminCredentials(ev, "db@bank.com", "wrong")).toBe(false);
    expect(await validateAdminCredentials(ev, "env@bank.com", "wrong-env")).toBe(false);
  });
});
