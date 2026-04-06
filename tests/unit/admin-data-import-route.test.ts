import { beforeEach, describe, expect, it, vi } from "vitest";
import { testH3Event } from "../helpers/h3-test-event";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  readMultipartFormData: vi.fn(),
  parseScopedImportBuffer: vi.fn(),
  applyScopedImport: vi.fn(),
}));

vi.mock("../../server/utils/admin-auth", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("h3", async (importOriginal) => {
  const mod = await importOriginal<typeof import("h3")>();
  return {
    ...mod,
    readMultipartFormData: mocks.readMultipartFormData,
  };
});

vi.mock("../../server/utils/admin-spreadsheet", () => ({
  parseScopedImportBuffer: mocks.parseScopedImportBuffer,
}));

vi.mock("../../server/utils/admin-data-import-apply", () => ({
  applyScopedImport: mocks.applyScopedImport,
}));

import importHandler from "../../server/api/admin/data-import.post";
import { MAX_ADMIN_UPLOAD_BYTES } from "../../server/utils/admin-import-validation";

describe("POST /api/admin/data-import", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.readMultipartFormData.mockReset();
    mocks.parseScopedImportBuffer.mockReset();
    mocks.applyScopedImport.mockReset();
    mocks.requireAdmin.mockReturnValue({ email: "a@b.com", exp: 9e9 });
    mocks.readMultipartFormData.mockResolvedValue([
      { name: "file", filename: "c.csv", data: Buffer.from("email;a@x.com\n") },
    ]);
    mocks.parseScopedImportBuffer.mockReturnValue({
      scope: "cards",
      cards: [{ email: "a@x.com", first_name: null, last_name: null, mobile: null, posteLabel: "", directionLabel: "" }],
    });
    mocks.applyScopedImport.mockResolvedValue({
      success: true,
      imported: { departments: 0, job_titles: 0, cards: 1 },
      warnings: [],
    });
  });

  it("400 sans scope", async () => {
    const ev = testH3Event(new Request("http://localhost/api/admin/data-import", { method: "POST" }));
    const res = await importHandler(ev);
    expect(res).toMatchObject({ error: expect.stringContaining("scope") });
    expect(ev.node.res.statusCode).toBe(400);
  });

  it("400 sans fichier", async () => {
    mocks.readMultipartFormData.mockResolvedValue([]);
    const ev = testH3Event(
      new Request("http://localhost/api/admin/data-import?scope=cards", { method: "POST" })
    );
    const res = await importHandler(ev);
    expect(res).toMatchObject({ error: expect.stringContaining("Fichier") });
    expect(ev.node.res.statusCode).toBe(400);
  });

  it("413 si fichier trop volumineux", async () => {
    const big = Buffer.alloc(MAX_ADMIN_UPLOAD_BYTES + 1, 97);
    mocks.readMultipartFormData.mockResolvedValue([{ name: "file", filename: "huge.csv", data: big }]);
    const ev = testH3Event(
      new Request("http://localhost/api/admin/data-import?scope=cards", { method: "POST" })
    );
    const res = await importHandler(ev);
    expect(res).toMatchObject({ error: expect.stringContaining("volumineux") });
    expect(ev.node.res.statusCode).toBe(413);
  });

  it("parse + apply avec scope=cards", async () => {
    const ev = testH3Event(
      new Request("http://localhost/api/admin/data-import?scope=cards", { method: "POST" })
    );
    const res = await importHandler(ev);
    expect(mocks.parseScopedImportBuffer).toHaveBeenCalled();
    expect(mocks.applyScopedImport).toHaveBeenCalled();
    expect(res).toEqual({
      success: true,
      imported: { departments: 0, job_titles: 0, cards: 1 },
      warnings: [],
    });
  });

  it("accepte scope=departments", async () => {
    mocks.parseScopedImportBuffer.mockReturnValue({ scope: "departments", departments: [{ label_fr: "A", label_en: "B" }] });
    mocks.applyScopedImport.mockResolvedValue({
      success: true,
      imported: { departments: 1, job_titles: 0, cards: 0 },
      warnings: [],
    });
    const ev = testH3Event(
      new Request("http://localhost/api/admin/data-import?scope=departments", { method: "POST" })
    );
    const res = await importHandler(ev);
    expect(res).toMatchObject({ imported: { departments: 1 } });
  });
});
