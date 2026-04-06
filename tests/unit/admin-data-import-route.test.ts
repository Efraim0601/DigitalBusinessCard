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

vi.mock("../../server/utils/admin-spreadsheet", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../server/utils/admin-spreadsheet")>();
  return {
    ...mod,
    parseScopedImportBuffer: mocks.parseScopedImportBuffer,
  };
});

vi.mock("../../server/utils/admin-data-import-apply", () => ({
  applyScopedImport: mocks.applyScopedImport,
}));

import importHandler from "../../server/api/admin/data-import.post";

function multipartRequest(scope: string, body: Uint8Array, contentType: string) {
  return new Request(`http://localhost/api/admin/data-import?scope=${scope}`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: body as BodyInit,
  });
}

describe("POST /api/admin/data-import", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.readMultipartFormData.mockReset();
    mocks.parseScopedImportBuffer.mockReset();
    mocks.applyScopedImport.mockReset();
    mocks.requireAdmin.mockReturnValue({ email: "a@b.com", exp: 9e9 });
    mocks.applyScopedImport.mockResolvedValue({
      success: true,
      imported: { departments: 0, job_titles: 0, cards: 1 },
      warnings: [],
    });
  });

  it("400 sans scope valide", async () => {
    const ev = testH3Event(new Request("http://localhost/api/admin/data-import", { method: "POST" }));
    const res = await importHandler(ev);
    expect(res).toMatchObject({ error: expect.stringContaining("scope") });
    expect(ev.node.res.statusCode).toBe(400);
  });

  it("400 sans fichier", async () => {
    mocks.readMultipartFormData.mockResolvedValue([]);
    const ev = testH3Event(
      multipartRequest("cards", new Uint8Array(), "multipart/form-data; boundary=----x")
    );
    const res = await importHandler(ev);
    expect(res).toMatchObject({ error: expect.stringContaining("Fichier") });
    expect(ev.node.res.statusCode).toBe(400);
  });

  it("413 si fichier trop volumineux", async () => {
    const big = Buffer.alloc(6 * 1024 * 1024, 97);
    mocks.readMultipartFormData.mockResolvedValue([{ name: "file", filename: "huge.csv", data: big }]);
    const ev = testH3Event(
      multipartRequest("cards", new Uint8Array(), "multipart/form-data; boundary=----x")
    );
    const res = await importHandler(ev);
    expect(res).toMatchObject({ error: expect.stringContaining("volumineux") });
    expect(ev.node.res.statusCode).toBe(413);
    expect(mocks.parseScopedImportBuffer).not.toHaveBeenCalled();
  });

  it("parse et apply avec fichier valide", async () => {
    const csv = Buffer.from("email;nom\na@b.com;x", "utf8");
    mocks.readMultipartFormData.mockResolvedValue([{ name: "file", filename: "f.csv", data: csv }]);
    mocks.parseScopedImportBuffer.mockReturnValue({
      scope: "cards",
      cards: [{ email: "a@b.com", first_name: null, last_name: null, mobile: null, posteLabel: "", directionLabel: "" }],
    });
    const ev = testH3Event(
      multipartRequest("cards", new Uint8Array(), "multipart/form-data; boundary=----x")
    );
    const res = await importHandler(ev);
    expect(mocks.parseScopedImportBuffer).toHaveBeenCalledWith(csv, "f.csv", "cards");
    expect(mocks.applyScopedImport).toHaveBeenCalled();
    expect(res).toMatchObject({ success: true, imported: { cards: 1 } });
  });
});
