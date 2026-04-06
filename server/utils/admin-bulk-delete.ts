import { isUuid } from "./admin-data-types";

export const MAX_BULK_DELETE_IDS = 500;

export type BulkDeleteIdsResult =
  | { ok: true; ids: string[] }
  | { ok: false; error: string; statusCode: 400 };

/** Valide le corps JSON `{ ids: uuid[] }` pour les routes bulk-delete admin. */
export function parseBulkDeleteUuids(body: { ids?: unknown } | null | undefined): BulkDeleteIdsResult {
  const raw = Array.isArray(body?.ids) ? body.ids : [];
  const ids = raw.filter((x): x is string => typeof x === "string" && isUuid(x));
  if (!ids.length) {
    return { ok: false, error: "ids must be a non-empty array of UUIDs", statusCode: 400 };
  }
  if (ids.length > MAX_BULK_DELETE_IDS) {
    return { ok: false, error: `Maximum ${MAX_BULK_DELETE_IDS} ids per request`, statusCode: 400 };
  }
  return { ok: true, ids };
}
