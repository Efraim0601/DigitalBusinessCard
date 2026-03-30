<script lang="ts" setup>
const route = useRoute();

const showCreateButton = computed(() => {
  const path = route.path || "/";
  // On masque le bouton de création sur la page de login et dans l'admin
  if (path === "/" || path.startsWith("/admin")) return false;
  return true;
});

const showFloatingToolbar = computed(() => {
  const path = route.path || "/";
  return !path.startsWith("/admin");
});
</script>

<template>
  <div>
    <ButtonsTheCreateButton v-if="showCreateButton" />
    <template v-if="showFloatingToolbar">
      <ButtonsTheColorSelector />
      <ButtonsTheLocaleToggle />
      <ButtonsTheColorModeButton />
    </template>
    <slot />
  </div>
</template>
