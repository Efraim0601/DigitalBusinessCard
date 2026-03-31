/** Shim Vitest pour `import … from "#ui/utils"` (omit Nuxt UI). */
export function omit<T extends Record<string, unknown>>(obj: T, keys: string[]): T {
  const omitSet = new Set(keys);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !omitSet.has(k))) as T;
}
