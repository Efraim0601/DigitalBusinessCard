import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invalidateAllLabelListCaches: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("../../server/utils/label-list-cache", () => ({
  invalidateAllLabelListCaches: mocks.invalidateAllLabelListCaches,
}));

vi.mock("../../server/utils/db", () => ({
  withTransaction: mocks.withTransaction,
}));

import { applyScopedImport } from "../../server/utils/admin-data-import-apply";

describe("applyScopedImport", () => {
  beforeEach(() => {
    mocks.invalidateAllLabelListCaches.mockReset();
    mocks.withTransaction.mockReset();
  });

  it("fusionne directions via upsert (mock transaction)", async () => {
    const queries: string[] = [];
    const fakeClient = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes("FROM departments WHERE lower(trim(label_fr")) {
          return { rows: [] };
        }
        if (sql.includes("FROM departments WHERE lower(trim(label_en")) {
          return { rows: [] };
        }
        if (sql.startsWith("INSERT INTO departments")) {
          return { rows: [], rowCount: 1 };
        }
        return { rows: [] };
      }),
    };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    const res = await applyScopedImport({
      scope: "departments",
      departments: [{ label_fr: "  A  ", label_en: "  B  " }],
    });

    expect(res.success).toBe(true);
    expect(res.imported.departments).toBe(1);
    expect(res.imported.cards).toBe(0);
    expect(mocks.invalidateAllLabelListCaches).toHaveBeenCalled();
    expect(fakeClient.query).toHaveBeenCalled();
    expect(queries.some((q) => q.includes("INSERT INTO departments"))).toBe(true);
  });

  it("rejette email carte invalide", async () => {
    const fakeClient = { query: vi.fn() };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    await expect(
      applyScopedImport({
        scope: "cards",
        cards: [
          {
            email: "pas-un-email",
            first_name: null,
            last_name: null,
            mobile: null,
            posteLabel: "",
            directionLabel: "",
          },
        ],
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
