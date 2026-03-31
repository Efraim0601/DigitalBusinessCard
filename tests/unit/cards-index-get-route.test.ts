import { beforeEach, describe, expect, it, vi } from "vitest";
import { testH3Event } from "../helpers/h3-test-event";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("../../server/utils/db", () => ({
  query: (...a: unknown[]) => mocks.query(...a),
}));
vi.mock("../../server/utils/admin-auth", () => ({
  requireAdmin: mocks.requireAdmin,
}));

// eslint-disable-next-line import/first -- import après vi.mock (hoisting Vitest)
import getHandler from "../../server/api/cards/index.get";

const joinRow = {
  id: "c1",
  email: "find@me.com",
  first_name: "F",
  last_name: "M",
  company: "Co",
  title: "T",
  phone: "1",
  fax: null,
  mobile: "2",
  department_id: null,
  job_title_id: null,
  department_label_fr: null,
  department_label_en: null,
  job_title_label_fr: null,
  job_title_label_en: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

describe("GET /api/cards", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.requireAdmin.mockReset();
  });

  it("retourne une carte par email sans requireAdmin", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [joinRow] });
    const event = testH3Event(new Request("http://localhost/api/cards?email=find@me.com"));
    const res = await getHandler(event);
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(res).toMatchObject({ id: "c1", email: "find@me.com" });
  });

  it("email : schéma simple si la requête avec jointures échoue", async () => {
    const slim = {
      id: "c3",
      email: "old@me.com",
      first_name: "O",
      last_name: "D",
      company: null,
      title: null,
      phone: null,
      fax: null,
      mobile: null,
      created_at: null,
      updated_at: null,
    };
    mocks.query.mockRejectedValueOnce(new Error("no join")).mockResolvedValueOnce({ rows: [slim] });
    const event = testH3Event(new Request("http://localhost/api/cards?email=old@me.com"));
    const res = (await getHandler(event)) as Record<string, unknown>;
    expect(res.email).toBe("old@me.com");
    expect(res.department_id).toBeNull();
    expect(res.department).toBeNull();
    expect(res.job_title).toBeNull();
  });

  it("404 si email inconnu", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] });
    mocks.query.mockResolvedValueOnce({ rows: [] });
    const event = testH3Event(new Request("http://localhost/api/cards?email=nope@me.com"));
    const res = await getHandler(event);
    expect(res).toMatchObject({ error: "Card not found" });
    expect(event.node.res.statusCode).toBe(404);
  });

  it("liste admin : schéma simple si la requête avec jointures échoue", async () => {
    const slimRow = {
      id: "c2",
      email: "legacy@me.com",
      first_name: "L",
      last_name: "G",
      company: null,
      title: null,
      phone: null,
      fax: null,
      mobile: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    };
    mocks.query
      .mockRejectedValueOnce(new Error("schema"))
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [slimRow] });
    const event = testH3Event(new Request("http://localhost/api/cards"));
    const res = (await getHandler(event)) as { items: Array<{ department_id: null }>; total: number };
    expect(mocks.requireAdmin).toHaveBeenCalled();
    expect(res.total).toBe(1);
    expect(res.items[0]?.department_id).toBeNull();
  });

  it("liste admin avec total et items", async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [joinRow] });
    const event = testH3Event(new Request("http://localhost/api/cards?limit=10&offset=0"));
    const res = (await getHandler(event)) as {
      items: unknown[];
      total: number;
      limit: number;
      offset: number;
    };
    expect(mocks.requireAdmin).toHaveBeenCalled();
    expect(res).toMatchObject({ total: 1, limit: 10, offset: 0 });
    expect(res.items).toHaveLength(1);
  });
});
