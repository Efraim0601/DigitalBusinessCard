<script lang="ts" setup>
const { t } = useAppLocale();
const url = ref("");

onMounted(() => {
  url.value = globalThis.location?.origin ?? "";
});
</script>

<template>
  <div>
    <a :href="url">
      <UButton
        :aria-label="t('nav.back')"
        icon="i-lucide-arrow-left"
        color="primary"
        variant="soft"
        size="lg"
        class="absolute left-4 top-4 cursor-pointer transition-all ease-in-out hover:scale-105 active:scale-95"
      />
    </a>
  </div>
</template>
