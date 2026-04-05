import { beforeEach, describe, expect, it, vi } from "vitest";
import { testH3Event } from "../helpers/h3-test-event";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getEffectiveAdminEmailNormalized: vi.fn(),
}));

vi.mock("../../server/utils/db", () => ({
  query: (...args: unknown[]) => mocks.query(...args),
}));

vi.mock("../../server/utils/admin-auth", () => ({
  getEffectiveAdminEmailNormalized: (...args: unknown[]) => mocks.getEffectiveAdminEmailNormalized(...args),
}));

// eslint-disable-next-line import/first
import loginHintHandler from "../../server/api/auth/login-hint.get";

describe("GET /api/auth/login-hint", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.getEffectiveAdminEmailNormalized.mockReset();
  });

  it("400 si email absent", async () => {
    const ev = testH3Event(new Request("http://localhost/api/auth/login-hint"));
    const res = await loginHintHandler(ev);
    expect(res).toMatchObject({ error: "email is required" });
    expect(ev.node.res.statusCode).toBe(400);
  });

  it("200 isAdminEmail quand email admin", async () => {
    mocks.getEffectiveAdminEmailNormalized.mockResolvedValue("admin@bank.com");
    mocks.query.mockResolvedValue({ rows: [{}] });
    const ev = testH3Event(new Request("http://localhost/api/auth/login-hint?email=Admin%40bank.com"));
    const res = await loginHintHandler(ev);
    expect(res).toEqual({ isAdminEmail: true, hasCard: true });
  });

  it("200 isAdminEmail false si admin non configure", async () => {
    mocks.getEffectiveAdminEmailNormalized.mockResolvedValue("");
    mocks.query.mockResolvedValue({ rows: [] });
    const ev = testH3Event(new Request("http://localhost/api/auth/login-hint?email=u@bank.com"));
    const res = await loginHintHandler(ev);
    expect(res).toEqual({ isAdminEmail: false, hasCard: false });
  });

  it("200 hasCard false si requete SQL echoue", async () => {
    mocks.getEffectiveAdminEmailNormalized.mockResolvedValue("a@b.com");
    mocks.query.mockRejectedValue(new Error("db down"));
    const ev = testH3Event(new Request("http://localhost/api/auth/login-hint?email=u@bank.com"));
    const res = await loginHintHandler(ev);
    expect(res).toEqual({ isAdminEmail: false, hasCard: false });
  });
});
