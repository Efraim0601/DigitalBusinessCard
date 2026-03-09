<script setup lang="ts">
import type { Card } from "~~/types/card";

const route = useRoute();
const email = computed(() => route.query.email as string | undefined);
const { t } = useAppLocale();

const card = ref<Card | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadCardByEmail() {
  if (!email.value) return;
  loading.value = true;
  error.value = null;
  try {
    const res = await $fetch<{
      email: string;
      first_name: string | null;
      last_name: string | null;
      company: string | null;
      title: string | null;
      phone: string | null;
      fax: string | null;
      mobile: string | null;
    }>("/api/cards", {
      query: { email: email.value },
    });
    card.value = {
      color: useAppConfig().ui.colors.primary,
      fName: res.first_name ?? "",
      lName: res.last_name ?? "",
      co: res.company ?? "",
      title: res.title ?? "",
      email: res.email,
      phone: res.phone ?? "",
      fax: res.fax ?? "",
      mobile: res.mobile ?? "",
    };
  } catch (e) {
    error.value = (e as any)?.statusCode === 404 ? t("card.notFound") : (e as Error).message;
  } finally {
    loading.value = false;
  }
}

watch(email, () => {
  loadCardByEmail();
}, { immediate: true });
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 min-h-screen py-6 px-3 sm:px-4">
    <NuxtPwaManifest />
    <div class="flex flex-col items-center gap-2 w-full max-w-2xl mt-24 sm:mt-60 pb-10">
      <p v-if="!email" class="text-sm text-zinc-500">
        {{ t('card.emailRequired') }}
      </p>
      <p v-else-if="loading" class="text-sm text-zinc-500">
        {{ t('card.loading') }}
      </p>
      <p v-else-if="error" class="text-sm text-red-500">
        {{ error }}
      </p>
      <TheViewComponent
        v-else-if="card"
        :url-card="card"
        :is-creator="false"
        :is-employee="route.query.employee === '1'"
      />
    </div>
  </div>
</template>

