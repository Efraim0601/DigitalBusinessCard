import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfiguredAdminCredentials } from "../../server/utils/admin-auth";

describe("getConfiguredAdminCredentials", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retourne email, password et secret depuis useRuntimeConfig", () => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      adminEmail: "adm@bank.com",
      adminPassword: "s3cret",
      adminSessionSecret: "sec",
    }));
    const ev = {} as Parameters<typeof getConfiguredAdminCredentials>[0];
    expect(getConfiguredAdminCredentials(ev)).toEqual({
      email: "adm@bank.com",
      password: "s3cret",
      secret: "sec",
    });
  });
});
