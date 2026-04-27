export type TemplateId = "classic" | "modern";

export interface CardPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CardTemplate {
  id: TemplateId;
  background: string;
  labelKey: string;
  /** Padding interne en pixels (référentiel 600×340) pour éviter les zones décoratives du fond. */
  contentPadding: CardPadding;
  /** Valeur CSS `background-size`. Défaut `cover` peut rogner les bordures si ratio différent du 600×340. */
  backgroundSize: "cover" | "contain" | "100% 100%";
}

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "classic",
    background: "/carte-digitale-bg.png",
    labelKey: "template.classic",
    contentPadding: { top: 113, right: 32, bottom: 20, left: 32 },
    backgroundSize: "cover",
  },
  {
    id: "modern",
    background: "/background_new.jpg",
    labelKey: "template.modern",
    contentPadding: { top: 100, right: 28, bottom: 45, left: 135 },
    backgroundSize: "100% 100%",
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
