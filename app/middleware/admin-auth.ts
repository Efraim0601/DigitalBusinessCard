import { shouldBlockAdminRoute } from "~/utils/admin-route-guard";

export default defineNuxtRouteMiddleware(async (to) => {
  const block = await shouldBlockAdminRoute(to.path, () =>
    $fetch<{ authenticated: boolean }>("/api/auth/admin/me", {
      headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined,
    })
  );
  if (block) return navigateTo("/");
});

