import { beforeEach, describe, expect, it, vi } from "vitest";
import { testH3Event } from "../helpers/h3-test-event";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  query: vi.fn(),
}));

vi.mock("../../server/utils/admin-auth", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("../../server/utils/db", () => ({
  query: (...args: unknown[]) => mocks.query(...args),
}));

// eslint-disable-next-line import/first
import bulkDeleteHandler from "../../server/api/cards/bulk-delete.post";

describe("POST /api/cards/bulk-delete", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.query.mockReset();
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
  });

  it("supprime et retourne deleted", async () => {
    mocks.query.mockResolvedValue({ rows: [{ id: "a" }, { id: "b" }] });
    const ev = testH3Event(
      new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"],
        }),
      })
    );
    const res = await bulkDeleteHandler(ev);
    expect(res).toEqual({ success: true, deleted: 2 });
  });
});
