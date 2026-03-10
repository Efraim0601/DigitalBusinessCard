<script lang="ts" setup>
const route = useRoute();

const showCreateButton = computed(() => {
  const path = route.path || "/";
  // On masque le bouton de création sur la page de login et dans l'admin
  if (path === "/" || path.startsWith("/admin")) return false;
  return true;
});
</script>

<template>
  <div>
    <ButtonsTheCreateButton v-if="showCreateButton" />
    <ButtonsTheColorSelector />
    <ButtonsTheLocaleToggle />
    <ButtonsTheColorModeButton />
    <slot />
  </div>
</template>

<style></style>
