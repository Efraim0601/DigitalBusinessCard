<script lang="ts" setup>
const props = withDefaults(defineProps<{ floating?: boolean }>(), {
  floating: true,
});
const { locale, setLocale } = useAppLocale();

const label = computed(() => (locale.value === "fr" ? "EN" : "FR"));
const nextLocale = computed(() => (locale.value === "fr" ? "en" : "fr"));

function toggle() {
  setLocale(nextLocale.value);
}
</script>

<template>
  <UButton
    :label="label"
    color="primary"
    variant="soft"
    size="lg"
    :class="props.floating ? 'absolute right-36 top-4 cursor-pointer transition-all ease-in-out hover:scale-105 active:scale-95' : 'cursor-pointer'"
    :title="locale === 'fr' ? 'Switch to English' : 'Passer en français'"
    @click="toggle"
  />
</template>
