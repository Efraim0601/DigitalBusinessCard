<script setup lang="ts">
import type { Card } from "~~/types/card";

const route = useRoute();
const appConfig = useAppConfig();

// Données dérivées de la route de façon réactive (disponibles dès le premier rendu, pas seulement après onMounted)
const type = computed(() => (route.query.type as string) ?? undefined);

const urlCard = computed<Card>(() => {
  const q = route.query as Record<string, string | undefined>;
  return {
    color: (q.color as Card["color"]) ?? appConfig.ui.colors.primary,
    fName: q.fName ?? "",
    lName: q.lName ?? "",
    email: q.email ?? "",
    phone: q.phone ?? "",
    fax: q.fax ?? "",
    mobile: q.mobile ?? "",
    co: q.co ?? "",
    title: q.title ?? "",
  };
});

watch(
  () => route.query.color,
  (color) => {
    if (route.query.type === "view" && color) {
      appConfig.ui.colors.primary = color;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 min-h-screen py-6 px-3 sm:px-4">
    <NuxtPwaManifest />
    <div
      class="flex flex-col items-center gap-2 w-full max-w-2xl mt-24 sm:mt-60 pb-10"
      :key="type ?? 'create'"
    >
      <TheViewComponent v-if="type === 'view'" :url-card="urlCard" />
      <TheCreateComponent v-else />
    </div>
  </div>
</template>
