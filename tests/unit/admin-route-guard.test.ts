import { describe, expect, it } from "vitest";
import { shouldBlockAdminRoute } from "../../app/utils/admin-route-guard";

describe("app/utils/admin-route-guard", () => {
  it("ne bloque pas hors /admin", async () => {
    expect(
      await shouldBlockAdminRoute("/", async () => {
        throw new Error("no fetch");
      })
    ).toBe(false);
  });

  it("bloque /admin si non authentifié", async () => {
    expect(await shouldBlockAdminRoute("/admin/cards", async () => ({ authenticated: false }))).toBe(
      true
    );
    expect(await shouldBlockAdminRoute("/admin", async () => ({}))).toBe(true);
  });

  it("bloque /admin si la requête échoue", async () => {
    expect(
      await shouldBlockAdminRoute("/admin/cards", async () => {
        throw new Error("network");
      })
    ).toBe(true);
  });

  it("autorise /admin si authenticated est vrai", async () => {
    expect(await shouldBlockAdminRoute("/admin/cards", async () => ({ authenticated: true }))).toBe(
      false
    );
  });
});
