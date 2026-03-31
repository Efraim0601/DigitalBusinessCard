/**
 * Dictionnaire FR → EN pour les valeurs Titre/Poste et Département affichées sur la carte.
 * On peut étendre cette liste au fil du temps ; si une valeur n'est pas trouvée, l'originale est affichée.
 */
export const cardTitleEn: Record<string, string> = {
  "Ingénieur d'étude": "Study Engineer",
  "Ingénieur d'études": "Study Engineer",
  "Chef de Département": "Department Head",
  "Chef de département": "Department Head",
  "Administrateur Directeur Général": "Chief Executive Officer",
  "Administrateur Directeur General": "Chief Executive Officer",
  "Directeur": "Director",
  "Responsable": "Manager",
  "Assistant": "Assistant",
  "Analyste": "Analyst",
  "Conseiller": "Advisor",
  "Chargé de mission": "Project Officer",
  "Chargé d'études": "Study Officer",
};

export const cardDepartmentEn: Record<string, string> = {
  "Direction des Risques": "Risk Directorate",
  "Direction Générale": "General Management",
  "Direction generale": "General Management",
  "DRI": "DRI",
  "Ressources Humaines": "Human Resources",
  "RH": "HR",
  "Informatique": "IT",
  "DSI": "IT",
  "Comptabilité": "Accounting",
  "Finance": "Finance",
  "Commercial": "Sales",
  "Marketing": "Marketing",
};

function normalizeKey(s: string): string {
  return s.trim().replaceAll(/\s+/g, " ");
}

export function translateCardTitle(value: string | null | undefined, locale: string): string {
  if (!value || value === "undefined") return "";
  if (locale !== "en") return value;
  const key = normalizeKey(value);
  return cardTitleEn[key] ?? cardTitleEn[value] ?? value;
}

export function translateCardDepartment(value: string | null | undefined, locale: string): string {
  if (!value || value === "undefined") return "";
  if (locale !== "en") return value;
  const key = normalizeKey(value);
  return cardDepartmentEn[key] ?? cardDepartmentEn[value] ?? value;
}
