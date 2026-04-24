export type TemplateId = "classic" | "modern";

export interface CardTemplate {
  id: TemplateId;
  background: string;
  labelKey: string;
  /** Classe Tailwind appliquée au conteneur interne (padding) pour éviter les zones décoratives du fond. */
  contentClass: string;
}

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "classic",
    background: "/carte-digitale-bg.png",
    labelKey: "template.classic",
    contentClass: "px-8 pt-[113px] pb-5",
  },
  {
    id: "modern",
    background: "/background_new.jpg",
    labelKey: "template.modern",
    contentClass: "pl-[110px] pr-6 pt-[95px] pb-5",
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
