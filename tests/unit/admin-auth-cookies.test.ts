import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAdminSession, issueAdminSession } from "../../server/utils/admin-auth";
import { parseAdminSessionToken } from "../../server/utils/admin-session-token";
import { testH3Event } from "../helpers/h3-test-event";

describe("server/utils/admin-auth cookies", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("issueAdminSession pose un cookie avec un jeton signé", () => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      adminEmail: "a@b.com",
      adminPassword: "p",
      adminSessionSecret: "test-secret",
    }));
    const setCookie = vi.fn();
    vi.stubGlobal("setCookie", setCookie);
    const event = testH3Event(new Request("http://localhost/"));
    issueAdminSession(event, "user@bank.com");
    expect(setCookie).toHaveBeenCalledOnce();
    const token = setCookie.mock.calls[0][2] as string;
    expect(parseAdminSessionToken(token, "test-secret")).toMatchObject({
      email: "user@bank.com",
    });
  });

  it("clearAdminSession supprime le cookie de session", () => {
    const deleteCookie = vi.fn();
    vi.stubGlobal("deleteCookie", deleteCookie);
    const event = testH3Event(new Request("http://localhost/"));
    clearAdminSession(event);
    expect(deleteCookie).toHaveBeenCalledOnce();
  });
});
