import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("../../server/utils/db", () => ({
  query: (...args: unknown[]) => mocks.query(...args),
}));

// eslint-disable-next-line import/first
import { getAdminLoginRow, upsertAdminLoginRow } from "../../server/utils/admin-credentials-db";

describe("server/utils/admin-credentials-db", () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it("getAdminLoginRow retourne la première ligne", async () => {
    mocks.query.mockResolvedValue({
      rows: [{ email: "a@b.com", password_hash: "v1$x$y" }],
    });
    await expect(getAdminLoginRow()).resolves.toEqual({
      email: "a@b.com",
      password_hash: "v1$x$y",
    });
  });

  it("getAdminLoginRow retourne null si aucune ligne", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    await expect(getAdminLoginRow()).resolves.toBeNull();
  });

  it("getAdminLoginRow retourne null si la requête échoue (table absente, etc.)", async () => {
    mocks.query.mockRejectedValue(new Error("relation admin_login does not exist"));
    await expect(getAdminLoginRow()).resolves.toBeNull();
  });

  it("upsertAdminLoginRow appelle INSERT … ON CONFLICT avec email trimé", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    await upsertAdminLoginRow("  x@y.com  ", "hash1");
    expect(mocks.query).toHaveBeenCalledTimes(1);
    const [sql, params] = mocks.query.mock.calls[0]!;
    expect(sql).toContain("INSERT INTO admin_login");
    expect(sql).toContain("ON CONFLICT");
    expect(params).toEqual(["x@y.com", "hash1"]);
  });
});
