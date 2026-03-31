/**
 * Logique pure : décide si une navigation vers une route /admin doit être bloquée.
 */
export async function shouldBlockAdminRoute(
  path: string,
  fetchMe: () => Promise<{ authenticated?: boolean } | null | undefined>
): Promise<boolean> {
  if (!path.startsWith("/admin")) return false;
  try {
    const res = await fetchMe();
    return !res?.authenticated;
  } catch {
    return true;
  }
}
