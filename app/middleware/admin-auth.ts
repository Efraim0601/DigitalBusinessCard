export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith("/admin")) return;

  try {
    const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
    const res = await $fetch<{ authenticated: boolean }>("/api/auth/admin/me", { headers });
    if (!res?.authenticated) return navigateTo("/");
  } catch {
    return navigateTo("/");
  }
});

