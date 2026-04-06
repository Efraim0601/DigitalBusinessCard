import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_IMPORT_CARDS,
  MAX_IMPORT_DEPARTMENTS,
  MAX_IMPORT_JOB_TITLES,
} from "../../server/utils/admin-data-types";

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

import {
  __adminImportApplyTest,
  applyAdminDataImport,
  applyScopedImport,
} from "../../server/utils/admin-data-import-apply";

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

  it("rejette trop de directions (plafond)", async () => {
    const fakeClient = { query: vi.fn() };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    await expect(
      applyScopedImport({
        scope: "departments",
        departments: Array.from({ length: MAX_IMPORT_DEPARTMENTS + 1 }, () => ({
          label_fr: "a",
          label_en: "b",
        })),
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      data: { error: expect.stringContaining("Trop de lignes") },
    });
  });

  it("rejette direction sans label_fr ou label_en", async () => {
    const fakeClient = { query: vi.fn() };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    await expect(
      applyScopedImport({
        scope: "departments",
        departments: [{ label_fr: "", label_en: "OK" }],
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("met à jour une direction existante (match label_fr)", async () => {
    const existingId = "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee";
    const fakeClient = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("FROM departments WHERE lower(trim(label_fr))")) {
          return { rows: [{ id: existingId }] };
        }
        if (sql.startsWith("UPDATE departments")) {
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`unexpected SQL: ${sql.slice(0, 120)}`);
      }),
    };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    const res = await applyScopedImport({
      scope: "departments",
      departments: [{ label_fr: "DSI", label_en: "IT" }],
    });
    expect(res.imported.departments).toBe(1);
    expect(fakeClient.query).toHaveBeenCalledWith(
      expect.stringMatching(/^UPDATE departments/),
      expect.arrayContaining([existingId, "DSI", "IT"])
    );
  });

  it("met à jour une direction existante (match label_en)", async () => {
    const existingId = "bbbbbbbb-bbbb-4ccc-dddd-eeeeeeeeeeee";
    const fakeClient = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("FROM departments WHERE lower(trim(label_fr))")) {
          return { rows: [] };
        }
        if (sql.includes("FROM departments WHERE lower(trim(label_en))")) {
          return { rows: [{ id: existingId }] };
        }
        if (sql.startsWith("UPDATE departments")) {
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`unexpected SQL: ${sql.slice(0, 120)}`);
      }),
    };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    const res = await applyScopedImport({
      scope: "departments",
      departments: [{ label_fr: "Nouveau FR", label_en: "Legacy EN" }],
    });
    expect(res.imported.departments).toBe(1);
    expect(fakeClient.query).toHaveBeenCalledWith(
      expect.stringMatching(/^UPDATE departments/),
      expect.arrayContaining([existingId])
    );
  });

  it("importe des intitulés de poste", async () => {
    const fakeClient = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("FROM job_titles WHERE lower(trim(label_fr))")) {
          return { rows: [] };
        }
        if (sql.includes("FROM job_titles WHERE lower(trim(label_en))")) {
          return { rows: [] };
        }
        if (sql.startsWith("INSERT INTO job_titles")) {
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`unexpected SQL: ${sql.slice(0, 120)}`);
      }),
    };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    const res = await applyScopedImport({
      scope: "job_titles",
      job_titles: [{ label_fr: "Ingénieur", label_en: "Engineer" }],
    });
    expect(res.imported.job_titles).toBe(1);
    expect(res.imported.departments).toBe(0);
  });

  it("rejette trop d’intitulés (plafond)", async () => {
    const fakeClient = { query: vi.fn() };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    await expect(
      applyScopedImport({
        scope: "job_titles",
        job_titles: Array.from({ length: MAX_IMPORT_JOB_TITLES + 1 }, () => ({
          label_fr: "a",
          label_en: "b",
        })),
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejette trop de cartes (plafond)", async () => {
    const fakeClient = { query: vi.fn() };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    await expect(
      applyScopedImport({
        scope: "cards",
        cards: Array.from({ length: MAX_IMPORT_CARDS + 1 }, (_, i) => ({
          email: `u${i}@x.com`,
          first_name: null,
          last_name: null,
          mobile: null,
          posteLabel: "",
          directionLabel: "",
        })),
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("cartes : schéma sans relations — requête department_id en échec puis INSERT court", async () => {
    const fakeClient = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("SELECT department_id FROM cards LIMIT 1")) {
          return Promise.reject(new Error("no such column"));
        }
        if (sql.includes("INSERT INTO cards") && !sql.includes("department_id")) {
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`unexpected SQL: ${sql.slice(0, 120)}`);
      }),
    };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    const res = await applyScopedImport({
      scope: "cards",
      cards: [
        {
          email: "legacy@example.com",
          first_name: "L",
          last_name: "G",
          mobile: null,
          posteLabel: "",
          directionLabel: "",
        },
      ],
    });
    expect(res.imported.cards).toBe(1);
    expect(res.warnings).toEqual([]);
  });

  it("cartes : import avec relations, direction et poste résolus", async () => {
    const deptId = "550e8400-e29b-41d4-a716-446655440010";
    const titleId = "550e8400-e29b-41d4-a716-446655440020";
    const fakeClient = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("SELECT department_id FROM cards LIMIT 1")) {
          return { rows: [{}] };
        }
        if (sql.includes("FROM departments") && sql.includes("OR lower(trim(label_en))")) {
          return { rows: [{ id: deptId }] };
        }
        if (sql.includes("FROM job_titles") && sql.includes("OR lower(trim(label_en))")) {
          return { rows: [{ id: titleId }] };
        }
        if (sql.includes("SELECT 1 FROM departments WHERE id")) {
          return { rowCount: 1, rows: [{ "?column?": 1 }] };
        }
        if (sql.includes("SELECT 1 FROM job_titles WHERE id")) {
          return { rowCount: 1, rows: [{ "?column?": 1 }] };
        }
        if (sql.includes("INSERT INTO cards") && sql.includes("department_id")) {
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`unexpected SQL: ${sql.slice(0, 120)}`);
      }),
    };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    const res = await applyScopedImport({
      scope: "cards",
      cards: [
        {
          email: "full@example.com",
          first_name: "F",
          last_name: "U",
          mobile: null,
          posteLabel: "Ingénieur",
          directionLabel: "DSI",
        },
      ],
    });
    expect(res.imported.cards).toBe(1);
    expect(res.warnings).toEqual([]);
  });

  it("cartes : direction et poste inconnus produisent des avertissements", async () => {
    const fakeClient = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("SELECT department_id FROM cards LIMIT 1")) {
          return { rows: [{}] };
        }
        if (sql.includes("FROM departments") && sql.includes("OR lower(trim(label_en))")) {
          return { rows: [] };
        }
        if (sql.includes("FROM job_titles") && sql.includes("OR lower(trim(label_en))")) {
          return { rows: [] };
        }
        if (sql.includes("INSERT INTO cards") && sql.includes("department_id")) {
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`unexpected SQL: ${sql.slice(0, 120)}`);
      }),
    };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    const res = await applyScopedImport({
      scope: "cards",
      cards: [
        {
          email: "warn@example.com",
          first_name: "W",
          last_name: "N",
          mobile: null,
          posteLabel: "PosteInconnu",
          directionLabel: "DirInconnue",
        },
      ],
    });
    expect(res.imported.cards).toBe(1);
    expect(res.warnings.some((w) => w.includes("Direction non reconnue"))).toBe(true);
    expect(res.warnings.some((w) => w.includes("Poste non reconnu"))).toBe(true);
  });

  it("cartes : id direction résolu mais absent en base — lien retiré", async () => {
    const staleDeptId = "deadbeef-dead-4dead-dead-deadbeefdead";
    const fakeClient = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("SELECT department_id FROM cards LIMIT 1")) {
          return { rows: [{}] };
        }
        if (sql.includes("FROM departments") && sql.includes("OR lower(trim(label_en))")) {
          return { rows: [{ id: staleDeptId }] };
        }
        if (sql.includes("SELECT 1 FROM departments WHERE id")) {
          return { rowCount: 0, rows: [] };
        }
        if (sql.includes("INSERT INTO cards") && sql.includes("department_id")) {
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`unexpected SQL: ${sql.slice(0, 120)}`);
      }),
    };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    const res = await applyScopedImport({
      scope: "cards",
      cards: [
        {
          email: "stale@example.com",
          first_name: "S",
          last_name: "T",
          mobile: null,
          posteLabel: "",
          directionLabel: "DSI",
        },
      ],
    });
    expect(res.imported.cards).toBe(1);
    const insertCall = fakeClient.query.mock.calls.find(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("INSERT INTO cards")
    );
    expect(insertCall).toBeTruthy();
    const params = insertCall![1] as unknown[];
    expect(params[8]).toBeNull();
  });

  it("rejette email vide pour une carte", async () => {
    const fakeClient = { query: vi.fn() };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    await expect(
      applyScopedImport({
        scope: "cards",
        cards: [
          {
            email: "   ",
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

  it("applyAdminDataImport lève 410 (import global retiré)", async () => {
    await expect(applyAdminDataImport()).rejects.toMatchObject({
      statusCode: 410,
      data: {
        error: expect.stringContaining("scope=cards"),
      },
    });
  });

  it("resolveLabelEntityByName : trim vide sans requête SQL", async () => {
    const client = { query: vi.fn() };
    await expect(
      __adminImportApplyTest.resolveLabelEntityByName(client as never, "departments", "  \t  ")
    ).resolves.toBeNull();
    expect(client.query).not.toHaveBeenCalled();
  });

  it("resolveLabelEntityByName : ligne trouvée renvoie l’id", async () => {
    const id = "550e8400-e29b-41d4-a716-446655440099";
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ id }] }),
    };
    await expect(
      __adminImportApplyTest.resolveLabelEntityByName(client as never, "job_titles", " Chef ")
    ).resolves.toBe(id);
  });

  it("cartes : titre résolu mais absent en base — job_title_id effacé", async () => {
    const titleId = "550e8400-e29b-41d4-a716-446655440020";
    const fakeClient = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("SELECT department_id FROM cards LIMIT 1")) {
          return { rows: [{}] };
        }
        if (sql.includes("FROM job_titles") && sql.includes("OR lower(trim(label_en))")) {
          return { rows: [{ id: titleId }] };
        }
        if (sql.includes("SELECT 1 FROM job_titles WHERE id")) {
          return { rowCount: 0, rows: [] };
        }
        if (sql.includes("INSERT INTO cards") && sql.includes("department_id")) {
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`unexpected SQL: ${sql.slice(0, 120)}`);
      }),
    };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    const res = await applyScopedImport({
      scope: "cards",
      cards: [
        {
          email: "jt@example.com",
          first_name: "J",
          last_name: "T",
          mobile: null,
          posteLabel: "Poste",
          directionLabel: "",
        },
      ],
    });
    expect(res.imported.cards).toBe(1);
    const insertCall = fakeClient.query.mock.calls.find(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("INSERT INTO cards")
    );
    const params = insertCall![1] as unknown[];
    expect(params[10]).toBeNull();
  });

  it("cartes : plafond de 100 avertissements (pushWarn)", async () => {
    const fakeClient = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("SELECT department_id FROM cards LIMIT 1")) {
          return { rows: [{}] };
        }
        if (sql.includes("FROM departments") && sql.includes("OR lower(trim(label_en))")) {
          return { rows: [] };
        }
        if (sql.includes("INSERT INTO cards") && sql.includes("department_id")) {
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`unexpected SQL: ${sql.slice(0, 120)}`);
      }),
    };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    const cards = Array.from({ length: 101 }, (_, i) => ({
      email: `bulk${i}@example.com`,
      first_name: "A",
      last_name: "B",
      mobile: null,
      posteLabel: "",
      directionLabel: `D${i}`,
    }));

    const res = await applyScopedImport({ scope: "cards", cards });
    expect(res.imported.cards).toBe(101);
    expect(res.warnings).toHaveLength(100);
  });

  it("cartes : email chaîne vide — message d’erreur avec (vide)", async () => {
    const fakeClient = { query: vi.fn() };
    mocks.withTransaction.mockImplementation(async (fn: (c: typeof fakeClient) => Promise<unknown>) =>
      fn(fakeClient)
    );

    try {
      await applyScopedImport({
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
      });
      expect.fail("devait lever");
    } catch (e: unknown) {
      expect(e).toMatchObject({
        statusCode: 400,
        data: { error: expect.stringContaining("(vide)") },
      });
    }
  });
});
