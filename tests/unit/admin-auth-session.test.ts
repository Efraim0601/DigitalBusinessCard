import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdminSession, requireAdmin } from "../../server/utils/admin-auth";
import { serializeAdminSessionToken } from "../../server/utils/admin-session-token";
import { testH3Event } from "../helpers/h3-test-event";

describe("server/utils/admin-auth session", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getAdminSession retourne null sans secret configuré", () => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      adminEmail: "a",
      adminPassword: "b",
      adminSessionSecret: "",
    }));
    vi.stubGlobal("getCookie", () => undefined);
    expect(getAdminSession(testH3Event(new Request("http://localhost/")))).toBeNull();
  });

  it("getAdminSession retourne null sans cookie", () => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      adminEmail: "a",
      adminPassword: "b",
      adminSessionSecret: "s",
    }));
    vi.stubGlobal("getCookie", () => undefined);
    expect(getAdminSession(testH3Event(new Request("http://localhost/")))).toBeNull();
  });

  it("getAdminSession retourne le payload si le cookie est valide", () => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      adminEmail: "a",
      adminPassword: "b",
      adminSessionSecret: "secret",
    }));
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = serializeAdminSessionToken({ email: "adm@x.com", exp }, "secret");
    vi.stubGlobal("getCookie", () => token);
    expect(getAdminSession(testH3Event(new Request("http://localhost/")))).toEqual({
      email: "adm@x.com",
      exp,
    });
  });

  it("requireAdmin lève sans session", () => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      adminEmail: "a",
      adminPassword: "b",
      adminSessionSecret: "secret",
    }));
    vi.stubGlobal("getCookie", () => undefined);
    expect(() => requireAdmin(testH3Event(new Request("http://localhost/")))).toThrow();
  });

  it("requireAdmin retourne le payload si la session est valide", () => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      adminEmail: "a",
      adminPassword: "b",
      adminSessionSecret: "secret",
    }));
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = serializeAdminSessionToken({ email: "ok@x.com", exp }, "secret");
    vi.stubGlobal("getCookie", () => token);
    expect(requireAdmin(testH3Event(new Request("http://localhost/")))).toEqual({
      email: "ok@x.com",
      exp,
    });
  });
});
