import { randomUUID } from "node:crypto";
import { createError } from "h3";
import type { AdminLabelPairInput, AdminSimplifiedCardInput, ParsedScopedImport } from "./admin-data-types";
import {
  MAX_IMPORT_CARDS,
  MAX_IMPORT_DEPARTMENTS,
  MAX_IMPORT_JOB_TITLES,
} from "./admin-data-types";
import { FIXED_FAX, FIXED_PHONE, formatGroupedNumber } from "./contact-constants";
import { withTransaction } from "./db";
import {
  isValidEmail,
  MAX_EMAIL_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_NAME_LENGTH,
  sanitizeCell,
} from "./admin-import-validation";
import { invalidateAllLabelListCaches } from "./label-list-cache";
import type { PoolClient } from "pg";

/** Tables normalisées `label_fr` / `label_en` (identifiants SQL figés, pas d’entrée utilisateur). */
type LabelPairTable = "departments" | "job_titles";

async function resolveLabelEntityByName(client: PoolClient, table: LabelPairTable, label: string): Promise<string | null> {
  const t = label.trim();
  if (!t) return null;
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM ${table}
     WHERE lower(trim(label_fr)) = lower(trim($1)) OR lower(trim(label_en)) = lower(trim($1))
     LIMIT 1`,
    [t]
  );
  return rows[0]?.id ?? null;
}

async function upsertLabelPairRow(
  client: PoolClient,
  table: LabelPairTable,
  emptyPairMessage: string,
  fr: string,
  en: string
) {
  const a = sanitizeCell(fr, MAX_LABEL_LENGTH);
  const b = sanitizeCell(en, MAX_LABEL_LENGTH);
  if (!a || !b) {
    throw createError({
      statusCode: 400,
      data: { error: emptyPairMessage },
    });
  }
  const byFr = await client.query<{ id: string }>(
    `SELECT id FROM ${table} WHERE lower(trim(label_fr)) = lower(trim($1)) LIMIT 1`,
    [a]
  );
  if (byFr.rows[0]) {
    await client.query(`UPDATE ${table} SET label_fr = $2, label_en = $3 WHERE id = $1::uuid`, [
      byFr.rows[0].id,
      a,
      b,
    ]);
    return;
  }
  const byEn = await client.query<{ id: string }>(
    `SELECT id FROM ${table} WHERE lower(trim(label_en)) = lower(trim($1)) LIMIT 1`,
    [b]
  );
  if (byEn.rows[0]) {
    await client.query(`UPDATE ${table} SET label_fr = $2, label_en = $3 WHERE id = $1::uuid`, [
      byEn.rows[0].id,
      a,
      b,
    ]);
    return;
  }
  await client.query(`INSERT INTO ${table} (id, label_fr, label_en) VALUES ($1::uuid, $2, $3)`, [
    randomUUID(),
    a,
    b,
  ]);
}

async function applyScopedTx(
  client: PoolClient,
  parsed: ParsedScopedImport
): Promise<{ departments: number; job_titles: number; cards: number; warnings: string[] }> {
  const warnings: string[] = [];
  const pushWarn = (msg: string) => {
    if (warnings.length < 100) warnings.push(msg);
  };

  if (parsed.scope === "departments") {
    if (parsed.departments.length > MAX_IMPORT_DEPARTMENTS) {
      throw createError({
        statusCode: 400,
        data: { error: `Trop de lignes (max ${MAX_IMPORT_DEPARTMENTS}).` },
      });
    }
    for (const p of parsed.departments) {
      await upsertLabelPairRow(
        client,
        "departments",
        "Chaque direction doit avoir label_fr et label_en (non vides).",
        p.label_fr,
        p.label_en
      );
    }
    return { departments: parsed.departments.length, job_titles: 0, cards: 0, warnings };
  }

  if (parsed.scope === "job_titles") {
    if (parsed.job_titles.length > MAX_IMPORT_JOB_TITLES) {
      throw createError({
        statusCode: 400,
        data: { error: `Trop de lignes (max ${MAX_IMPORT_JOB_TITLES}).` },
      });
    }
    for (const p of parsed.job_titles) {
      await upsertLabelPairRow(
        client,
        "job_titles",
        "Chaque titre doit avoir label_fr et label_en (non vides).",
        p.label_fr,
        p.label_en
      );
    }
    return { departments: 0, job_titles: parsed.job_titles.length, cards: 0, warnings };
  }

  if (parsed.cards.length > MAX_IMPORT_CARDS) {
    throw createError({
      statusCode: 400,
      data: { error: `Trop de lignes (max ${MAX_IMPORT_CARDS}).` },
    });
  }

  let cardsHaveRelations = true;
  try {
    await client.query(`SELECT department_id FROM cards LIMIT 1`);
  } catch {
    cardsHaveRelations = false;
  }

  let cardCount = 0;
  for (const c of parsed.cards) {
    const email = sanitizeCell(c.email, MAX_EMAIL_LENGTH).toLowerCase();
    if (!email || !isValidEmail(email)) {
      throw createError({
        statusCode: 400,
        data: { error: `Email invalide ou manquant : ${c.email || "(vide)"}` },
      });
    }
    const first_name = sanitizeCell(c.first_name ?? "", MAX_NAME_LENGTH) || null;
    const last_name = sanitizeCell(c.last_name ?? "", MAX_NAME_LENGTH) || null;
    const mobile = formatGroupedNumber(sanitizeCell(c.mobile ?? "", 40)) || null;
    const posteLabel = sanitizeCell(c.posteLabel, MAX_LABEL_LENGTH);
    const directionLabel = sanitizeCell(c.directionLabel, MAX_LABEL_LENGTH);

    let department_id: string | null = null;
    if (directionLabel) {
      department_id = await resolveLabelEntityByName(client, "departments", directionLabel);
      if (!department_id) {
        pushWarn(`Direction non reconnue pour ${email} : « ${directionLabel} » (ignorée).`);
      }
    }

    let job_title_id: string | null = null;
    if (posteLabel) {
      job_title_id = await resolveLabelEntityByName(client, "job_titles", posteLabel);
      if (!job_title_id) {
        pushWarn(`Poste non reconnu pour ${email} : « ${posteLabel} » (ignoré comme lien titre).`);
      }
    }

    const title = posteLabel || null;
    const phone = FIXED_PHONE;
    const fax = FIXED_FAX;
    const cardId = randomUUID();

    if (department_id && cardsHaveRelations) {
      const chk = await client.query(`SELECT 1 FROM departments WHERE id = $1::uuid LIMIT 1`, [
        department_id,
      ]);
      if (!chk.rowCount) department_id = null;
    }
    if (job_title_id && cardsHaveRelations) {
      const chk = await client.query(`SELECT 1 FROM job_titles WHERE id = $1::uuid LIMIT 1`, [
        job_title_id,
      ]);
      if (!chk.rowCount) job_title_id = null;
    }

    if (cardsHaveRelations) {
      await client.query(
        `
        INSERT INTO cards (id, email, first_name, last_name, company, title, phone, fax, mobile, department_id, job_title_id)
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (email) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          company = EXCLUDED.company,
          title = EXCLUDED.title,
          phone = EXCLUDED.phone,
          fax = EXCLUDED.fax,
          mobile = EXCLUDED.mobile,
          department_id = EXCLUDED.department_id,
          job_title_id = EXCLUDED.job_title_id,
          updated_at = now()
      `,
        [
          cardId,
          email,
          first_name,
          last_name,
          null,
          title,
          phone,
          fax,
          mobile,
          department_id,
          job_title_id,
        ]
      );
    } else {
      await client.query(
        `
        INSERT INTO cards (id, email, first_name, last_name, company, title, phone, fax, mobile)
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (email) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          company = EXCLUDED.company,
          title = EXCLUDED.title,
          phone = EXCLUDED.phone,
          fax = EXCLUDED.fax,
          mobile = EXCLUDED.mobile,
          updated_at = now()
      `,
        [cardId, email, first_name, last_name, null, title, phone, fax, mobile]
      );
    }
    cardCount += 1;
  }

  return { departments: 0, job_titles: 0, cards: cardCount, warnings };
}

export type ScopedImportResult = {
  success: true;
  imported: { departments: number; job_titles: number; cards: number };
  warnings: string[];
};

export async function applyScopedImport(parsed: ParsedScopedImport): Promise<ScopedImportResult> {
  const summary = await withTransaction((client) => applyScopedTx(client, parsed));
  invalidateAllLabelListCaches();
  return {
    success: true,
    imported: {
      departments: summary.departments,
      job_titles: summary.job_titles,
      cards: summary.cards,
    },
    warnings: summary.warnings,
  };
}

/** @deprecated Utiliser applyScopedImport ; conservé si des scripts externes appellent encore l’ancien bundle. */
export async function applyAdminDataImport(): Promise<never> {
  throw createError({
    statusCode: 410,
    data: { error: "Import global retiré : utilisez ?scope=cards|departments|job_titles" },
  });
}

/** Réservé aux tests unitaires (résolution de libellés, branches défensives). */
export const __adminImportApplyTest = {
  resolveLabelEntityByName,
} as const;
