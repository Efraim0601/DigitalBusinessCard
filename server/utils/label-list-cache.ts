import type { LabelTable } from "./label-entities";

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const TTL_MS = Math.max(
  1000,
  Number(process.env.LABEL_LIST_CACHE_TTL_MS || DEFAULT_TTL_MS)
);

type Entry = { expiresAt: number; payload: unknown };
const store = new Map<string, Entry>();

function cacheKey(table: LabelTable, limit: number, offset: number) {
  return `${table}:${limit}:${offset}`;
}

export function getLabelListCached(
  table: LabelTable,
  limit: number,
  offset: number
): unknown | null {
  const key = cacheKey(table, limit, offset);
  const e = store.get(key);
  if (!e || Date.now() > e.expiresAt) {
    if (e) store.delete(key);
    return null;
  }
  return e.payload;
}

export function setLabelListCached(
  table: LabelTable,
  limit: number,
  offset: number,
  payload: unknown
) {
  store.set(cacheKey(table, limit, offset), { expiresAt: Date.now() + TTL_MS, payload });
}

export function invalidateLabelListCache(table: LabelTable) {
  const prefix = `${table}:`;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
