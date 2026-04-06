import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  withTransaction: vi.fn(),
  invalidateAllLabelListCaches: vi.fn(),
}));

vi.mock("../../server/utils/db", () => ({
  withTransaction: mocks.withTransaction,
}));

vi.mock("../../server/utils/label-list-cache", () => ({
  invalidateAllLabelListCaches: mocks.invalidateAllLabelListCaches,
}));

import {
  __adminImportApplyTestHooks,
  applyAdminDataImport,
  applyScopedImport,
} from "../../server/utils/admin-data-import-apply";
import type { ParsedScopedImport } from "../../server/utils/admin-data-types";
import { MAX_IMPORT_CARDS, MAX_IMPORT_DEPARTMENTS, MAX_IMPORT_JOB_TITLES } from "../../server/utils/admin-data-types";

const { resolveDepartmentId, resolveJobTitleId, upsertDepartmentPair, upsertJobTitlePair } =
  __adminImportApplyTestHooks;

describe("applyScopedImport", () => {
  beforeEach(() => {
    mocks.withTransaction.mockReset();
    mocks.invalidateAllLabelListCaches.mockReset();
  });

  it("délègue au client SQL et invalide les caches listes (insert direction)", async () => {
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) =>
      fn({
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      })
    );

    const parsed: ParsedScopedImport = {
      scope: "departments",
      departments: [{ label_fr: "  A  ", label_en: "  B  " }],
    };

    const res = await applyScopedImport(parsed);
    expect(res.success).toBe(true);
    expect(res.imported.departments).toBe(1);
    expect(mocks.invalidateAllLabelListCaches).toHaveBeenCalled();
  });

  it("import titres (boucle job_titles)", async () => {
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) =>
      fn({
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      })
    );
    const parsed: ParsedScopedImport = {
      scope: "job_titles",
      job_titles: [{ label_fr: "Rôle", label_en: "Role" }],
    };
    const res = await applyScopedImport(parsed);
    expect(res.imported.job_titles).toBe(1);
    expect(mocks.invalidateAllLabelListCaches).toHaveBeenCalled();
  });

  it("400 si trop de lignes directions", async () => {
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) =>
      fn({ query: vi.fn() })
    );
    const parsed: ParsedScopedImport = {
      scope: "departments",
      departments: Array.from({ length: MAX_IMPORT_DEPARTMENTS + 1 }, (_, i) => ({
        label_fr: `F${i}`,
        label_en: `E${i}`,
      })),
    };
    await expect(applyScopedImport(parsed)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("400 si trop de lignes titres", async () => {
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) =>
      fn({ query: vi.fn() })
    );
    const parsed: ParsedScopedImport = {
      scope: "job_titles",
      job_titles: Array.from({ length: MAX_IMPORT_JOB_TITLES + 1 }, (_, i) => ({
        label_fr: `F${i}`,
        label_en: `E${i}`,
      })),
    };
    await expect(applyScopedImport(parsed)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("400 si trop de cartes", async () => {
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) =>
      fn({ query: vi.fn() })
    );
    const parsed: ParsedScopedImport = {
      scope: "cards",
      cards: Array.from({ length: MAX_IMPORT_CARDS + 1 }, (_, i) => ({
        email: `u${i}@x.com`,
        first_name: null,
        last_name: null,
        mobile: null,
        posteLabel: "",
        directionLabel: "",
      })),
    };
    await expect(applyScopedImport(parsed)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("400 si email invalide (cartes)", async () => {
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) =>
      fn({ query: vi.fn() })
    );
    const parsed: ParsedScopedImport = {
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
    };
    await expect(applyScopedImport(parsed)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("400 si email vide après sanitization (message avec vide)", async () => {
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) =>
      fn({ query: vi.fn() })
    );
    const parsed: ParsedScopedImport = {
      scope: "cards",
      cards: [
        {
          email: "",
          first_name: null,
          last_name: null,
          mobile: null,
          posteLabel: "",
          directionLabel: "",
        },
      ],
    };
    await expect(applyScopedImport(parsed)).rejects.toMatchObject({
      statusCode: 400,
      data: { error: expect.stringContaining("(vide)") },
    });
  });

  it("cartes : avertissements si direction et poste inconnus", async () => {
    const q = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT department_id FROM cards")) {
        return { rows: [{}], rowCount: 1 };
      }
      if (sql.includes("FROM departments") && sql.includes("OR lower(trim(label_en))")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes("FROM job_titles") && sql.includes("OR lower(trim(label_en))")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes("INSERT INTO cards")) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) => fn({ query: q }));

    const parsed: ParsedScopedImport = {
      scope: "cards",
      cards: [
        {
          email: "a@b.example",
          first_name: "A",
          last_name: "B",
          mobile: null,
          posteLabel: "Inconnu",
          directionLabel: "Nulle part",
        },
      ],
    };
    const res = await applyScopedImport(parsed);
    expect(res.warnings.length).toBeGreaterThanOrEqual(2);
    expect(res.imported.cards).toBe(1);
  });

  it("cartes : schéma sans department_id (insert simplifié)", async () => {
    const q = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT department_id FROM cards")) {
        throw new Error("column does not exist");
      }
      if (sql.includes("INSERT INTO cards")) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) => fn({ query: q }));

    const parsed: ParsedScopedImport = {
      scope: "cards",
      cards: [
        {
          email: "legacy@b.example",
          first_name: null,
          last_name: null,
          mobile: null,
          posteLabel: "",
          directionLabel: "",
        },
      ],
    };
    const res = await applyScopedImport(parsed);
    expect(res.imported.cards).toBe(1);
    expect(
      q.mock.calls.some((c) => String(c[0]).includes("INSERT INTO cards") && String(c[0]).includes("mobile)"))
    ).toBe(true);
  });

  it("cartes : department_id annulé si la ligne département n’existe plus", async () => {
    const deptId = "550e8400-e29b-41d4-a716-446655440001";
    const jobId = "550e8400-e29b-41d4-a716-446655440002";
    const q = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes("SELECT department_id FROM cards")) {
        return { rows: [{}], rowCount: 1 };
      }
      if (sql.includes("FROM departments") && sql.includes("OR lower(trim(label_en))")) {
        return { rows: [{ id: deptId }], rowCount: 1 };
      }
      if (sql.includes("FROM job_titles") && sql.includes("OR lower(trim(label_en))")) {
        return { rows: [{ id: jobId }], rowCount: 1 };
      }
      if (sql.includes("FROM departments WHERE id")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes("FROM job_titles WHERE id")) {
        return { rows: [{ "?column?": 1 }], rowCount: 1 };
      }
      if (sql.includes("INSERT INTO cards")) {
        expect(params?.[9]).toBeNull();
        expect(params?.[10]).toBe(jobId);
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) => fn({ query: q }));

    const parsed: ParsedScopedImport = {
      scope: "cards",
      cards: [
        {
          email: "chk@b.example",
          first_name: null,
          last_name: null,
          mobile: null,
          posteLabel: "Titre",
          directionLabel: "Dir",
        },
      ],
    };
    const res = await applyScopedImport(parsed);
    expect(res.imported.cards).toBe(1);
  });

  it("cartes : job_title_id annulé si la ligne titre n’existe plus", async () => {
    const deptId = "550e8400-e29b-41d4-a716-446655440099";
    const jobId = "550e8400-e29b-41d4-a716-446655440088";
    const q = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes("SELECT department_id FROM cards")) {
        return { rows: [{}], rowCount: 1 };
      }
      if (sql.includes("FROM departments") && sql.includes("OR lower(trim(label_en))")) {
        return { rows: [{ id: deptId }], rowCount: 1 };
      }
      if (sql.includes("FROM job_titles") && sql.includes("OR lower(trim(label_en))")) {
        return { rows: [{ id: jobId }], rowCount: 1 };
      }
      if (sql.includes("FROM departments WHERE id")) {
        return { rows: [{ "?column?": 1 }], rowCount: 1 };
      }
      if (sql.includes("FROM job_titles WHERE id")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes("INSERT INTO cards")) {
        expect(params?.[9]).toBe(deptId);
        expect(params?.[10]).toBeNull();
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) => fn({ query: q }));

    const parsed: ParsedScopedImport = {
      scope: "cards",
      cards: [
        {
          email: "jobchk@b.example",
          first_name: null,
          last_name: null,
          mobile: null,
          posteLabel: "Poste",
          directionLabel: "Dept",
        },
      ],
    };
    const res = await applyScopedImport(parsed);
    expect(res.imported.cards).toBe(1);
  });

  it("cartes : plafonne les avertissements à 100", async () => {
    const q = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT department_id FROM cards")) {
        return { rows: [{}], rowCount: 1 };
      }
      if (sql.includes("FROM departments") && sql.includes("OR lower(trim(label_en))")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes("FROM job_titles") && sql.includes("OR lower(trim(label_en))")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes("INSERT INTO cards")) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) => fn({ query: q }));

    const cards = Array.from({ length: 51 }, (_, i) => ({
      email: `cap${i}@example.com`,
      first_name: null as string | null,
      last_name: null as string | null,
      mobile: null as string | null,
      posteLabel: "P",
      directionLabel: "D",
    }));
    const res = await applyScopedImport({ scope: "cards", cards });
    expect(res.warnings.length).toBe(100);
    expect(res.imported.cards).toBe(51);
  });

  it("cartes : import complet avec département et titre résolus (CHK OK)", async () => {
    const deptId = "550e8400-e29b-41d4-a716-446655440011";
    const jobId = "550e8400-e29b-41d4-a716-446655440022";
    const q = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes("SELECT department_id FROM cards")) {
        return { rows: [{}], rowCount: 1 };
      }
      if (sql.includes("FROM departments") && sql.includes("OR lower(trim(label_en))")) {
        return { rows: [{ id: deptId }], rowCount: 1 };
      }
      if (sql.includes("FROM job_titles") && sql.includes("OR lower(trim(label_en))")) {
        return { rows: [{ id: jobId }], rowCount: 1 };
      }
      if (sql.includes("FROM departments WHERE id")) {
        return { rows: [{}], rowCount: 1 };
      }
      if (sql.includes("FROM job_titles WHERE id")) {
        return { rows: [{}], rowCount: 1 };
      }
      if (sql.includes("INSERT INTO cards") && sql.includes("department_id")) {
        expect(params?.[9]).toBe(deptId);
        expect(params?.[10]).toBe(jobId);
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) => fn({ query: q }));

    const res = await applyScopedImport({
      scope: "cards",
      cards: [
        {
          email: "full@example.com",
          first_name: "Léa",
          last_name: "Martin",
          mobile: "6 77 88 99 00",
          posteLabel: "Analyste",
          directionLabel: "DSI",
        },
      ],
    });
    expect(res.warnings).toEqual([]);
    expect(res.imported.cards).toBe(1);
  });

  it("cartes : avertissement seulement pour direction inconnue", async () => {
    const q = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT department_id FROM cards")) {
        return { rows: [{}], rowCount: 1 };
      }
      if (sql.includes("FROM departments") && sql.includes("OR lower(trim(label_en))")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes("INSERT INTO cards")) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) => fn({ query: q }));
    const res = await applyScopedImport({
      scope: "cards",
      cards: [
        {
          email: "donly@example.com",
          first_name: null,
          last_name: null,
          mobile: null,
          posteLabel: "",
          directionLabel: "Nope",
        },
      ],
    });
    expect(res.warnings).toHaveLength(1);
    expect(res.warnings[0]).toContain("Direction non reconnue");
  });

  it("cartes : avertissement seulement pour poste inconnu", async () => {
    const q = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT department_id FROM cards")) {
        return { rows: [{}], rowCount: 1 };
      }
      if (sql.includes("FROM job_titles") && sql.includes("OR lower(trim(label_en))")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes("INSERT INTO cards")) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) => fn({ query: q }));
    const res = await applyScopedImport({
      scope: "cards",
      cards: [
        {
          email: "jonly@example.com",
          first_name: null,
          last_name: null,
          mobile: null,
          posteLabel: "Nope",
          directionLabel: "",
        },
      ],
    });
    expect(res.warnings).toHaveLength(1);
    expect(res.warnings[0]).toContain("Poste non reconnu");
  });

  it("cartes : schéma legacy avec prénom et mobile formatés", async () => {
    const q = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes("SELECT department_id FROM cards")) {
        throw new Error("no column");
      }
      if (sql.includes("INSERT INTO cards")) {
        expect(params?.[2]).toBe("Jean");
        expect(params?.[8]).toMatch(/655/);
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    mocks.withTransaction.mockImplementation(async (fn: (c: unknown) => Promise<unknown>) => fn({ query: q }));
    const res = await applyScopedImport({
      scope: "cards",
      cards: [
        {
          email: "legacy2@example.com",
          first_name: "Jean",
          last_name: "Dupont",
          mobile: "655443322",
          posteLabel: "Chef",
          directionLabel: "RH",
        },
      ],
    });
    expect(res.imported.cards).toBe(1);
  });
});

describe("__adminImportApplyTestHooks", () => {
  it("resolveDepartmentId : chaîne vide après trim", async () => {
    const query = vi.fn();
    await resolveDepartmentId({ query } as never, "   \t  ");
    expect(query).not.toHaveBeenCalled();
  });

  it("resolveDepartmentId : trouvé / absent", async () => {
    const q1 = vi.fn().mockResolvedValueOnce({ rows: [{ id: "d1" }] });
    expect(await resolveDepartmentId({ query: q1 } as never, "  IT  ")).toBe("d1");

    const q2 = vi.fn().mockResolvedValueOnce({ rows: [] });
    expect(await resolveDepartmentId({ query: q2 } as never, "Missing")).toBeNull();
  });

  it("resolveJobTitleId : vide / trouvé", async () => {
    const q0 = vi.fn();
    await resolveJobTitleId({ query: q0 } as never, "");
    expect(q0).not.toHaveBeenCalled();

    const q1 = vi.fn().mockResolvedValueOnce({ rows: [{ id: "j1" }] });
    expect(await resolveJobTitleId({ query: q1 } as never, "Lead")).toBe("j1");
  });

  it("upsertDepartmentPair : rejet si libellés vides après sanitization", async () => {
    await expect(upsertDepartmentPair({ query: vi.fn() } as never, "   ", "Y")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("upsertDepartmentPair : mise à jour par label_fr existant", async () => {
    const existing = "11111111-1111-4111-8111-111111111111";
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: existing }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await upsertDepartmentPair({ query } as never, "Finance", "Finance EN");
    expect(query).toHaveBeenCalledTimes(2);
    expect(String(query.mock.calls[1][0])).toContain("UPDATE departments");
  });

  it("upsertDepartmentPair : mise à jour par label_en existant", async () => {
    const existing = "22222222-2222-4222-8222-222222222222";
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: existing }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await upsertDepartmentPair({ query } as never, "FR", "ENUnique");
    expect(String(query.mock.calls[2][0])).toContain("UPDATE departments");
  });

  it("upsertJobTitlePair : mise à jour par label_fr", async () => {
    const id = "33333333-3333-4333-8333-333333333333";
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await upsertJobTitlePair({ query } as never, "Chef", "Chief");
    expect(String(query.mock.calls[1][0])).toContain("UPDATE job_titles");
  });

  it("upsertJobTitlePair : rejet si libellés vides", async () => {
    await expect(upsertJobTitlePair({ query: vi.fn() } as never, "x", "")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("upsertJobTitlePair : insert si aucune correspondance", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await upsertJobTitlePair({ query } as never, "Nouveau FR", "New EN");
    expect(String(query.mock.calls[2][0])).toContain("INSERT INTO job_titles");
  });

  it("upsertJobTitlePair : mise à jour par label_en existant", async () => {
    const existing = "44444444-4444-4444-8444-444444444444";
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: existing }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await upsertJobTitlePair({ query } as never, "FrLabel", "EnLabel");
    expect(String(query.mock.calls[2][0])).toContain("UPDATE job_titles");
  });
});

describe("applyAdminDataImport (deprecated)", () => {
  it("410", async () => {
    await expect(applyAdminDataImport()).rejects.toMatchObject({ statusCode: 410 });
  });
});
