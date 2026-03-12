<script setup lang="ts">
const { t, locale } = useAppLocale();

const activeTab = ref<"cards" | "departments" | "job_titles">("cards");
const cards = ref<any[]>([]);
const departments = ref<{ id: string; label_fr: string; label_en: string }[]>([]);
const jobTitles = ref<{ id: string; label_fr: string; label_en: string }[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const editing = ref<any | null>(null);

// Directions: formulaire d'ajout / édition
const departmentForm = ref<{ id: string | null; label_fr: string; label_en: string } | null>(null);
const jobTitleForm = ref<{ id: string | null; label_fr: string; label_en: string } | null>(null);
const departmentSaveError = ref<string | null>(null);
const jobTitleSaveError = ref<string | null>(null);

async function loadCards() {
  loading.value = true;
  error.value = null;
  try {
    const res = await $fetch("/api/cards");
    cards.value = Array.isArray(res) ? res : [];
  } catch (e) {
    error.value = t("admin.loadError");
  } finally {
    loading.value = false;
  }
}

async function loadDepartments() {
  try {
    departments.value = await $fetch("/api/departments");
  } catch (e) {
    console.error(e);
  }
}

async function loadJobTitles() {
  try {
    jobTitles.value = await $fetch("/api/job-titles");
  } catch (e) {
    console.error(e);
  }
}

function startCreate() {
  editing.value = {
    id: null,
    email: "",
    first_name: "",
    last_name: "",
    company: "",
    title: "",
    phone: "",
    fax: "",
    mobile: "",
    department_id: null,
    job_title_id: null,
  };
}

function startEdit(card: any) {
  editing.value = {
    ...card,
    department_id: card.department_id ?? null,
    job_title_id: card.job_title_id ?? null,
    company: card.company ?? "",
    title: card.title ?? "",
  };
}

// Select Département : valeur = id ou "" (liste uniquement)
const departmentSelectValue = computed({
  get: () => (editing.value?.department_id ?? "") || "",
  set: (v: string) => {
    if (!editing.value) return;
    editing.value.department_id = v || null;
    if (v) editing.value.company = null;
  },
});
const departmentOptions = computed(() => [
  { value: "", label: "— " + t("admin.department") + " —" },
  ...departments.value.map((d) => ({ value: d.id, label: d.label_fr })),
]);

// Select Titre / Poste : id ou "" (liste uniquement)
const jobTitleSelectValue = computed({
  get: () => (editing.value?.job_title_id ?? "") || "",
  set: (v: string) => {
    if (!editing.value) return;
    editing.value.job_title_id = v || null;
    if (v) editing.value.title = null;
  },
});
const jobTitleOptions = computed(() => [
  { value: "", label: "— " + t("admin.titleField") + " —" },
  ...jobTitles.value.map((j) => ({ value: j.id, label: j.label_fr })),
]);

async function saveCard() {
  if (!editing.value) return;
  const payload: any = {
    email: editing.value.email,
    first_name: editing.value.first_name,
    last_name: editing.value.last_name,
    phone: editing.value.phone,
    fax: editing.value.fax,
    mobile: editing.value.mobile,
    department_id: editing.value.department_id || null,
    job_title_id: editing.value.job_title_id || null,
    company: editing.value.department_id ? null : (editing.value.company || null),
    title: editing.value.job_title_id ? null : (editing.value.title || null),
  };
  try {
    if (editing.value.id) {
      await $fetch(`/api/cards/${editing.value.id}`, { method: "PUT", body: payload });
    } else {
      await $fetch("/api/cards", { method: "POST", body: payload });
    }
    editing.value = null;
    await loadCards();
  } catch (e) {
    console.error(e);
  }
}

async function removeCard(card: any) {
  if (!card.id) return;
  const name = [card.first_name, card.last_name].filter(Boolean).join(" ").trim() || "?";
  if (!confirm(t("admin.confirmDelete", { name }))) return;
  try {
    await $fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    await loadCards();
  } catch (e) {
    console.error(e);
  }
}

function cardDepartmentLabel(card: any) {
  if (card.department?.label_fr != null || card.department?.label_en != null) {
    return locale === "en" ? card.department.label_en : card.department.label_fr;
  }
  return card.company ?? "";
}

function cardTitleLabel(card: any) {
  if (card.job_title?.label_fr != null || card.job_title?.label_en != null) {
    return locale === "en" ? card.job_title.label_en : card.job_title.label_fr;
  }
  return card.title ?? "";
}

// ——— Directions ———
function openAddDepartment() {
  departmentForm.value = { id: null, label_fr: "", label_en: "" };
}

function openEditDepartment(d: { id: string; label_fr: string; label_en: string }) {
  departmentForm.value = { id: d.id, label_fr: d.label_fr, label_en: d.label_en };
}

async function saveDepartment() {
  departmentSaveError.value = null;
  if (!departmentForm.value) return;
  const { id, label_fr, label_en } = departmentForm.value;
  if (!label_fr?.trim() || !label_en?.trim()) {
    departmentSaveError.value = t("admin.labelFr") + " / " + t("admin.labelEn") + " requis.";
    return;
  }
  try {
    if (id) {
      await $fetch(`/api/departments/${id}`, {
        method: "PUT",
        body: { label_fr: label_fr.trim(), label_en: label_en.trim() },
      });
    } else {
      await $fetch("/api/departments", {
        method: "POST",
        body: { label_fr: label_fr.trim(), label_en: label_en.trim() },
      });
    }
    departmentForm.value = null;
    await loadDepartments();
  } catch (e) {
    departmentSaveError.value = (e as any)?.data?.error || (e as Error)?.message || t("admin.loadError");
    console.error(e);
  }
}

async function removeDepartment(d: { id: string }) {
  if (!confirm(t("admin.confirmDeleteDepartment"))) return;
  try {
    await $fetch(`/api/departments/${d.id}`, { method: "DELETE" });
    await loadDepartments();
  } catch (e) {
    console.error(e);
  }
}

// ——— Titres / Postes ———
function openAddJobTitle() {
  jobTitleForm.value = { id: null, label_fr: "", label_en: "" };
}

function openEditJobTitle(j: { id: string; label_fr: string; label_en: string }) {
  jobTitleForm.value = { id: j.id, label_fr: j.label_fr, label_en: j.label_en };
}

async function saveJobTitle() {
  jobTitleSaveError.value = null;
  if (!jobTitleForm.value) return;
  const { id, label_fr, label_en } = jobTitleForm.value;
  if (!label_fr?.trim() || !label_en?.trim()) {
    jobTitleSaveError.value = t("admin.labelFr") + " / " + t("admin.labelEn") + " requis.";
    return;
  }
  try {
    if (id) {
      await $fetch(`/api/job-titles/${id}`, {
        method: "PUT",
        body: { label_fr: label_fr.trim(), label_en: label_en.trim() },
      });
    } else {
      await $fetch("/api/job-titles", {
        method: "POST",
        body: { label_fr: label_fr.trim(), label_en: label_en.trim() },
      });
    }
    jobTitleForm.value = null;
    await loadJobTitles();
  } catch (e) {
    jobTitleSaveError.value = (e as any)?.data?.error || (e as Error)?.message || t("admin.loadError");
    console.error(e);
  }
}

async function removeJobTitle(j: { id: string }) {
  if (!confirm(t("admin.confirmDeleteJobTitle"))) return;
  try {
    await $fetch(`/api/job-titles/${j.id}`, { method: "DELETE" });
    await loadJobTitles();
  } catch (e) {
    console.error(e);
  }
}

onMounted(() => {
  loadCards();
  loadDepartments();
  loadJobTitles();
});
</script>

<template>
  <div class="min-h-screen px-4 py-6 sm:px-8">
    <h1 class="text-2xl font-bold mb-4">{{ t("admin.title") }}</h1>

    <div class="flex gap-1 mb-4 border-b border-zinc-200 dark:border-zinc-700">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
        :class="activeTab === 'cards' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
        @click="activeTab = 'cards'"
      >
        {{ t("admin.tabCards") }}
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
        :class="activeTab === 'departments' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
        @click="activeTab = 'departments'"
      >
        {{ t("admin.tabDepartments") }}
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
        :class="activeTab === 'job_titles' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
        @click="activeTab = 'job_titles'"
      >
        {{ t("admin.tabJobTitles") }}
      </button>
    </div>

    <!-- Onglet Cartes -->
    <template v-if="activeTab === 'cards'">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <UButton color="primary" variant="soft" size="md" @click="startCreate">
          {{ t("admin.createCard") }}
        </UButton>
        <span v-if="loading" class="text-sm text-zinc-500">{{ t("admin.loading") }}</span>
        <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[2fr,1.2fr] gap-6">
        <div class="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
          <table class="min-w-full text-sm">
            <thead class="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th class="px-3 py-2 text-left font-semibold">{{ t("admin.email") }}</th>
                <th class="px-3 py-2 text-left font-semibold">{{ t("admin.name") }}</th>
                <th class="px-3 py-2 text-left font-semibold">{{ t("admin.department") }}</th>
                <th class="px-3 py-2 text-left font-semibold">{{ t("admin.jobTitle") }}</th>
                <th class="px-3 py-2 text-right font-semibold">{{ t("admin.actions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="card in cards"
                :key="card.id"
                class="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer"
                @click="startEdit(card)"
              >
                <td class="px-3 py-2">{{ card.email }}</td>
                <td class="px-3 py-2">
                  {{ [card.first_name, card.last_name].filter(Boolean).join(" ") }}
                </td>
                <td class="px-3 py-2">{{ cardDepartmentLabel(card) }}</td>
                <td class="px-3 py-2">{{ cardTitleLabel(card) }}</td>
                <td class="px-3 py-2 text-right">
                  <UButton
                    color="red"
                    variant="ghost"
                    size="xs"
                    @click.stop="removeCard(card)"
                  >
                    {{ t("admin.delete") }}
                  </UButton>
                </td>
              </tr>
<tr v-if="!loading && cards.length === 0">
              <td colspan="5" class="px-3 py-8 text-center text-sm text-zinc-500">
                {{ t("admin.noCards") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

        <div class="border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-sm">
          <h2 class="text-lg font-semibold mb-1">
            {{ editing?.id ? t("admin.editCard") : t("admin.createCardForm") }}
          </h2>
          <p class="text-xs text-zinc-500 mb-2">
            {{ t("admin.helpText") }}
          </p>

          <div v-if="editing" class="space-y-2">
            <UFormField :label="t('admin.email')" required>
              <UInput v-model="editing.email" type="email" />
            </UFormField>
            <UFormField :label="t('admin.firstName')">
              <UInput v-model="editing.first_name" />
            </UFormField>
            <UFormField :label="t('admin.lastName')">
              <UInput v-model="editing.last_name" />
            </UFormField>

            <UFormField :label="t('admin.department')">
              <select
                v-model="departmentSelectValue"
                class="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              >
                <option v-for="opt in departmentOptions" :key="String(opt.value)" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </UFormField>

            <UFormField :label="t('admin.titleField')">
              <select
                v-model="jobTitleSelectValue"
                class="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              >
                <option v-for="opt in jobTitleOptions" :key="String(opt.value)" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </UFormField>

            <UFormField :label="t('admin.phone')">
              <UInput v-model="editing.phone" />
            </UFormField>
            <UFormField :label="t('admin.fax')">
              <UInput v-model="editing.fax" />
            </UFormField>
            <UFormField :label="t('admin.mobile')">
              <UInput v-model="editing.mobile" />
            </UFormField>

            <div class="flex gap-2 pt-2">
              <UButton color="primary" @click="saveCard">
                {{ t("admin.save") }}
              </UButton>
              <UButton variant="ghost" @click="editing = null">
                {{ t("admin.cancel") }}
              </UButton>
            </div>
          </div>

          <p v-else class="text-sm text-zinc-500">
            {{ t("admin.selectOrCreate") }}
          </p>
        </div>
      </div>
    </template>

    <!-- Onglet Directions -->
    <template v-else-if="activeTab === 'departments'">
      <div class="mb-4">
        <UButton color="primary" variant="soft" @click="openAddDepartment">
          {{ t("admin.addDepartment") }}
        </UButton>
      </div>
      <p v-if="departmentSaveError" class="mb-3 text-sm text-red-500">{{ departmentSaveError }}</p>
      <div v-if="departmentForm" class="border border-zinc-200 rounded-xl bg-white dark:bg-zinc-900 p-4 mb-4 max-w-md">
        <UFormField :label="t('admin.labelFr')">
          <UInput v-model="departmentForm.label_fr" />
        </UFormField>
        <UFormField :label="t('admin.labelEn')" class="mt-2">
          <UInput v-model="departmentForm.label_en" />
        </UFormField>
        <div class="flex gap-2 mt-3">
          <UButton type="button" color="primary" size="sm" @click="saveDepartment">{{ t("admin.save") }}</UButton>
          <UButton type="button" variant="ghost" size="sm" @click="departmentForm = null; departmentSaveError = null">{{ t("admin.cancel") }}</UButton>
        </div>
      </div>
      <div class="overflow-x-auto border border-zinc-200 rounded-xl bg-white dark:bg-zinc-900">
        <table class="min-w-full text-sm">
          <thead class="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th class="px-3 py-2 text-left font-semibold">{{ t("admin.labelFr") }}</th>
              <th class="px-3 py-2 text-left font-semibold">{{ t("admin.labelEn") }}</th>
              <th class="px-3 py-2 text-right font-semibold">{{ t("admin.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in departments"
              :key="d.id"
              class="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
            >
              <td class="px-3 py-2">{{ d.label_fr }}</td>
              <td class="px-3 py-2">{{ d.label_en }}</td>
              <td class="px-3 py-2 text-right">
                <UButton variant="ghost" size="xs" @click="openEditDepartment(d)">{{ t("admin.editCard") }}</UButton>
                <UButton color="red" variant="ghost" size="xs" @click="removeDepartment(d)">{{ t("admin.delete") }}</UButton>
              </td>
            </tr>
            <tr v-if="departments.length === 0">
              <td colspan="3" class="px-3 py-4 text-center text-zinc-500">{{ t("admin.noCards") }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Onglet Titres / Postes -->
    <template v-else-if="activeTab === 'job_titles'">
      <div class="mb-4">
        <UButton color="primary" variant="soft" @click="openAddJobTitle">
          {{ t("admin.addJobTitle") }}
        </UButton>
      </div>
      <p v-if="jobTitleSaveError" class="mb-3 text-sm text-red-500">{{ jobTitleSaveError }}</p>
      <div v-if="jobTitleForm" class="border border-zinc-200 rounded-xl bg-white dark:bg-zinc-900 p-4 mb-4 max-w-md">
        <UFormField :label="t('admin.labelFr')">
          <UInput v-model="jobTitleForm.label_fr" />
        </UFormField>
        <UFormField :label="t('admin.labelEn')" class="mt-2">
          <UInput v-model="jobTitleForm.label_en" />
        </UFormField>
        <div class="flex gap-2 mt-3">
          <UButton type="button" color="primary" size="sm" @click="saveJobTitle">{{ t("admin.save") }}</UButton>
          <UButton type="button" variant="ghost" size="sm" @click="jobTitleForm = null; jobTitleSaveError = null">{{ t("admin.cancel") }}</UButton>
        </div>
      </div>
      <div class="overflow-x-auto border border-zinc-200 rounded-xl bg-white dark:bg-zinc-900">
        <table class="min-w-full text-sm">
          <thead class="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th class="px-3 py-2 text-left font-semibold">{{ t("admin.labelFr") }}</th>
              <th class="px-3 py-2 text-left font-semibold">{{ t("admin.labelEn") }}</th>
              <th class="px-3 py-2 text-right font-semibold">{{ t("admin.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="j in jobTitles"
              :key="j.id"
              class="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
            >
              <td class="px-3 py-2">{{ j.label_fr }}</td>
              <td class="px-3 py-2">{{ j.label_en }}</td>
              <td class="px-3 py-2 text-right">
                <UButton variant="ghost" size="xs" @click="openEditJobTitle(j)">{{ t("admin.editCard") }}</UButton>
                <UButton color="red" variant="ghost" size="xs" @click="removeJobTitle(j)">{{ t("admin.delete") }}</UButton>
              </td>
            </tr>
            <tr v-if="jobTitles.length === 0">
              <td colspan="3" class="px-3 py-4 text-center text-zinc-500">{{ t("admin.noCards") }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
