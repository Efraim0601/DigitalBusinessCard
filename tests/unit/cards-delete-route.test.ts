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
  query: (...a: unknown[]) => mocks.query(...a),
}));

// eslint-disable-next-line import/first -- import après vi.mock (hoisting Vitest)
import deleteHandler from "../../server/api/cards/[id].delete";

describe("DELETE /api/cards/:id", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.query.mockReset();
    vi.stubGlobal("getRouterParam", (_e: unknown, name: string) =>
      name === "id" ? "card-id-1" : undefined
    );
  });

  it("400 si id absent", async () => {
    vi.stubGlobal("getRouterParam", () => undefined);
    const event = testH3Event(new Request("http://localhost/"));
    const res = await deleteHandler(event);
    expect(res).toMatchObject({ error: "id is required" });
    expect(event.node.res.statusCode).toBe(400);
  });

  it("404 si aucune ligne supprimée", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    const event = testH3Event(new Request("http://localhost/"));
    const res = await deleteHandler(event);
    expect(res).toMatchObject({ error: "Card not found" });
    expect(event.node.res.statusCode).toBe(404);
  });

  it("200 si suppression ok", async () => {
    mocks.query.mockResolvedValue({ rows: [{ id: "card-id-1" }] });
    const event = testH3Event(new Request("http://localhost/"));
    const res = await deleteHandler(event);
    expect(res).toEqual({ success: true });
  });
});
