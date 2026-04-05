import { createError } from "h3";
import JSZip from "jszip";
/** Fichier unique : l’entrée `xlsx` tire `dist/cpexcel.js` en import séparé, ce qui casse Nitro/Docker (chemins absolus). */
import * as XLSX from "xlsx/dist/xlsx.full.min.js";
import {
  ADMIN_DATA_FORMAT_VERSION,
  type AdminDataBundle,
  type AdminDataCard,
  type AdminDataDepartment,
  type AdminDataJobTitle,
} from "./admin-data-types";

const DEPT_KEYS = ["id", "label_fr", "label_en"] as const;
const CARD_KEYS = [
  "id",
  "email",
  "first_name",
  "last_name",
  "company",
  "title",
  "phone",
  "fax",
  "mobile",
  "department_id",
  "job_title_id",
] as const;

const DEPT_ALIASES = ["departments", "directions", "departements"];
const JOB_ALIASES = ["jobtitles", "job_titles", "titres", "titres_postes"];
const CARD_ALIASES = ["cards", "cartes"];

function normHeader(k: string): string {
  return String(k).trim().toLowerCase().replace(/\s+/g, "_");
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

function rowsToDepartments(rows: Record<string, string>[]): AdminDataDepartment[] {
  const out: AdminDataDepartment[] = [];
  for (const r of rows) {
    const id = r.id ?? r.uuid ?? "";
    const label_fr = r.label_fr ?? r.libelle_fr ?? r.fr ?? "";
    const label_en = r.label_en ?? r.libelle_en ?? r.en ?? "";
    if (!id && !label_fr && !label_en) continue;
    out.push({ id, label_fr, label_en });
  }
  return out;
}

function rowsToJobTitles(rows: Record<string, string>[]): AdminDataJobTitle[] {
  return rowsToDepartments(rows) as AdminDataJobTitle[];
}

function rowsToCards(rows: Record<string, string>[]): AdminDataCard[] {
  const out: AdminDataCard[] = [];
  for (const r of rows) {
    const email = r.email ?? r.e_mail ?? r.mail ?? "";
    if (!email) continue;
    out.push({
      id: r.id || undefined,
      email,
      first_name: r.first_name || r.prenom || null,
      last_name: r.last_name || r.nom || null,
      company: r.company || r.societe || null,
      title: r.title || r.poste || null,
      phone: r.phone || r.telephone || null,
      fax: r.fax || null,
      mobile: r.mobile || r.portable || null,
      department_id: r.department_id || r.direction_id || null,
      job_title_id: r.job_title_id || r.titre_id || null,
    });
  }
  return out;
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

function pickSheet(wb: XLSX.WorkBook, aliases: string[]): XLSX.WorkSheet | null {
  const lowerNames = wb.SheetNames.map((n) => n.toLowerCase().replace(/\s+/g, ""));
  for (const a of aliases) {
    const want = a.toLowerCase().replace(/\s+/g, "");
    const idx = lowerNames.findIndex((n) => n === want || n.includes(want));
    if (idx >= 0) {
      const sn = wb.SheetNames[idx]!;
      return wb.Sheets[sn]!;
    }
  }
  return null;
}

function workbookToBundle(wb: XLSX.WorkBook): AdminDataBundle {
  if (!wb.SheetNames.length) {
    throw createError({ statusCode: 400, data: { error: "Empty workbook" } });
  }

  let deptSh = pickSheet(wb, DEPT_ALIASES);
  let jobSh = pickSheet(wb, JOB_ALIASES);
  let cardSh = pickSheet(wb, CARD_ALIASES);

  if ((!deptSh || !jobSh || !cardSh) && wb.SheetNames.length >= 3) {
    deptSh = deptSh ?? wb.Sheets[wb.SheetNames[0]!]!;
    jobSh = jobSh ?? wb.Sheets[wb.SheetNames[1]!]!;
    cardSh = cardSh ?? wb.Sheets[wb.SheetNames[2]!]!;
  }

  if (!deptSh || !jobSh || !cardSh) {
    throw createError({
      statusCode: 400,
      data: {
        error:
          "Excel must contain sheets Departments, JobTitles and Cards (or 3 sheets in order: directions, titres, cartes).",
      },
    });
  }

  return {
    formatVersion: ADMIN_DATA_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    departments: rowsToDepartments(sheetToRows(deptSh)),
    job_titles: rowsToJobTitles(sheetToRows(jobSh)),
    cards: rowsToCards(sheetToRows(cardSh)),
  };
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

export type AdminExportRows = {
  departments: AdminDataDepartment[];
  job_titles: AdminDataJobTitle[];
  cards: AdminDataCard[];
};

export function buildXlsxBuffer(data: AdminExportRows): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(data.departments, { header: [...DEPT_KEYS] }),
    "Departments"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(data.job_titles, { header: [...DEPT_KEYS] }),
    "JobTitles"
  );
  const cardRows = data.cards.map((c) => ({
    id: c.id ?? "",
    email: c.email,
    first_name: c.first_name ?? "",
    last_name: c.last_name ?? "",
    company: c.company ?? "",
    title: c.title ?? "",
    phone: c.phone ?? "",
    fax: c.fax ?? "",
    mobile: c.mobile ?? "",
    department_id: c.department_id ?? "",
    job_title_id: c.job_title_id ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cardRows, { header: [...CARD_KEYS] }), "Cards");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

export async function buildCsvZipBuffer(data: AdminExportRows): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("departments.csv", rowsToCsv(data.departments as unknown as Record<string, unknown>[], DEPT_KEYS));
  zip.file("job_titles.csv", rowsToCsv(data.job_titles as unknown as Record<string, unknown>[], DEPT_KEYS));
  zip.file("cards.csv", rowsToCsv(data.cards as unknown as Record<string, unknown>[], CARD_KEYS));
  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return Buffer.from(out);
}

async function parseCsvZip(buf: Buffer): Promise<AdminDataBundle> {
  const zip = await JSZip.loadAsync(buf);
  const map = new Map<string, string>();
  for (const path of Object.keys(zip.files)) {
    const f = zip.files[path];
    if (!f || f.dir) continue;
    const base = path.split(/[/\\]/).pop()!.toLowerCase();
    map.set(base, await f.async("string"));
  }
  const deptT =
    map.get("departments.csv") ?? map.get("directions.csv") ?? map.get("departements.csv");
  const jobT = map.get("job_titles.csv") ?? map.get("titres.csv");
  const cardT = map.get("cards.csv") ?? map.get("cartes.csv");
  if (!deptT || !jobT || !cardT) {
    throw createError({
      statusCode: 400,
      data: {
        error:
          "Le fichier ZIP doit contenir departments.csv, job_titles.csv et cards.csv (noms acceptés : directions, titres, cartes).",
      },
    });
  }
  return {
    formatVersion: ADMIN_DATA_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    departments: rowsToDepartments(csvStringToRows(deptT)),
    job_titles: rowsToJobTitles(csvStringToRows(jobT)),
    cards: rowsToCards(csvStringToRows(cardT)),
  };
}

function basenameLower(filename: string): string {
  const p = filename.split(/[/\\]/).pop() ?? filename;
  return p.toLowerCase();
}

function parseSingleCsv(buf: Buffer, filename: string): AdminDataBundle {
  const csv = buf.toString("utf8");
  const base = basenameLower(filename);
  const rows = csvStringToRows(csv);
  const emptyBundle = (): AdminDataBundle => ({
    formatVersion: ADMIN_DATA_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    departments: [],
    job_titles: [],
    cards: [],
  });

  if (
    base === "departments.csv" ||
    base === "directions.csv" ||
    base === "departements.csv" ||
    (base.startsWith("departments") && base.endsWith(".csv"))
  ) {
    const b = emptyBundle();
    b.departments = rowsToDepartments(rows);
    return b;
  }
  if (base === "job_titles.csv" || base === "titres.csv" || (base.startsWith("job_titles") && base.endsWith(".csv"))) {
    const b = emptyBundle();
    b.job_titles = rowsToJobTitles(rows);
    return b;
  }
  if (
    base === "cards.csv" ||
    base === "cartes.csv" ||
    (base.startsWith("cards") && base.endsWith(".csv"))
  ) {
    const b = emptyBundle();
    b.cards = rowsToCards(rows);
    return b;
  }

  throw createError({
    statusCode: 400,
    data: {
      error:
        "Fichier CSV non reconnu. Utilisez departments.csv, job_titles.csv ou cards.csv, ou importez un .xlsx ou un .zip.",
    },
  });
}

export async function parseAdminImportBuffer(buf: Buffer, filename: string): Promise<AdminDataBundle> {
  const name = filename.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const wb = XLSX.read(buf, { type: "buffer", cellDates: false, raw: false });
    return workbookToBundle(wb);
  }
  if (name.endsWith(".zip")) {
    return parseCsvZip(buf);
  }
  if (name.endsWith(".csv")) {
    return parseSingleCsv(buf, filename);
  }
  throw createError({
    statusCode: 400,
    data: { error: "Format non supporté. Utilisez .xlsx, .zip (CSV) ou .csv." },
  });
}
