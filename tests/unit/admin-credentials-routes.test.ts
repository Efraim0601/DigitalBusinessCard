import { beforeEach, describe, expect, it, vi } from "vitest";
import { testH3Event } from "../helpers/h3-test-event";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getConfiguredAdminCredentials: vi.fn(),
  getAdminLoginRow: vi.fn(),
  validateAdminCredentials: vi.fn(),
  upsertAdminLoginRow: vi.fn(),
  issueAdminSession: vi.fn(),
}));

vi.mock("../../server/utils/admin-auth", () => ({
  requireAdmin: mocks.requireAdmin,
  getConfiguredAdminCredentials: mocks.getConfiguredAdminCredentials,
  validateAdminCredentials: mocks.validateAdminCredentials,
  issueAdminSession: mocks.issueAdminSession,
}));

vi.mock("../../server/utils/admin-credentials-db", () => ({
  getAdminLoginRow: mocks.getAdminLoginRow,
  upsertAdminLoginRow: mocks.upsertAdminLoginRow,
}));

// eslint-disable-next-line import/first
import credentialsGetHandler from "../../server/api/auth/admin/credentials.get";
// eslint-disable-next-line import/first
import credentialsPutHandler from "../../server/api/auth/admin/credentials.put";

function jsonPutEvent(body: object) {
  return testH3Event(
    new Request("http://localhost/api/auth/admin/credentials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe("GET /api/auth/admin/credentials", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.getAdminLoginRow.mockReset();
    mocks.getConfiguredAdminCredentials.mockReset();
    mocks.requireAdmin.mockReturnValue({ email: "session@x.com", exp: 9e9 });
  });

  it("retourne l’email DB en priorité", async () => {
    mocks.getAdminLoginRow.mockResolvedValue({ email: "  db@x.com  ", password_hash: "h" });
    mocks.getConfiguredAdminCredentials.mockReturnValue({ email: "env@x.com", password: "p", secret: "s" });
    const ev = testH3Event(new Request("http://localhost/"));
    const res = await credentialsGetHandler(ev);
    expect(res).toEqual({ email: "db@x.com", storedInDatabase: true });
  });

  it("retourne l’email config si pas de ligne DB", async () => {
    mocks.getAdminLoginRow.mockResolvedValue(null);
    mocks.getConfiguredAdminCredentials.mockReturnValue({ email: "env@x.com", password: "p", secret: "s" });
    const ev = testH3Event(new Request("http://localhost/"));
    const res = await credentialsGetHandler(ev);
    expect(res).toEqual({ email: "env@x.com", storedInDatabase: false });
  });

  it("retourne l’email config si la ligne DB a un email vide", async () => {
    mocks.getAdminLoginRow.mockResolvedValue({ email: "   ", password_hash: "h" });
    mocks.getConfiguredAdminCredentials.mockReturnValue({ email: "fallback@x.com", password: "p", secret: "s" });
    const ev = testH3Event(new Request("http://localhost/"));
    const res = await credentialsGetHandler(ev);
    expect(res).toEqual({ email: "fallback@x.com", storedInDatabase: true });
  });

  it("retourne email vide si config sans email et pas de ligne DB", async () => {
    mocks.getAdminLoginRow.mockResolvedValue(null);
    mocks.getConfiguredAdminCredentials.mockReturnValue({ email: "", password: "", secret: "s" });
    const ev = testH3Event(new Request("http://localhost/"));
    const res = await credentialsGetHandler(ev);
    expect(res).toEqual({ email: "", storedInDatabase: false });
  });
});

describe("PUT /api/auth/admin/credentials", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.getAdminLoginRow.mockReset();
    mocks.getConfiguredAdminCredentials.mockReset();
    mocks.validateAdminCredentials.mockReset();
    mocks.upsertAdminLoginRow.mockReset();
    mocks.issueAdminSession.mockReset();
    mocks.requireAdmin.mockReturnValue({ email: "session@x.com", exp: 9e9 });
    mocks.getConfiguredAdminCredentials.mockReturnValue({ email: "admin@x.com", password: "pw", secret: "sec" });
  });

  it("400 si currentPassword manquant", async () => {
    const ev = jsonPutEvent({ newPassword: "x" });
    const res = await credentialsPutHandler(ev);
    expect(res).toMatchObject({ error: "currentPassword is required" });
    expect(ev.node.res.statusCode).toBe(400);
  });

  it("400 si ni newEmail ni newPassword", async () => {
    const ev = jsonPutEvent({ currentPassword: "ok" });
    const res = await credentialsPutHandler(ev);
    expect(res).toMatchObject({ error: "newEmail or newPassword is required" });
    expect(ev.node.res.statusCode).toBe(400);
  });

  it("500 si aucun email admin (env + DB vides)", async () => {
    mocks.getAdminLoginRow.mockResolvedValue(null);
    mocks.getConfiguredAdminCredentials.mockReturnValue({ email: "", password: "", secret: "s" });
    const ev = jsonPutEvent({ currentPassword: "x", newPassword: "y" });
    const res = await credentialsPutHandler(ev);
    expect(res).toMatchObject({ error: "Admin not configured" });
    expect(ev.node.res.statusCode).toBe(500);
  });

  it("401 si le mot de passe actuel est invalide", async () => {
    mocks.getAdminLoginRow.mockResolvedValue(null);
    mocks.validateAdminCredentials.mockResolvedValue(false);
    const ev = jsonPutEvent({ currentPassword: "bad", newPassword: "new1" });
    const res = await credentialsPutHandler(ev);
    expect(res).toMatchObject({ error: "Invalid current password" });
    expect(ev.node.res.statusCode).toBe(401);
  });

  it("200 : nouveau mot de passe seul (sans ligne DB, hash du nouveau mot de passe)", async () => {
    mocks.getAdminLoginRow.mockResolvedValue(null);
    mocks.validateAdminCredentials.mockResolvedValue(true);
    mocks.upsertAdminLoginRow.mockResolvedValue(undefined);
    const ev = jsonPutEvent({ currentPassword: "old", newPassword: "newpass" });
    const res = await credentialsPutHandler(ev);
    expect(res).toEqual({ success: true });
    expect(mocks.upsertAdminLoginRow).toHaveBeenCalledTimes(1);
    const [, hash] = mocks.upsertAdminLoginRow.mock.calls[0]!;
    expect(hash).toMatch(/^v1\$/);
    expect(mocks.issueAdminSession).toHaveBeenCalledWith(ev, "admin@x.com");
  });

  it("200 : changement d’email seul en conservant le hash DB", async () => {
    mocks.getAdminLoginRow.mockResolvedValue({
      email: "old@x.com",
      password_hash: "v1$c2FsdA==$aGFzaA==",
    });
    mocks.validateAdminCredentials.mockResolvedValue(true);
    const ev = jsonPutEvent({ currentPassword: "ok", newEmail: "new@x.com" });
    const res = await credentialsPutHandler(ev);
    expect(res).toEqual({ success: true });
    expect(mocks.upsertAdminLoginRow).toHaveBeenCalledWith("new@x.com", "v1$c2FsdA==$aGFzaA==");
  });

  it("200 : nouvel email seul sans ligne DB (hash du mot de passe actuel)", async () => {
    mocks.getAdminLoginRow.mockResolvedValue(null);
    mocks.validateAdminCredentials.mockResolvedValue(true);
    const ev = jsonPutEvent({ currentPassword: "cur", newEmail: "new@x.com" });
    const res = await credentialsPutHandler(ev);
    expect(res).toEqual({ success: true });
    const [email, hash] = mocks.upsertAdminLoginRow.mock.calls[0]!;
    expect(email).toBe("new@x.com");
    expect(hash).toMatch(/^v1\$/);
    expect(mocks.issueAdminSession).toHaveBeenCalledWith(ev, "new@x.com");
  });

  it("200 : nouveau mot de passe avec ligne DB (re-hash)", async () => {
    mocks.getAdminLoginRow.mockResolvedValue({
      email: "a@x.com",
      password_hash: "v1$old$old",
    });
    mocks.validateAdminCredentials.mockResolvedValue(true);
    const ev = jsonPutEvent({ currentPassword: "ok", newPassword: "newsecret" });
    const res = await credentialsPutHandler(ev);
    expect(res).toEqual({ success: true });
    const [, hash] = mocks.upsertAdminLoginRow.mock.calls[0]!;
    expect(hash).toMatch(/^v1\$/);
    expect(mocks.issueAdminSession).toHaveBeenCalledWith(ev, "a@x.com");
  });
});
