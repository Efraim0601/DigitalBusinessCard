import { beforeEach, describe, expect, it, vi } from "vitest";
import { testH3Event } from "../helpers/h3-test-event";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  loadCardsSimplifiedExportRows: vi.fn(),
  loadDepartmentsExportRows: vi.fn(),
  loadJobTitlesExportRows: vi.fn(),
  buildCardsSimplifiedCsvBuffer: vi.fn(),
  buildDepartmentsCsvBuffer: vi.fn(),
  buildJobTitlesCsvBuffer: vi.fn(),
}));

vi.mock("../../server/utils/admin-auth", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("../../server/utils/admin-export-data", () => ({
  loadCardsSimplifiedExportRows: mocks.loadCardsSimplifiedExportRows,
  loadDepartmentsExportRows: mocks.loadDepartmentsExportRows,
  loadJobTitlesExportRows: mocks.loadJobTitlesExportRows,
}));

vi.mock("../../server/utils/admin-spreadsheet", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../server/utils/admin-spreadsheet")>();
  return {
    ...mod,
    buildCardsSimplifiedCsvBuffer: mocks.buildCardsSimplifiedCsvBuffer,
    buildDepartmentsCsvBuffer: mocks.buildDepartmentsCsvBuffer,
    buildJobTitlesCsvBuffer: mocks.buildJobTitlesCsvBuffer,
  };
});

import exportHandler from "../../server/api/admin/data-export.get";

describe("GET /api/admin/data-export", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.loadCardsSimplifiedExportRows.mockReset();
    mocks.loadDepartmentsExportRows.mockReset();
    mocks.loadJobTitlesExportRows.mockReset();
    mocks.buildCardsSimplifiedCsvBuffer.mockReset();
    mocks.buildDepartmentsCsvBuffer.mockReset();
    mocks.buildJobTitlesCsvBuffer.mockReset();
    mocks.requireAdmin.mockReturnValue({ email: "a@b.com", exp: 9e9 });
    mocks.loadCardsSimplifiedExportRows.mockResolvedValue([]);
    mocks.loadDepartmentsExportRows.mockResolvedValue([]);
    mocks.loadJobTitlesExportRows.mockResolvedValue([]);
    mocks.buildCardsSimplifiedCsvBuffer.mockReturnValue(Buffer.from("cards"));
    mocks.buildDepartmentsCsvBuffer.mockReturnValue(Buffer.from("dept"));
    mocks.buildJobTitlesCsvBuffer.mockReturnValue(Buffer.from("job"));
  });

  it("400 sans scope", async () => {
    const ev = testH3Event(new Request("http://localhost/api/admin/data-export"));
    const res = await exportHandler(ev);
    expect(res).toMatchObject({ error: expect.stringContaining("scope") });
    expect(ev.node.res.statusCode).toBe(400);
  });

  it("cartes : CSV et en-têtes de réponse", async () => {
    const ev = testH3Event(new Request("http://localhost/api/admin/data-export?scope=cards"));
    const res = await exportHandler(ev);
    expect(Buffer.isBuffer(res)).toBe(true);
    expect(res.toString()).toBe("cards");
    expect(mocks.buildCardsSimplifiedCsvBuffer).toHaveBeenCalled();
    expect(ev.node.res.setHeader).toHaveBeenCalled();
  });

  it("directions : CSV", async () => {
    const ev = testH3Event(new Request("http://localhost/api/admin/data-export?scope=departments"));
    const res = await exportHandler(ev);
    expect(res.toString()).toBe("dept");
    expect(mocks.buildDepartmentsCsvBuffer).toHaveBeenCalled();
  });

  it("job_titles : CSV", async () => {
    const ev = testH3Event(new Request("http://localhost/api/admin/data-export?scope=job_titles"));
    const res = await exportHandler(ev);
    expect(res.toString()).toBe("job");
    expect(mocks.buildJobTitlesCsvBuffer).toHaveBeenCalled();
  });
});
