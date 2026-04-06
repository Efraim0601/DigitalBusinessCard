import { createError } from "h3";
import * as XLSX from "xlsx/dist/xlsx.full.min.js";
import type { AdminImportScope, AdminSimplifiedCardInput, ParsedScopedImport } from "./admin-data-types";
import type { CardSimplifiedExportRow, DepartmentExportRow, JobTitleExportRow } from "./admin-export-data";

/** En-têtes export cartes (alignés maquette RH). */
export const CARD_CSV_HEADERS = ["N°", "email", "first_name", "last_name", "mobile", "poste", "Direction"] as const;

export const DEPARTMENT_CSV_HEADERS = ["label_fr", "label_en"] as const;
export const JOB_TITLE_CSV_HEADERS = ["label_fr", "label_en"] as const;

function normHeader(k: string): string {
  return String(k)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/°/g, "");
}

function rowToNorm(row: Record<string, unknown>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = normHeader(k);
    if (!key) continue;
    if (v == null || v === "") o[key] = "";
    else if (typeof v === "number") o[key] = String(v);
    else o[key] = String(v).trim();
  }
  return o;
}

function sheetToRows(sheet: XLSX.WorkSheet): Record<string, string>[] {
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  return raw.map(rowToNorm).filter((r) => Object.values(r).some((v) => v !== ""));
}

function csvStringToRows(csv: string): Record<string, string>[] {
  const firstLine = csv.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const semi = (firstLine.match(/;/g) ?? []).length;
  const comma = (firstLine.match(/,/g) ?? []).length;
  const fs = semi > comma ? ";" : ",";
  const wb = XLSX.read(csv, { type: "string", FS: fs, raw: false });
  const name = wb.SheetNames[0];
  if (!name) return [];
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  return sheetToRows(sheet);
}

function csvCell(v: string | number | null | undefined): string {
  if (v == null || v === "") return "";
  const s = String(v);
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: Record<string, unknown>[], keys: readonly string[]): string {
  const BOM = "\uFEFF";
  const header = keys.map((k) => csvCell(k)).join(";");
  const lines = rows.map((row) => keys.map((k) => csvCell((row as Record<string, unknown>)[k])).join(";"));
  return `${BOM}${header}\n${lines.join("\n")}`;
}

export function buildCardsSimplifiedCsvBuffer(rows: CardSimplifiedExportRow[]): Buffer {
  const plain = rows.map((r) => ({
    "N°": r["N°"],
    email: r.email,
    first_name: r.first_name,
    last_name: r.last_name,
    mobile: r.mobile,
    poste: r.poste,
    Direction: r.Direction,
  }));
  return Buffer.from(rowsToCsv(plain, CARD_CSV_HEADERS), "utf8");
}

export function buildDepartmentsCsvBuffer(rows: DepartmentExportRow[]): Buffer {
  return Buffer.from(rowsToCsv(rows as unknown as Record<string, unknown>[], DEPARTMENT_CSV_HEADERS), "utf8");
}

export function buildJobTitlesCsvBuffer(rows: JobTitleExportRow[]): Buffer {
  return Buffer.from(rowsToCsv(rows as unknown as Record<string, unknown>[], JOB_TITLE_CSV_HEADERS), "utf8");
}

function rowToSimplifiedCard(r: Record<string, string>): AdminSimplifiedCardInput | null {
  const email = r.email || r.e_mail || r.mail || "";
  if (!email) return null;
  const posteLabel =
    r.poste || r.title || r.titre || r.job_title || r.jobtitle || r.fonction || "";
  const directionLabel =
    r.direction ||
    r.departement ||
    r.département ||
    r.department ||
    r.direction_label ||
    "";
  return {
    email,
    first_name: r.first_name || r.prenom || null,
    last_name: r.last_name || r.nom || null,
    mobile: r.mobile || r.portable || r.téléphone_mobile || null,
    posteLabel: posteLabel.trim(),
    directionLabel: directionLabel.trim(),
  };
}

function rowsToSimplifiedCards(rows: Record<string, string>[]): AdminSimplifiedCardInput[] {
  const out: AdminSimplifiedCardInput[] = [];
  for (const r of rows) {
    const c = rowToSimplifiedCard(r);
    if (c) out.push(c);
  }
  return out;
}

function rowsToLabelPairs(rows: Record<string, string>[]): { label_fr: string; label_en: string }[] {
  const out: { label_fr: string; label_en: string }[] = [];
  for (const r of rows) {
    const fr = r.label_fr || r.libelle_fr || r.fr || r.libellé_fr || "";
    const en = r.label_en || r.libelle_en || r.en || "";
    if (!fr.trim() && !en.trim()) continue;
    out.push({ label_fr: fr.trim(), label_en: en.trim() });
  }
  return out;
}

function readXlsxFirstSheet(buf: Buffer): Record<string, string>[] {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false, raw: false });
  const name = wb.SheetNames[0];
  if (!name) return [];
  const sh = wb.Sheets[name];
  if (!sh) return [];
  return sheetToRows(sh);
}

export function parseScopedImportBuffer(
  buf: Buffer,
  filename: string,
  scope: AdminImportScope
): ParsedScopedImport {
  const name = filename.toLowerCase();

  if (name.endsWith(".zip")) {
    throw createError({
      statusCode: 400,
      data: { error: "L’import par onglet n’accepte pas les fichiers ZIP. Utilisez un fichier .csv ou .xlsx." },
    });
  }

  let rows: Record<string, string>[];
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    rows = readXlsxFirstSheet(buf);
  } else if (name.endsWith(".csv")) {
    rows = csvStringToRows(buf.toString("utf8"));
  } else {
    throw createError({
      statusCode: 400,
      data: { error: "Format non supporté. Utilisez .csv ou .xlsx." },
    });
  }

  if (scope === "cards") {
    return { scope: "cards", cards: rowsToSimplifiedCards(rows) };
  }

  if (scope === "departments") {
    return { scope: "departments", departments: rowsToLabelPairs(rows) };
  }

  return { scope: "job_titles", job_titles: rowsToLabelPairs(rows) };
}
