import type { H3Event } from "h3";
import { getQuery } from "h3";
import { query } from "./db";

/** Tables métier partagées (libellés FR/EN) — identifiants SQL figés pour éviter l'injection. */
export type LabelTable = "departments" | "job_titles";

const TABLE_SQL: Record<LabelTable, string> = {
  departments: "departments",
  job_titles: "job_titles",
};

export type LabelRow = {
  id: string;
  label_fr: string;
  label_en: string;
  created_at: string;
};

export function readPagedListQuery(event: H3Event) {
  const q = getQuery(event);
  return {
    limit: Math.min(200, Math.max(1, Number(q.limit ?? 20))),
    offset: Math.max(0, Number(q.offset ?? 0)),
    searchLike: typeof q.q === "string" && q.q.trim() ? `%${q.q.trim()}%` : null,
  };
}

export async function listLabelsPaged(table: LabelTable, p: ReturnType<typeof readPagedListQuery>) {
  const sqlTable = TABLE_SQL[table];
  const { limit, offset, searchLike } = p;

  const { rows: totalRows } = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM ${sqlTable}
     WHERE ($1::text IS NULL) OR (label_fr ILIKE $1 OR label_en ILIKE $1)`,
    [searchLike]
  );
  const total = totalRows[0]?.total ?? 0;

  const { rows } = await query<LabelRow>(
    `SELECT id, label_fr, label_en, created_at
     FROM ${sqlTable}
     WHERE ($3::text IS NULL) OR (label_fr ILIKE $3 OR label_en ILIKE $3)
     ORDER BY label_fr ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset, searchLike]
  );

  return { items: rows, total, limit, offset };
}

export function missingRelationMessage(table: LabelTable): string {
  return `Table '${TABLE_SQL[table]}' absente. Exécutez la migration : sql/migration_departments_job_titles.sql`;
}

export function isPgMissingRelation(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  return err?.code === "42P01" || (typeof err?.message === "string" && err.message.includes("does not exist"));
}

export async function insertLabelPair(
  table: LabelTable,
  label_fr: string,
  label_en: string
): Promise<LabelRow | undefined> {
  const t = TABLE_SQL[table];
  const { rows } = await query<LabelRow>(
    `INSERT INTO ${t} (label_fr, label_en)
     VALUES ($1, $2)
     RETURNING id, label_fr, label_en, created_at`,
    [label_fr, label_en]
  );
  return rows[0];
}

export async function updateLabelById(
  table: LabelTable,
  id: string,
  body: { label_fr?: string; label_en?: string },
  notFoundMessage: string
): Promise<{ ok: true; row: LabelRow } | { ok: false; status: number; error: string }> {
  const t = TABLE_SQL[table];
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (body.label_fr !== undefined) {
    updates.push(`label_fr = $${idx}`);
    values.push(body.label_fr);
    idx += 1;
  }
  if (body.label_en !== undefined) {
    updates.push(`label_en = $${idx}`);
    values.push(body.label_en);
    idx += 1;
  }

  if (!updates.length) {
    return { ok: false, status: 400, error: "nothing to update" };
  }

  values.push(id);
  const { rows } = await query<LabelRow>(
    `UPDATE ${t} SET ${updates.join(", ")} WHERE id = $${idx}
     RETURNING id, label_fr, label_en, created_at`,
    values
  );
  if (!rows.length) {
    return { ok: false, status: 404, error: notFoundMessage };
  }
  return { ok: true, row: rows[0] };
}

export async function deleteLabelById(
  table: LabelTable,
  id: string,
  notFoundMessage: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const t = TABLE_SQL[table];
  const { rows } = await query<{ id: string }>(`DELETE FROM ${t} WHERE id = $1 RETURNING id`, [id]);
  if (!rows.length) {
    return { ok: false, status: 404, error: notFoundMessage };
  }
  return { ok: true };
}
