import { beforeEach, describe, expect, it, vi } from "vitest";
import { testH3Event } from "../helpers/h3-test-event";
import { FIXED_FAX, FIXED_PHONE } from "../../server/utils/contact-constants";

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
import putHandler from "../../server/api/cards/[id].put";

function putEvent(body: object, id: string | null) {
  const ev = testH3Event(
    new Request("http://localhost/", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  ev.context.params = id ? { id } : {};
  return ev;
}

const returnedRow = {
  id: "c1",
  email: "e@e.com",
  first_name: "F",
  last_name: "L",
  company: "C",
  title: "T",
  phone: FIXED_PHONE,
  fax: FIXED_FAX,
  mobile: "690 000 000",
  department_id: "d1",
  job_title_id: "j1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

describe("PUT /api/cards/:id", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.query.mockReset();
  });

  it("400 si id absent", async () => {
    const ev = putEvent({ first_name: "A" }, null);
    const res = await putHandler(ev);
    expect(res).toMatchObject({ error: "id is required" });
    expect(ev.node.res.statusCode).toBe(400);
  });

  it("404 si aucune ligne (branche principale)", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] });
    const ev = putEvent({ first_name: "X" }, "c1");
    const res = await putHandler(ev);
    expect(res).toMatchObject({ error: "Card not found" });
    expect(ev.node.res.statusCode).toBe(404);
  });

  it("200 : mise à jour avec relations", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [{ ...returnedRow, first_name: "N" }],
    });
    const ev = putEvent({ first_name: "N", mobile: "690111222", department_id: "d1" }, "c1");
    const res = await putHandler(ev);
    expect(res).toMatchObject({ id: "c1", first_name: "N" });
    expect(mocks.query).toHaveBeenCalledOnce();
  });

  it("200 : fallback schéma sans relations (catch)", async () => {
    const slim = {
      id: "c1",
      email: "e@e.com",
      first_name: "Legacy",
      last_name: "L",
      company: null,
      title: null,
      phone: FIXED_PHONE,
      fax: FIXED_FAX,
      mobile: null,
      created_at: "t",
      updated_at: "t",
    };
    mocks.query
      .mockRejectedValueOnce(new Error("no column"))
      .mockResolvedValueOnce({ rows: [slim] });
    const ev = putEvent({ first_name: "In" }, "c1");
    const res = (await putHandler(ev)) as Record<string, unknown>;
    expect(res.department_id).toBeNull();
    expect(res.job_title_id).toBeNull();
    expect(res.first_name).toBe("Legacy");
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });

  it("normalise un mobile sans chiffres en null dans UPDATE", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [{ ...returnedRow, mobile: null }],
    });
    const ev = putEvent({ mobile: "---" }, "c1");
    await putHandler(ev);
    const params = mocks.query.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe(FIXED_PHONE);
    expect(params[1]).toBe(FIXED_FAX);
    expect(params[2]).toBeNull();
  });

  it("404 en catch si seconde requête vide", async () => {
    mocks.query.mockRejectedValueOnce(new Error("schema")).mockResolvedValueOnce({ rows: [] });
    const ev = putEvent({}, "c1");
    const res = await putHandler(ev);
    expect(res).toMatchObject({ error: "Card not found" });
    expect(ev.node.res.statusCode).toBe(404);
  });
});
