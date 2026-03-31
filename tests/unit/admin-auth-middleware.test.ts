import { beforeAll, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
const navigateMock = vi.fn();

describe("app/middleware/admin-auth", () => {
  let adminAuthMiddleware: (to: { path: string }) => Promise<unknown>;

  beforeAll(async () => {
    vi.stubGlobal("defineNuxtRouteMiddleware", (handler: unknown) => handler);
    vi.stubGlobal("$fetch", fetchMock);
    vi.stubGlobal("navigateTo", navigateMock);
    const mod = await import("../../app/middleware/admin-auth");
    adminAuthMiddleware = mod.default as (to: { path: string }) => Promise<unknown>;
  });

  it("ne redirige pas hors /admin", async () => {
    fetchMock.mockReset();
    navigateMock.mockReset();
    await adminAuthMiddleware({ path: "/card/x" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("ne redirige pas si la session admin est valide", async () => {
    fetchMock.mockReset();
    navigateMock.mockReset();
    fetchMock.mockResolvedValue({ authenticated: true });
    const res = await adminAuthMiddleware({ path: "/admin/cards" });
    expect(fetchMock).toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(res).toBeUndefined();
  });

  it("redirige vers / si non authentifie", async () => {
    fetchMock.mockReset();
    navigateMock.mockReset();
    fetchMock.mockResolvedValue({ authenticated: false });
    await adminAuthMiddleware({ path: "/admin" });
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("redirige si $fetch echoue", async () => {
    fetchMock.mockReset();
    navigateMock.mockReset();
    fetchMock.mockRejectedValue(new Error("network"));
    await adminAuthMiddleware({ path: "/admin/x" });
    expect(navigateMock).toHaveBeenCalledWith("/");
  });
});
