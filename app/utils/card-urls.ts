/**
 * Construit l’URL publique de la carte sans les paramètres réservés (partage / QR).
 */
export function buildPublicCardUrl(
  origin: string,
  path: string,
  query: Record<string, string | string[] | undefined>
): string {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    if (raw === undefined) continue;
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (v !== undefined && v !== "") params.set(key, v);
  }
  params.delete("owner");
  params.delete("employee");
  const search = params.toString();
  const suffix = search ? `?${search}` : "";
  return `${origin}${path}${suffix}`;
}

/** Ajoute `employee=1` pour le lien employé (RH → collaborateur). */
export function withEmployeeQuery(publicUrl: string): string {
  if (!publicUrl) return "";
  return publicUrl.includes("?") ? `${publicUrl}&employee=1` : `${publicUrl}?employee=1`;
}
