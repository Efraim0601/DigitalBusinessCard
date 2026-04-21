export type TemplateId = "classic" | "modern";

export interface CardTemplate {
  id: TemplateId;
  background: string;
  labelKey: string;
}

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "classic",
    background: "/carte-digitale-bg.png",
    labelKey: "template.classic",
  },
  {
    id: "modern",
    background: "/background_new.jpg",
    labelKey: "template.modern",
  },
];

export const DEFAULT_TEMPLATE_ID: TemplateId = "classic";

export function isValidTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && CARD_TEMPLATES.some((t) => t.id === value);
}

export function getTemplate(id: string | null | undefined): CardTemplate {
  const found = CARD_TEMPLATES.find((t) => t.id === id);
  return found ?? CARD_TEMPLATES[0]!;
}
