import { beforeEach, describe, expect, it, vi } from "vitest";
import { testH3Event } from "../helpers/h3-test-event";

const mocks = vi.hoisted(() => ({
  validateAdminCredentials: vi.fn(),
  issueAdminSession: vi.fn(),
  getAdminSession: vi.fn(),
  clearAdminSession: vi.fn(),
}));

vi.mock("../../server/utils/admin-auth", () => ({
  validateAdminCredentials: mocks.validateAdminCredentials,
  issueAdminSession: mocks.issueAdminSession,
  getAdminSession: mocks.getAdminSession,
  clearAdminSession: mocks.clearAdminSession,
}));

// eslint-disable-next-line import/first -- import après vi.mock (hoisting Vitest)
import loginHandler from "../../server/api/auth/admin/login.post";
// eslint-disable-next-line import/first
import logoutHandler from "../../server/api/auth/admin/logout.post";
// eslint-disable-next-line import/first
import meHandler from "../../server/api/auth/admin/me.get";

describe("POST /api/auth/admin/login", () => {
  beforeEach(() => {
    mocks.validateAdminCredentials.mockReset();
    mocks.issueAdminSession.mockReset();
  });

  it("400 si email ou mot de passe manquant", async () => {
    const event = testH3Event(
      new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: " ", password: "" }),
      })
    );
    const res = await loginHandler(event);
    expect(res).toMatchObject({ error: "email and password are required" });
    expect(event.node.res.statusCode).toBe(400);
  });

  it("401 si identifiants invalides", async () => {
    mocks.validateAdminCredentials.mockReturnValue(false);
    const event = testH3Event(
      new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "a@b.com", password: "x" }),
      })
    );
    const res = await loginHandler(event);
    expect(res).toMatchObject({ error: "Invalid credentials" });
    expect(event.node.res.statusCode).toBe(401);
  });

  it("200 et issueAdminSession si ok", async () => {
    mocks.validateAdminCredentials.mockReturnValue(true);
    const event = testH3Event(
      new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "a@b.com", password: "secret" }),
      })
    );
    const res = await loginHandler(event);
    expect(res).toEqual({ success: true });
    expect(mocks.issueAdminSession).toHaveBeenCalledWith(event, "a@b.com");
  });
});

describe("GET /api/auth/admin/me", () => {
  beforeEach(() => {
    mocks.getAdminSession.mockReset();
  });

  it("401 sans session", async () => {
    mocks.getAdminSession.mockReturnValue(null);
    const event = testH3Event(new Request("http://localhost/"));
    const res = await meHandler(event);
    expect(res).toEqual({ authenticated: false });
    expect(event.node.res.statusCode).toBe(401);
  });

  it("200 avec session", async () => {
    mocks.getAdminSession.mockReturnValue({ email: "e@e.com", exp: 0 });
    const event = testH3Event(new Request("http://localhost/"));
    const res = await meHandler(event);
    expect(res).toEqual({ authenticated: true, email: "e@e.com" });
  });
});

describe("POST /api/auth/admin/logout", () => {
  beforeEach(() => {
    mocks.clearAdminSession.mockReset();
  });

  it("appelle clearAdminSession", async () => {
    const event = testH3Event(new Request("http://localhost/", { method: "POST" }));
    const res = await logoutHandler(event);
    expect(res).toEqual({ success: true });
    expect(mocks.clearAdminSession).toHaveBeenCalledWith(event);
  });
});
