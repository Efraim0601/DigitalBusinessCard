import { randomUUID } from "node:crypto";
import { createError } from "h3";
import { requireAdmin } from "../../utils/admin-auth";
import {
  ADMIN_DATA_FORMAT_VERSION,
  type AdminDataBundle,
  isUuid,
  MAX_IMPORT_CARDS,
  MAX_IMPORT_DEPARTMENTS,
  MAX_IMPORT_JOB_TITLES,
} from "../../utils/admin-data-types";
import { FIXED_FAX, FIXED_PHONE, formatGroupedNumber } from "../../utils/contact-constants";
import { withTransaction } from "../../utils/db";
import { invalidateAllLabelListCaches } from "../../utils/label-list-cache";

function parseBody(raw: unknown): AdminDataBundle {
  if (!raw || typeof raw !== "object") {
    throw createError({ statusCode: 400, data: { error: "JSON body required" } });
  }
  const b = raw as Record<string, unknown>;
  const formatVersion = Number(b.formatVersion ?? ADMIN_DATA_FORMAT_VERSION);
  if (formatVersion !== ADMIN_DATA_FORMAT_VERSION) {
    throw createError({
      statusCode: 400,
      data: { error: `Unsupported formatVersion (expected ${ADMIN_DATA_FORMAT_VERSION})` },
    });
  }
  if (!Array.isArray(b.departments) || !Array.isArray(b.job_titles) || !Array.isArray(b.cards)) {
    throw createError({
      statusCode: 400,
      data: { error: "departments, job_titles and cards must be arrays" },
    });
  }
  if (b.departments.length > MAX_IMPORT_DEPARTMENTS || b.job_titles.length > MAX_IMPORT_JOB_TITLES) {
    throw createError({ statusCode: 400, data: { error: "Too many departments or job_titles" } });
  }
  if (b.cards.length > MAX_IMPORT_CARDS) {
    throw createError({ statusCode: 400, data: { error: "Too many cards" } });
  }
  return b as unknown as AdminDataBundle;
}

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = parseBody(await readBody(event));

  const summary = await withTransaction(async (client) => {
    let cardsHaveRelations = true;
    try {
      await client.query(`SELECT department_id FROM cards LIMIT 1`);
    } catch {
      cardsHaveRelations = false;
    }

    for (const d of body.departments) {
      if (!d || typeof d !== "object") continue;
      const id = String((d as { id?: string }).id || "").trim();
      const fr = String((d as { label_fr?: string }).label_fr || "").trim();
      const en = String((d as { label_en?: string }).label_en || "").trim();
      if (!isUuid(id) || !fr || !en) {
        throw createError({ statusCode: 400, data: { error: `Invalid department row: ${id || "?"}` } });
      }
      await client.query(
        `INSERT INTO departments (id, label_fr, label_en) VALUES ($1::uuid, $2, $3)
         ON CONFLICT (id) DO UPDATE SET label_fr = EXCLUDED.label_fr, label_en = EXCLUDED.label_en`,
        [id, fr, en]
      );
    }

    for (const j of body.job_titles) {
      if (!j || typeof j !== "object") continue;
      const id = String((j as { id?: string }).id || "").trim();
      const fr = String((j as { label_fr?: string }).label_fr || "").trim();
      const en = String((j as { label_en?: string }).label_en || "").trim();
      if (!isUuid(id) || !fr || !en) {
        throw createError({ statusCode: 400, data: { error: `Invalid job_title row: ${id || "?"}` } });
      }
      await client.query(
        `INSERT INTO job_titles (id, label_fr, label_en) VALUES ($1::uuid, $2, $3)
         ON CONFLICT (id) DO UPDATE SET label_fr = EXCLUDED.label_fr, label_en = EXCLUDED.label_en`,
        [id, fr, en]
      );
    }

    let cardCount = 0;
    for (const c of body.cards) {
      if (!c || typeof c !== "object") continue;
      const email = String((c as { email?: string }).email || "").trim();
      if (!email) {
        throw createError({ statusCode: 400, data: { error: "Card without email" } });
      }
      const first_name = (c as { first_name?: string | null }).first_name ?? null;
      const last_name = (c as { last_name?: string | null }).last_name ?? null;
      const company = (c as { company?: string | null }).company ?? null;
      const title = (c as { title?: string | null }).title ?? null;
      const phone = FIXED_PHONE;
      const fax = FIXED_FAX;
      const mobile = formatGroupedNumber((c as { mobile?: string | null }).mobile) || null;
      const rawDept = (c as { department_id?: string | null }).department_id;
      const rawJob = (c as { job_title_id?: string | null }).job_title_id;
      const department_id =
        rawDept && String(rawDept).trim() && isUuid(String(rawDept)) ? String(rawDept).trim() : null;
      const job_title_id =
        rawJob && String(rawJob).trim() && isUuid(String(rawJob)) ? String(rawJob).trim() : null;

      if (department_id) {
        const chk = await client.query(`SELECT 1 FROM departments WHERE id = $1::uuid LIMIT 1`, [
          department_id,
        ]);
        if (!chk.rowCount) {
          throw createError({
            statusCode: 400,
            data: { error: `Unknown department_id for card ${email}` },
          });
        }
      }
      if (job_title_id) {
        const chk = await client.query(`SELECT 1 FROM job_titles WHERE id = $1::uuid LIMIT 1`, [
          job_title_id,
        ]);
        if (!chk.rowCount) {
          throw createError({
            statusCode: 400,
            data: { error: `Unknown job_title_id for card ${email}` },
          });
        }
      }

      const cidRaw = (c as { id?: string }).id;
      const cardId =
        cidRaw && String(cidRaw).trim() && isUuid(String(cidRaw)) ? String(cidRaw).trim() : randomUUID();

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
            company,
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
          [cardId, email, first_name, last_name, company, title, phone, fax, mobile]
        );
      }
      cardCount += 1;
    }

    return {
      departments: body.departments.length,
      job_titles: body.job_titles.length,
      cards: cardCount,
    };
  });

  invalidateAllLabelListCaches();
  return { success: true, imported: summary };
});
