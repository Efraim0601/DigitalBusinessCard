import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../server/utils/admin-credentials-db", () => ({
  getAdminLoginRow: vi.fn(),
}));

// eslint-disable-next-line import/first
import { getEffectiveAdminEmailNormalized } from "../../server/utils/admin-auth";
// eslint-disable-next-line import/first
import { getAdminLoginRow } from "../../server/utils/admin-credentials-db";

function makeEvent() {
  return {} as Parameters<typeof getEffectiveAdminEmailNormalized>[0];
}

describe("getEffectiveAdminEmailNormalized", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(getAdminLoginRow).mockReset();
  });

  it("priorise l’email présent en base (normalisé minuscules)", async () => {
    vi.mocked(getAdminLoginRow).mockResolvedValue({
      email: "  Admin@Bank.COM  ",
      password_hash: "h",
    });
    vi.stubGlobal("useRuntimeConfig", () => ({
      adminEmail: "env@bank.com",
      adminPassword: "p",
      adminSessionSecret: "s",
    }));
    await expect(getEffectiveAdminEmailNormalized(makeEvent())).resolves.toBe("admin@bank.com");
  });

  it("retombe sur la config si la ligne DB n’a pas d’email exploitable", async () => {
    vi.mocked(getAdminLoginRow).mockResolvedValue({
      email: "   ",
      password_hash: "h",
    });
    vi.stubGlobal("useRuntimeConfig", () => ({
      adminEmail: "  Config@X.com ",
      adminPassword: "p",
      adminSessionSecret: "s",
    }));
    await expect(getEffectiveAdminEmailNormalized(makeEvent())).resolves.toBe("config@x.com");
  });

  it("utilise la config si aucune ligne DB", async () => {
    vi.mocked(getAdminLoginRow).mockResolvedValue(null);
    vi.stubGlobal("useRuntimeConfig", () => ({
      adminEmail: "only@env.com",
      adminPassword: "p",
      adminSessionSecret: "s",
    }));
    await expect(getEffectiveAdminEmailNormalized(makeEvent())).resolves.toBe("only@env.com");
  });
});
