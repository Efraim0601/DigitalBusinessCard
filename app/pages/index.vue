<script setup lang="ts">
const route = useRoute();
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
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 min-h-screen py-6 px-3 sm:px-4">
    <NuxtPwaManifest />
    <div class="flex flex-col items-center gap-2 w-full max-w-2xl mt-24 sm:mt-60 pb-10">
      <TheViewComponent v-if="type && type === 'view'" :url-card="info" />
      <TheCreateComponent v-else />
    </div>
  </div>
</template>
