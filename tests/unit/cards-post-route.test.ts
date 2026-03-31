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
import postHandler from "../../server/api/cards/index.post";

function postEvent(body: object) {
  return testH3Event(
    new Request("http://localhost/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

const rowFull = {
  id: "1",
  email: "a@b.com",
  first_name: "A",
  last_name: "B",
  company: null,
  title: null,
  phone: FIXED_PHONE,
  fax: FIXED_FAX,
  mobile: null,
  department_id: "d",
  job_title_id: "j",
  created_at: "t",
  updated_at: "t",
};

describe("POST /api/cards", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.query.mockReset();
  });

  it("400 sans email", async () => {
    const ev = postEvent({ first_name: "A" });
    const res = await postHandler(ev);
    expect(res).toMatchObject({ error: "email is required" });
    expect(ev.node.res.statusCode).toBe(400);
  });

  it("200 insert / upsert avec colonnes department_id / job_title_id", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [rowFull] });
    const ev = postEvent({ email: "a@b.com", department_id: "d", job_title_id: "j" });
    const res = await postHandler(ev);
    expect(res).toMatchObject({ email: "a@b.com", department_id: "d", job_title_id: "j" });
    expect(mocks.query).toHaveBeenCalledOnce();
  });

  it("mobile sans chiffres est envoyé comme null", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [{ ...rowFull, email: "m@b.com", mobile: null }],
    });
    const ev = postEvent({ email: "m@b.com", mobile: "no-digits" });
    await postHandler(ev);
    const params = mocks.query.mock.calls[0][1] as unknown[];
    expect(params[7]).toBeNull();
  });

  it("200 fallback sans colonnes relations (catch)", async () => {
    const rowBasic = {
      id: "2",
      email: "b@b.com",
      first_name: null,
      last_name: null,
      company: null,
      title: null,
      phone: FIXED_PHONE,
      fax: FIXED_FAX,
      mobile: null,
      created_at: "t",
      updated_at: "t",
    };
    mocks.query
      .mockRejectedValueOnce(new Error("no department_id"))
      .mockResolvedValueOnce({ rows: [rowBasic] });
    const ev = postEvent({ email: "b@b.com", department_id: "x" });
    const res = (await postHandler(ev)) as Record<string, unknown>;
    expect(res.department_id).toBeNull();
    expect(res.job_title_id).toBeNull();
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });
});
