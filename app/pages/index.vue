<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const appConfig = useAppConfig();
const type = computed(() => route.query.type as string | undefined);
const info = computed(() => route.query);

watch(
  () => route.query.color,
  (color) => {
    if (type.value === "view" && typeof color === "string" && color) {
      appConfig.ui.colors.primary = color;
    }
  },
  { immediate: true }
);

onMounted(() => {
  const s = route.query.s;
  if (typeof s !== "string" || !s) return;
  try {
    const decoded = decodeURIComponent(
      atob(s.replace(/-/g, "+").replace(/_/g, "/"))
    );
    const query: Record<string, string> = {};
    new URLSearchParams(decoded).forEach((value, key) => {
      query[key] = value;
    });
    router.replace({ path: route.path, query });
  } catch {
    // ignore invalid s
  }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 min-h-screen py-6 px-3 sm:px-4">
    <NuxtPwaManifest />
    <div class="flex flex-col items-center gap-2 w-full max-w-2xl mt-24 sm:mt-60 pb-10">
      <TheViewComponent v-if="type && type === 'view'" :url-card="info" :is-creator="route.query.owner === '1'" />
      <TheCreateComponent v-else />
    </div>
  </div>
</template>
