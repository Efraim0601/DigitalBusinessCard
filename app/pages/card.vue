<script setup lang="ts">
import type { Card } from "~~/types/card";
import { CARD_TEMPLATES, getTemplate, type TemplateId } from "~~/types/template";

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

type CardResponse = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null;
  phone: string | null;
  fax: string | null;
  mobile: string | null;
  template_id?: string | null;
  department?: { label_fr: string; label_en: string } | null;
  job_title?: { label_fr: string; label_en: string } | null;
};

const { data: card, pending: loading, error: fetchError } = await useAsyncData(
  "card-by-email",
  async () => {
    if (!email.value) return null;
    try {
      const res = await $fetch<CardResponse>("/api/cards", {
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
        template_id: res.template_id ?? null,
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

const { data: settings } = await useAsyncData(
  "app-settings",
  () =>
    $fetch<{ allowUserTemplate: boolean; defaultTemplate: TemplateId }>("/api/settings").catch(
      () => ({ allowUserTemplate: false, defaultTemplate: "classic" as TemplateId })
    ),
  { default: () => ({ allowUserTemplate: false, defaultTemplate: "classic" as TemplateId }) }
);

const selectedTemplateId = ref<TemplateId>("classic");
const saveError = ref<string | null>(null);
const saving = ref(false);

watchEffect(() => {
  if (!settings.value) return;
  if (settings.value.allowUserTemplate && card.value?.template_id) {
    selectedTemplateId.value = card.value.template_id as TemplateId;
  } else {
    selectedTemplateId.value = settings.value.defaultTemplate;
  }
});

const currentTemplate = computed(() => getTemplate(selectedTemplateId.value));
const canChooseTemplate = computed(() => Boolean(settings.value?.allowUserTemplate && card.value));

async function chooseTemplate(id: TemplateId) {
  if (!canChooseTemplate.value || !card.value?.email) return;
  if (id === selectedTemplateId.value) return;
  saveError.value = null;
  saving.value = true;
  const previous = selectedTemplateId.value;
  selectedTemplateId.value = id;
  try {
    await $fetch("/api/cards/template", {
      method: "PUT",
      body: { email: card.value.email, template_id: id },
    });
    if (card.value) card.value.template_id = id;
  } catch (e: any) {
    selectedTemplateId.value = previous;
    saveError.value = e?.data?.error ?? t("template.saveError");
  } finally {
    saving.value = false;
  }
}

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
      <template v-else-if="card">
        <TheViewComponent
          :url-card="card"
          :is-creator="false"
          :background="currentTemplate.background"
        />
        <div v-if="canChooseTemplate" class="mt-4 w-full max-w-md flex flex-col items-center gap-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {{ t('template.chooseTemplate') }}
          </p>
          <div class="grid grid-cols-2 gap-3 w-full">
            <button
              v-for="tpl in CARD_TEMPLATES"
              :key="tpl.id"
              type="button"
              class="group relative rounded-xl overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
              :class="selectedTemplateId === tpl.id ? 'border-primary-500 shadow-md' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'"
              :disabled="saving"
              :aria-pressed="selectedTemplateId === tpl.id"
              @click="chooseTemplate(tpl.id)"
            >
              <img
                :src="tpl.background"
                :alt="t(tpl.labelKey)"
                class="w-full h-24 object-cover"
                loading="lazy"
              >
              <span class="block px-2 py-1.5 text-xs font-medium text-center bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200">
                {{ t(tpl.labelKey) }}
              </span>
              <span
                v-if="selectedTemplateId === tpl.id"
                class="absolute top-1 right-1 rounded-full bg-primary-500 text-white w-6 h-6 flex items-center justify-center"
                aria-hidden="true"
              >
                <UIcon name="i-lucide-check" class="w-4 h-4" />
              </span>
            </button>
          </div>
          <p v-if="saveError" class="text-xs text-red-500">{{ saveError }}</p>
        </div>
      </template>
    </div>
  </div>
</template>
