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

// Un seul champ par concept : saisie libre ou choix dans la liste (suggestions)
const departmentDisplay = computed({
  get: () => {
    if (!editing.value) return "";
    if (editing.value.department_id) {
      const d = departments.value.find((x) => x.id === editing.value!.department_id);
      return d?.label_fr ?? editing.value.company ?? "";
    }
    return editing.value.company ?? "";
  },
  set: (val: string) => {
    if (!editing.value) return;
    const trimmed = (val ?? "").trim();
    const found = departments.value.find((d) => d.label_fr === trimmed);
    if (found) {
      editing.value.department_id = found.id;
      editing.value.company = null;
    } else {
      editing.value.department_id = null;
      editing.value.company = trimmed || null;
    }
  },
});

const jobTitleDisplay = computed({
  get: () => {
    if (!editing.value) return "";
    if (editing.value.job_title_id) {
      const j = jobTitles.value.find((x) => x.id === editing.value!.job_title_id);
      return j?.label_fr ?? editing.value.title ?? "";
    }
    return editing.value.title ?? "";
  },
  set: (val: string) => {
    if (!editing.value) return;
    const trimmed = (val ?? "").trim();
    const found = jobTitles.value.find((j) => j.label_fr === trimmed);
    if (found) {
      editing.value.job_title_id = found.id;
      editing.value.title = null;
    } else {
      editing.value.job_title_id = null;
      editing.value.title = trimmed || null;
    }
  },
});

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
  if (!departmentForm.value) return;
  const { id, label_fr, label_en } = departmentForm.value;
  if (!label_fr?.trim() || !label_en?.trim()) return;
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
  if (!jobTitleForm.value) return;
  const { id, label_fr, label_en } = jobTitleForm.value;
  if (!label_fr?.trim() || !label_en?.trim()) return;
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
              <UInput
                v-model="departmentDisplay"
                type="text"
                autocomplete="off"
                :placeholder="t('admin.department')"
                class="w-full"
                :list="'dept-list-' + (editing.id ?? 'new')"
              />
              <datalist :id="'dept-list-' + (editing.id ?? 'new')">
                <option v-for="d in departments" :key="d.id" :value="d.label_fr" />
              </datalist>
            </UFormField>

            <UFormField :label="t('admin.titleField')">
              <UInput
                v-model="jobTitleDisplay"
                type="text"
                autocomplete="off"
                :placeholder="t('admin.titleField')"
                class="w-full"
                :list="'job-list-' + (editing.id ?? 'new')"
              />
              <datalist :id="'job-list-' + (editing.id ?? 'new')">
                <option v-for="j in jobTitles" :key="j.id" :value="j.label_fr" />
              </datalist>
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
      <div v-if="departmentForm" class="border border-zinc-200 rounded-xl bg-white dark:bg-zinc-900 p-4 mb-4 max-w-md">
        <UFormField :label="t('admin.labelFr')">
          <UInput v-model="departmentForm.label_fr" />
        </UFormField>
        <UFormField :label="t('admin.labelEn')" class="mt-2">
          <UInput v-model="departmentForm.label_en" />
        </UFormField>
        <div class="flex gap-2 mt-3">
          <UButton color="primary" size="sm" @click="saveDepartment">{{ t("admin.save") }}</UButton>
          <UButton variant="ghost" size="sm" @click="departmentForm = null">{{ t("admin.cancel") }}</UButton>
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
      <div v-if="jobTitleForm" class="border border-zinc-200 rounded-xl bg-white dark:bg-zinc-900 p-4 mb-4 max-w-md">
        <UFormField :label="t('admin.labelFr')">
          <UInput v-model="jobTitleForm.label_fr" />
        </UFormField>
        <UFormField :label="t('admin.labelEn')" class="mt-2">
          <UInput v-model="jobTitleForm.label_en" />
        </UFormField>
        <div class="flex gap-2 mt-3">
          <UButton color="primary" size="sm" @click="saveJobTitle">{{ t("admin.save") }}</UButton>
          <UButton variant="ghost" size="sm" @click="jobTitleForm = null">{{ t("admin.cancel") }}</UButton>
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
