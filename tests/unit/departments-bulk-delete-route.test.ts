import { beforeEach, describe, expect, it, vi } from "vitest";
import { testH3Event } from "../helpers/h3-test-event";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  query: vi.fn(),
  invalidateLabelListCache: vi.fn(),
}));

vi.mock("../../server/utils/admin-auth", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("../../server/utils/db", () => ({
  query: (...args: unknown[]) => mocks.query(...args),
}));

vi.mock("../../server/utils/label-list-cache", () => ({
  invalidateLabelListCache: mocks.invalidateLabelListCache,
}));

import bulkDeleteHandler from "../../server/api/departments/bulk-delete.post";

const UUID_A = "550e8400-e29b-41d4-a716-446655440001";
const UUID_B = "550e8400-e29b-41d4-a716-446655440002";

describe("POST /api/departments/bulk-delete", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.query.mockReset();
    mocks.invalidateLabelListCache.mockReset();
    mocks.requireAdmin.mockReturnValue({ email: "a@b.com", exp: 9e9 });
  });

  it("400 si ids vide", async () => {
    const ev = testH3Event(
      new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [] }),
      })
    );
    const res = await bulkDeleteHandler(ev);
    expect(res).toMatchObject({ error: expect.stringContaining("ids") });
    expect(ev.node.res.statusCode).toBe(400);
    expect(mocks.invalidateLabelListCache).not.toHaveBeenCalled();
  });

  it("400 si aucun UUID valide après filtrage", async () => {
    const ev = testH3Event(
      new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["invalid"] }),
      })
    );
    const res = await bulkDeleteHandler(ev);
    expect(res).toMatchObject({ error: expect.stringContaining("UUIDs") });
    expect(ev.node.res.statusCode).toBe(400);
  });

  it("400 si plus de 500 ids", async () => {
    const many = Array.from({ length: 501 }, (_, i) => {
      const tail = i.toString(16).padStart(12, "0");
      return `550e8400-e29b-41d4-a716-${tail}`;
    });
    const ev = testH3Event(
      new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: many }),
      })
    );
    const res = await bulkDeleteHandler(ev);
    expect(res).toMatchObject({ error: expect.stringContaining("500") });
    expect(ev.node.res.statusCode).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("supprime, invalide le cache departments et retourne deleted", async () => {
    mocks.query.mockResolvedValue({ rows: [{ id: UUID_A }] });
    const ev = testH3Event(
      new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [UUID_A, UUID_B] }),
      })
    );
    const res = await bulkDeleteHandler(ev);
    expect(res).toEqual({ success: true, deleted: 1 });
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM departments"),
      [[UUID_A, UUID_B]]
    );
    expect(mocks.invalidateLabelListCache).toHaveBeenCalledWith("departments");
  });
});
