import { setResponseHeader } from "h3";
import { requireAdmin } from "../../utils/admin-auth";
import type { AdminImportScope } from "../../utils/admin-data-types";
import {
  buildCardsSimplifiedCsvBuffer,
  buildDepartmentsCsvBuffer,
  buildJobTitlesCsvBuffer,
} from "../../utils/admin-spreadsheet";

const SCOPES: AdminImportScope[] = ["cards", "departments", "job_titles"];

function parseScope(raw: string | undefined): AdminImportScope | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  return SCOPES.includes(s as AdminImportScope) ? (s as AdminImportScope) : null;
}

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const scope = parseScope(getQuery(event).scope as string | undefined);
  if (!scope) {
    setResponseStatus(event, 400);
    return {
      error:
        "Paramètre « scope » requis : cards, departments ou job_titles (ex. /api/admin/data-template?scope=cards).",
    };
  }

  if (scope === "cards") {
    const buf = buildCardsSimplifiedCsvBuffer([
      {
        "N°": 1,
        email: "jean.dupont@afrilandfirstbank.com",
        first_name: "Jean",
        last_name: "Dupont",
        mobile: "690 000 000",
        poste: "",
        poste_fr: "Ingénieur d'étude",
        poste_en: "Study Engineer",
        Direction: "",
        direction_fr: "Direction des Risques",
        direction_en: "Risk Directorate",
      },
      {
        "N°": 2,
        email: "marie.martin@afrilandfirstbank.com",
        first_name: "Marie",
        last_name: "Martin",
        mobile: "690 000 001",
        poste: "Responsable",
        poste_fr: "",
        poste_en: "",
        Direction: "Ressources Humaines",
        direction_fr: "",
        direction_en: "",
      },
    ]);
    setResponseHeader(event, "Content-Type", "text/csv; charset=utf-8");
    setResponseHeader(event, "Content-Disposition", 'attachment; filename="modele-cartes.csv"');
    return buf;
  }

  if (scope === "departments") {
    const buf = buildDepartmentsCsvBuffer([
      { label_fr: "Direction des Risques", label_en: "Risk Directorate" },
      { label_fr: "Ressources Humaines", label_en: "Human Resources" },
    ]);
    setResponseHeader(event, "Content-Type", "text/csv; charset=utf-8");
    setResponseHeader(event, "Content-Disposition", 'attachment; filename="modele-directions.csv"');
    return buf;
  }

  const buf = buildJobTitlesCsvBuffer([
    { label_fr: "Ingénieur d'étude", label_en: "Study Engineer" },
    { label_fr: "Responsable", label_en: "Manager" },
  ]);
  setResponseHeader(event, "Content-Type", "text/csv; charset=utf-8");
  setResponseHeader(event, "Content-Disposition", 'attachment; filename="modele-titres-postes.csv"');
  return buf;
});
