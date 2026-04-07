<script setup lang="ts">
import type { Card } from "~~/types/card";

const route = useRoute();

/** Paramètre `email` unique (évite ?email=foo&email=bar) ; chaîne vide = absent. */
function normalizedEmailQuery(raw: unknown): string {
  if (raw == null) return "";
  const first = Array.isArray(raw) ? raw[0] : raw;
  return typeof first === "string" ? first.trim() : "";
}

const email = computed(() => normalizedEmailQuery(route.query.email));
const { t } = useAppLocale();
const appConfig = useAppConfig();

const { data: card, pending: loading, error: fetchError } = await useAsyncData(
  "card-by-email",
  async () => {
    if (!email.value) return null;
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
        department?: { label_fr: string; label_en: string } | null;
        job_title?: { label_fr: string; label_en: string } | null;
      }>("/api/cards", {
        query: { email: email.value },
      });
      return {
        color: appConfig.ui?.colors?.primary,
        fName: res.first_name ?? "",
        lName: res.last_name ?? "",
        co: res.company ?? "",
        title: res.title ?? "",
        email: res.email,
        phone: res.phone ?? "",
        fax: res.fax ?? "",
        mobile: res.mobile ?? "",
        department: res.department ?? undefined,
        job_title: res.job_title ?? undefined,
      } as Card;
    } catch (e: any) {
      if (e?.statusCode === 404) throw new Error(t("card.notFound"));
      throw e;
    }
  },
  {
    watch: [email],
    default: () => null,
  }
);

const error = computed(() => {
  const e = fetchError.value;
  if (!e) return null;
  return (e as Error)?.message ?? null;
});

const TheViewComponent = defineAsyncComponent(() => import("~/components/TheViewComponent.vue"));
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 min-h-screen py-6 px-3 sm:px-4">
    <div class="flex flex-col items-center gap-2 w-full max-w-2xl mt-24 sm:mt-60 pb-10">
      <p
        v-if="!email"
        class="text-sm text-zinc-600 dark:text-zinc-400"
        role="alert"
        data-testid="card-email-required"
      >
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
      />
    </div>
  </div>
</template>

