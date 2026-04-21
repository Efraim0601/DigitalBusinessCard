<script setup lang="ts">
import { CARD_TEMPLATES, type TemplateId } from "~~/types/template";

definePageMeta({ middleware: "admin-auth" });

const { t, locale } = useAppLocale();
const FIXED_PHONE = "222 233 068";
const FIXED_FAX = "222 221 785";

const activeTab = ref<"cards" | "departments" | "job_titles" | "account" | "appearance">("cards");
type Paged<T> = { items: T[]; total: number; limit: number; offset: number };
type LabelItem = { id: string; label_fr: string; label_en: string };
const cards = ref<Paged<any>>({ items: [], total: 0, limit: 20, offset: 0 });
const departments = ref<Paged<LabelItem>>({ items: [], total: 0, limit: 20, offset: 0 });
const jobTitles = ref<Paged<LabelItem>>({ items: [], total: 0, limit: 20, offset: 0 });
/** Listes complètes pour les selects du formulaire de carte (indépendantes de la pagination/recherche de l'onglet). */
const allDepartments = ref<LabelItem[]>([]);
const allJobTitles = ref<LabelItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const editing = ref<any | null>(null);

// Directions: formulaire d'ajout / édition
const departmentForm = ref<{ id: string | null; label_fr: string; label_en: string } | null>(null);
const jobTitleForm = ref<{ id: string | null; label_fr: string; label_en: string } | null>(null);
const departmentSaveError = ref<string | null>(null);
const jobTitleSaveError = ref<string | null>(null);
const authError = ref<string | null>(null);

const adminCredEmail = ref("");
const adminCredStoredInDb = ref(false);
const adminCredCurrentPassword = ref("");
const adminCredNewEmail = ref("");
const adminCredNewPassword = ref("");
const adminCredLoading = ref(false);
const adminCredMessage = ref<string | null>(null);
const adminCredError = ref<string | null>(null);

const appearanceAllowUser = ref(false);
const appearanceDefaultTemplate = ref<TemplateId>("classic");
const appearanceLoading = ref(false);
const appearanceSaving = ref(false);
const appearanceMessage = ref<string | null>(null);
const appearanceError = ref<string | null>(null);

const selectedCardIds = ref<string[]>([]);
const selectedDepartmentIds = ref<string[]>([]);
const selectedJobTitleIds = ref<string[]>([]);

type AdminImportScope = "cards" | "departments" | "job_titles";
const importCardsInput = ref<HTMLInputElement | null>(null);
const importDepartmentsInput = ref<HTMLInputElement | null>(null);
const importJobTitlesInput = ref<HTMLInputElement | null>(null);
const cardsTransferMessage = ref<string | null>(null);
const cardsTransferError = ref<string | null>(null);
const cardsTransferWarnings = ref<string[]>([]);
const departmentsTransferMessage = ref<string | null>(null);
const departmentsTransferError = ref<string | null>(null);
const departmentsTransferWarnings = ref<string[]>([]);
const jobTitlesTransferMessage = ref<string | null>(null);
const jobTitlesTransferError = ref<string | null>(null);
const jobTitlesTransferWarnings = ref<string[]>([]);

function formatGroupedNumber(value: string | null | undefined): string {
  const digits = (value ?? "").replaceAll(/\D+/g, "");
  if (!digits) return "";
  return digits.match(/.{1,3}/g)?.join(" ") ?? digits;
}

const pageSize = 20;
const searchCards = ref("");
const searchDepartments = ref("");
const searchJobTitles = ref("");
const pageCards = ref(1);
const pageDepartments = ref(1);
const pageJobTitles = ref(1);

function debounce<T extends (...args: any[]) => void>(fn: T, waitMs: number) {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t) globalThis.clearTimeout(t);
    t = globalThis.setTimeout(() => fn(...args), waitMs) as unknown as number;
  };
}

async function loadCards() {
  loading.value = true;
  error.value = null;
  try {
    const res = await $fetch<Paged<any>>("/api/cards", {
      query: {
        limit: pageSize,
        offset: (pageCards.value - 1) * pageSize,
        q: searchCards.value.trim() || undefined,
      },
    });
    cards.value = res?.items ? res : { items: [], total: 0, limit: pageSize, offset: 0 };
    selectedCardIds.value = selectedCardIds.value.filter((id) =>
      cards.value.items.some((c: { id: string }) => c.id === id)
    );
  } catch (e) {
    console.error("Load cards failed:", e);
    error.value = t("admin.loadError");
  } finally {
    loading.value = false;
  }
}

async function loadDepartments() {
  try {
    const res = await $fetch<Paged<any>>("/api/departments", {
      query: {
        limit: pageSize,
        offset: (pageDepartments.value - 1) * pageSize,
        q: searchDepartments.value.trim() || undefined,
      },
    });
    departments.value = res?.items ? res : { items: [], total: 0, limit: pageSize, offset: 0 };
    selectedDepartmentIds.value = selectedDepartmentIds.value.filter((id) =>
      departments.value.items.some((d) => d.id === id)
    );
  } catch (e) {
    console.error(e);
  }
}

async function loadJobTitles() {
  try {
    const res = await $fetch<Paged<any>>("/api/job-titles", {
      query: {
        limit: pageSize,
        offset: (pageJobTitles.value - 1) * pageSize,
        q: searchJobTitles.value.trim() || undefined,
      },
    });
    jobTitles.value = res?.items ? res : { items: [], total: 0, limit: pageSize, offset: 0 };
    selectedJobTitleIds.value = selectedJobTitleIds.value.filter((id) =>
      jobTitles.value.items.some((j) => j.id === id)
    );
  } catch (e) {
    console.error(e);
  }
}

async function loadAllLabels(endpoint: "/api/departments" | "/api/job-titles"): Promise<LabelItem[]> {
  const chunk = 200;
  const collected: LabelItem[] = [];
  let offset = 0;
  // Première page donne aussi le total pour s'arrêter proprement.
  const first = await $fetch<Paged<LabelItem>>(endpoint, { query: { limit: chunk, offset } });
  collected.push(...first.items);
  const total = first.total ?? collected.length;
  while (collected.length < total && first.items.length === chunk) {
    offset += chunk;
    const next = await $fetch<Paged<LabelItem>>(endpoint, { query: { limit: chunk, offset } });
    if (!next.items.length) break;
    collected.push(...next.items);
    if (next.items.length < chunk) break;
  }
  return collected;
}

async function loadAllDepartments() {
  try {
    allDepartments.value = await loadAllLabels("/api/departments");
  } catch (e) {
    console.error("Load all departments failed:", e);
  }
}

async function loadAllJobTitles() {
  try {
    allJobTitles.value = await loadAllLabels("/api/job-titles");
  } catch (e) {
    console.error("Load all job titles failed:", e);
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
    phone: FIXED_PHONE,
    fax: FIXED_FAX,
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
    phone: FIXED_PHONE,
    fax: FIXED_FAX,
    mobile: formatGroupedNumber(card.mobile ?? ""),
  };
}

watch(
  () => editing.value?.mobile,
  (v) => {
    if (!editing.value) return;
    const next = formatGroupedNumber(v ?? "");
    if (next !== (v ?? "")) editing.value.mobile = next;
  }
);

// Select Département : valeur = id ou "" (liste uniquement)
const departmentSelectValue = computed({
  get: () => (editing.value?.department_id ?? "") || "",
  set: (v: string) => {
    if (!editing.value) return;
    editing.value.department_id = v || null;
    if (v) editing.value.company = null;
  },
});
const departmentOptions = computed(() => {
  const items = [...allDepartments.value];
  const currentId = editing.value?.department_id ?? null;
  if (currentId && !items.some((d) => d.id === currentId)) {
    const fallback = editing.value?.department;
    items.unshift({
      id: currentId,
      label_fr: fallback?.label_fr ?? currentId,
      label_en: fallback?.label_en ?? currentId,
    });
  }
  return [
    { value: "", label: "— " + t("admin.department") + " —" },
    ...items.map((d) => ({ value: d.id, label: d.label_fr })),
  ];
});

// Select Titre / Poste : id ou "" (liste uniquement)
const jobTitleSelectValue = computed({
  get: () => (editing.value?.job_title_id ?? "") || "",
  set: (v: string) => {
    if (!editing.value) return;
    editing.value.job_title_id = v || null;
    if (v) editing.value.title = null;
  },
});
const jobTitleOptions = computed(() => {
  const items = [...allJobTitles.value];
  const currentId = editing.value?.job_title_id ?? null;
  if (currentId && !items.some((j) => j.id === currentId)) {
    const fallback = editing.value?.job_title;
    items.unshift({
      id: currentId,
      label_fr: fallback?.label_fr ?? currentId,
      label_en: fallback?.label_en ?? currentId,
    });
  }
  return [
    { value: "", label: "— " + t("admin.titleField") + " —" },
    ...items.map((j) => ({ value: j.id, label: j.label_fr })),
  ];
});

async function saveCard() {
  if (!editing.value) return;
  const payload: any = {
    email: editing.value.email,
    first_name: editing.value.first_name,
    last_name: editing.value.last_name,
    phone: FIXED_PHONE,
    fax: FIXED_FAX,
    mobile: formatGroupedNumber(editing.value.mobile),
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
    selectedCardIds.value = selectedCardIds.value.filter((id) => id !== card.id);
    await loadCards();
  } catch (e) {
    console.error(e);
  }
}

function toggleCardSelection(id: string, checked: boolean) {
  const s = new Set(selectedCardIds.value);
  if (checked) s.add(id);
  else s.delete(id);
  selectedCardIds.value = [...s];
}

function allCardsOnPageSelected(): boolean {
  const items = cards.value.items;
  return items.length > 0 && items.every((c: { id: string }) => selectedCardIds.value.includes(c.id));
}

function toggleSelectAllCardsOnPage() {
  const ids = cards.value.items.map((c: { id: string }) => c.id);
  if (allCardsOnPageSelected()) {
    selectedCardIds.value = selectedCardIds.value.filter((id) => !ids.includes(id));
  } else {
    selectedCardIds.value = [...new Set([...selectedCardIds.value, ...ids])];
  }
}

async function bulkDeleteSelectedCards() {
  const ids = selectedCardIds.value;
  if (!ids.length) return;
  if (!confirm(t("admin.confirmBulkDeleteCards", { n: String(ids.length) }))) return;
  try {
    await $fetch("/api/cards/bulk-delete", { method: "POST", body: { ids } });
    selectedCardIds.value = [];
    await loadCards();
  } catch (e) {
    console.error(e);
    error.value = t("admin.loadError");
  }
}

function toggleDepartmentSelection(id: string, checked: boolean) {
  const s = new Set(selectedDepartmentIds.value);
  if (checked) s.add(id);
  else s.delete(id);
  selectedDepartmentIds.value = [...s];
}

function allDepartmentsOnPageSelected(): boolean {
  const items = departments.value.items;
  return items.length > 0 && items.every((d) => selectedDepartmentIds.value.includes(d.id));
}

function toggleSelectAllDepartmentsOnPage() {
  const ids = departments.value.items.map((d) => d.id);
  if (allDepartmentsOnPageSelected()) {
    selectedDepartmentIds.value = selectedDepartmentIds.value.filter((id) => !ids.includes(id));
  } else {
    selectedDepartmentIds.value = [...new Set([...selectedDepartmentIds.value, ...ids])];
  }
}

async function bulkDeleteSelectedDepartments() {
  const ids = selectedDepartmentIds.value;
  if (!ids.length) return;
  if (!confirm(t("admin.confirmBulkDeleteDepartments", { n: String(ids.length) }))) return;
  try {
    await $fetch("/api/departments/bulk-delete", { method: "POST", body: { ids } });
    selectedDepartmentIds.value = [];
    await loadDepartments();
    await loadAllDepartments();
    await loadCards();
  } catch (e) {
    console.error(e);
  }
}

function toggleJobTitleSelection(id: string, checked: boolean) {
  const s = new Set(selectedJobTitleIds.value);
  if (checked) s.add(id);
  else s.delete(id);
  selectedJobTitleIds.value = [...s];
}

function allJobTitlesOnPageSelected(): boolean {
  const items = jobTitles.value.items;
  return items.length > 0 && items.every((j) => selectedJobTitleIds.value.includes(j.id));
}

function toggleSelectAllJobTitlesOnPage() {
  const ids = jobTitles.value.items.map((j) => j.id);
  if (allJobTitlesOnPageSelected()) {
    selectedJobTitleIds.value = selectedJobTitleIds.value.filter((id) => !ids.includes(id));
  } else {
    selectedJobTitleIds.value = [...new Set([...selectedJobTitleIds.value, ...ids])];
  }
}

async function bulkDeleteSelectedJobTitles() {
  const ids = selectedJobTitleIds.value;
  if (!ids.length) return;
  if (!confirm(t("admin.confirmBulkDeleteJobTitles", { n: String(ids.length) }))) return;
  try {
    await $fetch("/api/job-titles/bulk-delete", { method: "POST", body: { ids } });
    selectedJobTitleIds.value = [];
    await loadJobTitles();
    await loadAllJobTitles();
    await loadCards();
  } catch (e) {
    console.error(e);
  }
}

function resetTransfers(scope: AdminImportScope) {
  if (scope === "cards") {
    cardsTransferMessage.value = null;
    cardsTransferError.value = null;
    cardsTransferWarnings.value = [];
  } else if (scope === "departments") {
    departmentsTransferMessage.value = null;
    departmentsTransferError.value = null;
    departmentsTransferWarnings.value = [];
  } else {
    jobTitlesTransferMessage.value = null;
    jobTitlesTransferError.value = null;
    jobTitlesTransferWarnings.value = [];
  }
}

const SCOPED_DOWNLOAD: Record<AdminImportScope, string> = {
  cards: "cartes.csv",
  departments: "directions.csv",
  job_titles: "titres-postes.csv",
};

async function exportScopedCsv(scope: AdminImportScope) {
  resetTransfers(scope);
  try {
    const buf = await $fetch<ArrayBuffer>("/api/admin/data-export", {
      query: { scope },
      responseType: "arrayBuffer",
    });
    if (typeof document === "undefined") return;
    const blob = new Blob([buf], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = SCOPED_DOWNLOAD[scope];
    a.click();
    URL.revokeObjectURL(url);
    if (scope === "cards") cardsTransferMessage.value = t("admin.exportCsvSuccess");
    else if (scope === "departments") departmentsTransferMessage.value = t("admin.exportCsvSuccess");
    else jobTitlesTransferMessage.value = t("admin.exportCsvSuccess");
  } catch (e) {
    console.error(e);
    if (scope === "cards") cardsTransferError.value = t("admin.exportError");
    else if (scope === "departments") departmentsTransferError.value = t("admin.exportError");
    else jobTitlesTransferError.value = t("admin.exportError");
  }
}

async function onScopedImportFileChange(ev: Event, scope: AdminImportScope) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  resetTransfers(scope);
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await $fetch<{
      success: boolean;
      imported: { departments: number; job_titles: number; cards: number };
      warnings?: string[];
    }>("/api/admin/data-import", { method: "POST", query: { scope }, body: fd });
    const w = res.warnings?.length ? [...res.warnings] : [];
    if (scope === "cards") {
      cardsTransferMessage.value = t("admin.importSuccessCards", { n: String(res.imported.cards) });
      cardsTransferWarnings.value = w;
    } else if (scope === "departments") {
      departmentsTransferMessage.value = t("admin.importSuccessDepartments", {
        n: String(res.imported.departments),
      });
      departmentsTransferWarnings.value = w;
    } else {
      jobTitlesTransferMessage.value = t("admin.importSuccessJobTitles", { n: String(res.imported.job_titles) });
      jobTitlesTransferWarnings.value = w;
    }
    selectedCardIds.value = [];
    selectedDepartmentIds.value = [];
    selectedJobTitleIds.value = [];
    await Promise.all([
      loadCards(),
      loadDepartments(),
      loadJobTitles(),
      loadAllDepartments(),
      loadAllJobTitles(),
    ]);
  } catch (e) {
    console.error(e);
    const msg =
      (e as { data?: { error?: string } })?.data?.error ??
      (e as { message?: string })?.message ??
      t("admin.importError");
    if (scope === "cards") cardsTransferError.value = msg;
    else if (scope === "departments") departmentsTransferError.value = msg;
    else jobTitlesTransferError.value = msg;
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
    await loadAllDepartments();
  } catch (e) {
    departmentSaveError.value = (e as any)?.data?.error || (e as Error)?.message || t("admin.loadError");
    console.error(e);
  }
}

async function removeDepartment(d: { id: string }) {
  if (!confirm(t("admin.confirmDeleteDepartment"))) return;
  try {
    await $fetch(`/api/departments/${d.id}`, { method: "DELETE" });
    selectedDepartmentIds.value = selectedDepartmentIds.value.filter((id) => id !== d.id);
    await loadDepartments();
    await loadAllDepartments();
    await loadCards();
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
    await loadAllJobTitles();
  } catch (e) {
    jobTitleSaveError.value = (e as any)?.data?.error || (e as Error)?.message || t("admin.loadError");
    console.error(e);
  }
}

async function removeJobTitle(j: { id: string }) {
  if (!confirm(t("admin.confirmDeleteJobTitle"))) return;
  try {
    await $fetch(`/api/job-titles/${j.id}`, { method: "DELETE" });
    selectedJobTitleIds.value = selectedJobTitleIds.value.filter((id) => id !== j.id);
    await loadJobTitles();
    await loadAllJobTitles();
    await loadCards();
  } catch (e) {
    console.error(e);
  }
}

onMounted(() => {
  loadCards();
  loadDepartments();
  loadJobTitles();
  loadAllDepartments();
  loadAllJobTitles();
});

const debouncedReloadCards = debounce(() => {
  pageCards.value = 1;
  loadCards();
}, 300);
const debouncedReloadDepartments = debounce(() => {
  pageDepartments.value = 1;
  loadDepartments();
}, 300);
const debouncedReloadJobTitles = debounce(() => {
  pageJobTitles.value = 1;
  loadJobTitles();
}, 300);

watch(searchCards, () => globalThis.window !== undefined && debouncedReloadCards());
watch(searchDepartments, () => globalThis.window !== undefined && debouncedReloadDepartments());
watch(searchJobTitles, () => globalThis.window !== undefined && debouncedReloadJobTitles());

watch(pageCards, () => {
  selectedCardIds.value = [];
  loadCards();
});
watch(pageDepartments, () => {
  selectedDepartmentIds.value = [];
  loadDepartments();
});
watch(pageJobTitles, () => {
  selectedJobTitleIds.value = [];
  loadJobTitles();
});

async function logoutAdmin() {
  authError.value = null;
  try {
    await $fetch("/api/auth/admin/logout", { method: "POST" });
    await navigateTo("/");
  } catch (e) {
    authError.value = (e as Error)?.message ?? t("admin.loadError");
  }
}

async function loadAdminCredentials() {
  adminCredError.value = null;
  adminCredLoading.value = true;
  try {
    const res = await $fetch<{ email: string; storedInDatabase: boolean }>("/api/auth/admin/credentials");
    adminCredEmail.value = res.email;
    adminCredStoredInDb.value = res.storedInDatabase;
    adminCredNewEmail.value = res.email;
  } catch (e) {
    adminCredError.value = (e as any)?.data?.error || t("admin.accountError");
  } finally {
    adminCredLoading.value = false;
  }
}

async function saveAdminCredentials() {
  adminCredError.value = null;
  adminCredMessage.value = null;
  const cur = adminCredCurrentPassword.value;
  if (!cur) {
    adminCredError.value = t("admin.accountCurrentPassword") + " *";
    return;
  }
  const newEmail = adminCredNewEmail.value.trim();
  const newPassword = adminCredNewPassword.value;
  const sameEmail = newEmail === adminCredEmail.value;
  const pwdEmpty = !newPassword || String(newPassword).length === 0;
  if (sameEmail && pwdEmpty) {
    adminCredError.value = t("admin.accountNothingToChange");
    return;
  }
  adminCredLoading.value = true;
  try {
    await $fetch("/api/auth/admin/credentials", {
      method: "PUT",
      body: {
        currentPassword: cur,
        newEmail: sameEmail ? undefined : newEmail,
        newPassword: pwdEmpty ? undefined : newPassword,
      },
    });
    adminCredCurrentPassword.value = "";
    adminCredNewPassword.value = "";
    adminCredMessage.value = t("admin.accountSaved");
    await loadAdminCredentials();
  } catch (e) {
    adminCredError.value = (e as any)?.data?.error || t("admin.accountError");
  } finally {
    adminCredLoading.value = false;
  }
}

watch(activeTab, (tab) => {
  if (tab === "account") void loadAdminCredentials();
  if (tab === "appearance") void loadAppearanceSettings();
});

async function loadAppearanceSettings() {
  appearanceError.value = null;
  appearanceLoading.value = true;
  try {
    const res = await $fetch<{ allowUserTemplate: boolean; defaultTemplate: TemplateId }>(
      "/api/settings"
    );
    appearanceAllowUser.value = res.allowUserTemplate;
    appearanceDefaultTemplate.value = res.defaultTemplate;
  } catch (e) {
    appearanceError.value = (e as any)?.data?.error || t("admin.appearanceLoadError");
  } finally {
    appearanceLoading.value = false;
  }
}

async function saveAppearanceSettings() {
  appearanceMessage.value = null;
  appearanceError.value = null;
  appearanceSaving.value = true;
  try {
    const res = await $fetch<{ allowUserTemplate: boolean; defaultTemplate: TemplateId }>(
      "/api/admin/settings",
      {
        method: "PUT",
        body: {
          allowUserTemplate: appearanceAllowUser.value,
          defaultTemplate: appearanceDefaultTemplate.value,
        },
      }
    );
    appearanceAllowUser.value = res.allowUserTemplate;
    appearanceDefaultTemplate.value = res.defaultTemplate;
    appearanceMessage.value = t("admin.appearanceSaved");
  } catch (e) {
    appearanceError.value = (e as any)?.data?.error || t("admin.appearanceSaveError");
  } finally {
    appearanceSaving.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen px-4 py-6 sm:px-8">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">{{ t("admin.title") }}</h1>
      <div class="flex flex-wrap items-center gap-2">
        <ButtonsTheLocaleToggle :floating="false" />
        <ButtonsTheColorModeButton :floating="false" />
        <ButtonsTheColorSelector :floating="false" />
        <UButton type="button" variant="outline" size="sm" icon="i-lucide-log-out" @click="logoutAdmin">
          {{ t("admin.logout") }}
        </UButton>
      </div>
    </div>
    <p v-if="authError" class="mb-3 text-sm text-red-500">{{ authError }}</p>

    <div class="flex flex-wrap gap-2 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-700">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
        :class="activeTab === 'cards' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
        @click="activeTab = 'cards'"
      >
        {{ t("admin.tabCards") }}
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
        :class="activeTab === 'departments' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
        @click="activeTab = 'departments'"
      >
        {{ t("admin.tabDepartments") }}
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
        :class="activeTab === 'job_titles' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
        @click="activeTab = 'job_titles'"
      >
        {{ t("admin.tabJobTitles") }}
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
        :class="activeTab === 'appearance' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
        @click="activeTab = 'appearance'"
      >
        {{ t("admin.tabAppearance") }}
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
        :class="activeTab === 'account' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
        @click="activeTab = 'account'"
      >
        {{ t("admin.tabAccount") }}
      </button>
    </div>

    <!-- Onglet Cartes -->
    <template v-if="activeTab === 'cards'">
      <input
        ref="importCardsInput"
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        class="hidden"
        @change="onScopedImportFileChange($event, 'cards')"
      >
      <div
        class="mb-4 flex flex-col gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/40 p-4"
      >
        <p class="text-xs text-zinc-600 dark:text-zinc-400">
          {{ t("admin.dataTransferHintCards") }}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <UButton type="button" variant="outline" size="sm" icon="i-lucide-download" @click="exportScopedCsv('cards')">
            {{ t("admin.exportCsv") }}
          </UButton>
          <UButton type="button" variant="outline" size="sm" icon="i-lucide-upload" @click="importCardsInput?.click()">
            {{ t("admin.importCsv") }}
          </UButton>
        </div>
        <p v-if="cardsTransferMessage" class="text-xs text-green-600 dark:text-green-400">
          {{ cardsTransferMessage }}
        </p>
        <p v-if="cardsTransferError" class="text-xs text-red-500">
          {{ cardsTransferError }}
        </p>
        <template v-if="cardsTransferWarnings.length">
          <p class="text-xs font-medium text-amber-700 dark:text-amber-300">
            {{ t("admin.importWarningsTitle") }}
          </p>
          <ul class="text-xs text-amber-800 dark:text-amber-200 list-disc pl-4 space-y-0.5 max-h-32 overflow-y-auto">
            <li v-for="(w, i) in cardsTransferWarnings" :key="i">
              {{ w }}
            </li>
          </ul>
        </template>
      </div>
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="flex flex-wrap items-center gap-3">
        <UButton color="primary" variant="soft" size="md" @click="startCreate">
          {{ t("admin.createCard") }}
        </UButton>
        <UButton
          v-if="selectedCardIds.length"
          type="button"
          color="red"
          variant="soft"
          size="sm"
          icon="i-lucide-trash-2"
          @click="bulkDeleteSelectedCards"
        >
          {{ t("admin.bulkDelete") }} ({{ selectedCardIds.length }})
        </UButton>
        <UButton type="button" variant="outline" size="sm" @click="toggleSelectAllCardsOnPage">
          {{ allCardsOnPageSelected() ? t("admin.deselectAllPage") : t("admin.selectAllPage") }}
        </UButton>
        <span v-if="loading" class="text-sm text-zinc-500">{{ t("admin.loading") }}</span>
        <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
        </div>
        <div class="sm:ml-auto w-full sm:w-72">
          <UInput v-model="searchCards" :placeholder="t('admin.searchCards')" />
        </div>
      </div>

      <div class="flex flex-col gap-6">
        <div class="border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-sm">
          <div class="mb-6">
            <h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {{ editing?.id ? t("admin.editCard") : t("admin.createCardForm") }}
            </h2>
            <p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-2xl">
              {{ t("admin.helpText") }}
            </p>
          </div>

          <div v-if="editing" class="space-y-8">
            <section class="space-y-4">
              <h3
                class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700 pb-2"
              >
                {{ t("admin.formSectionIdentity") }}
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <UFormField :label="t('admin.email')" required class="md:col-span-2">
                  <UInput v-model="editing.email" type="email" class="w-full" />
                </UFormField>
                <UFormField :label="t('admin.firstName')" class="min-w-0">
                  <UInput v-model="editing.first_name" class="w-full" />
                </UFormField>
                <UFormField :label="t('admin.lastName')" class="min-w-0">
                  <UInput v-model="editing.last_name" class="w-full" />
                </UFormField>
              </div>
            </section>

            <section class="space-y-4">
              <h3
                class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700 pb-2"
              >
                {{ t("admin.formSectionOrganization") }}
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <UFormField :label="t('admin.department')" class="min-w-0">
                  <select
                    v-model="departmentSelectValue"
                    class="w-full min-w-0 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                  >
                    <option v-for="opt in departmentOptions" :key="String(opt.value)" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </UFormField>
                <UFormField :label="t('admin.titleField')" class="min-w-0">
                  <select
                    v-model="jobTitleSelectValue"
                    class="w-full min-w-0 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                  >
                    <option v-for="opt in jobTitleOptions" :key="String(opt.value)" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </UFormField>
              </div>
            </section>

            <section class="space-y-4">
              <h3
                class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700 pb-2"
              >
                {{ t("admin.formSectionContact") }}
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <UFormField :label="t('admin.phone')" class="min-w-0">
                  <UInput :model-value="FIXED_PHONE" readonly class="w-full" />
                </UFormField>
                <UFormField :label="t('admin.fax')" class="min-w-0">
                  <UInput :model-value="FIXED_FAX" readonly class="w-full" />
                </UFormField>
                <UFormField :label="t('admin.mobile')" class="min-w-0 sm:col-span-2 lg:col-span-1">
                  <UInput v-model="editing.mobile" inputmode="numeric" class="w-full" />
                </UFormField>
              </div>
            </section>

            <div
              class="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700"
            >
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

        <div class="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
          <table class="min-w-full text-sm">
            <thead class="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th class="px-2 py-2 w-10 text-center font-semibold" @click.stop>
                  <input
                    type="checkbox"
                    class="rounded border-zinc-300 dark:border-zinc-600"
                    :checked="allCardsOnPageSelected()"
                    @click.prevent="toggleSelectAllCardsOnPage"
                  >
                </th>
                <th class="px-3 py-2 text-left font-semibold">{{ t("admin.email") }}</th>
                <th class="px-3 py-2 text-left font-semibold">{{ t("admin.name") }}</th>
                <th class="px-3 py-2 text-left font-semibold">{{ t("admin.department") }}</th>
                <th class="px-3 py-2 text-left font-semibold">{{ t("admin.jobTitle") }}</th>
                <th class="px-3 py-2 text-right font-semibold">{{ t("admin.actions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="card in cards.items"
                :key="card.id"
                class="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer"
                @click="startEdit(card)"
              >
                <td class="px-2 py-2 text-center" @click.stop>
                  <input
                    type="checkbox"
                    class="rounded border-zinc-300 dark:border-zinc-600"
                    :checked="selectedCardIds.includes(card.id)"
                    @change="toggleCardSelection(card.id, ($event.target as HTMLInputElement).checked)"
                  >
                </td>
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
<tr v-if="!loading && cards.items.length === 0">
              <td colspan="6" class="px-3 py-8 text-center text-sm text-zinc-500">
                {{ t("admin.noCards") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between gap-3 px-2 py-3">
        <p class="text-xs text-zinc-500">
          {{ cards.total }} résultat(s)
        </p>
        <div class="flex items-center gap-2">
          <UButton
            type="button"
            size="sm"
            variant="outline"
            :disabled="pageCards <= 1"
            @click="pageCards -= 1"
          >
            {{ t("admin.prev") }}
          </UButton>
          <span class="text-xs text-zinc-600 dark:text-zinc-300">
            {{ pageCards }} / {{ Math.max(1, Math.ceil(cards.total / pageSize)) }}
          </span>
          <UButton
            type="button"
            size="sm"
            variant="outline"
            :disabled="pageCards >= Math.ceil(cards.total / pageSize)"
            @click="pageCards += 1"
          >
            {{ t("admin.next") }}
          </UButton>
        </div>
      </div>
      </div>
    </template>

    <!-- Onglet Directions -->
    <template v-else-if="activeTab === 'departments'">
      <input
        ref="importDepartmentsInput"
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        class="hidden"
        @change="onScopedImportFileChange($event, 'departments')"
      >
      <div
        class="mb-4 flex flex-col gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/40 p-4"
      >
        <p class="text-xs text-zinc-600 dark:text-zinc-400">
          {{ t("admin.dataTransferHintDepartments") }}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            type="button"
            variant="outline"
            size="sm"
            icon="i-lucide-download"
            @click="exportScopedCsv('departments')"
          >
            {{ t("admin.exportCsv") }}
          </UButton>
          <UButton
            type="button"
            variant="outline"
            size="sm"
            icon="i-lucide-upload"
            @click="importDepartmentsInput?.click()"
          >
            {{ t("admin.importCsv") }}
          </UButton>
        </div>
        <p v-if="departmentsTransferMessage" class="text-xs text-green-600 dark:text-green-400">
          {{ departmentsTransferMessage }}
        </p>
        <p v-if="departmentsTransferError" class="text-xs text-red-500">
          {{ departmentsTransferError }}
        </p>
        <template v-if="departmentsTransferWarnings.length">
          <p class="text-xs font-medium text-amber-700 dark:text-amber-300">
            {{ t("admin.importWarningsTitle") }}
          </p>
          <ul class="text-xs text-amber-800 dark:text-amber-200 list-disc pl-4 space-y-0.5 max-h-32 overflow-y-auto">
            <li v-for="(w, i) in departmentsTransferWarnings" :key="i">
              {{ w }}
            </li>
          </ul>
        </template>
      </div>
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <UButton color="primary" variant="soft" @click="openAddDepartment">
            {{ t("admin.addDepartment") }}
          </UButton>
          <UButton
            v-if="selectedDepartmentIds.length"
            type="button"
            color="red"
            variant="soft"
            size="sm"
            icon="i-lucide-trash-2"
            @click="bulkDeleteSelectedDepartments"
          >
            {{ t("admin.bulkDelete") }} ({{ selectedDepartmentIds.length }})
          </UButton>
          <UButton type="button" variant="outline" size="sm" @click="toggleSelectAllDepartmentsOnPage">
            {{ allDepartmentsOnPageSelected() ? t("admin.deselectAllPage") : t("admin.selectAllPage") }}
          </UButton>
        </div>
        <div class="sm:ml-auto w-full sm:w-72">
          <UInput v-model="searchDepartments" :placeholder="t('admin.searchDepartments')" />
        </div>
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
      <div class="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900">
        <table class="min-w-full text-sm">
          <thead class="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th class="px-2 py-2 w-10 text-center font-semibold" @click.stop>
                <input
                  type="checkbox"
                  class="rounded border-zinc-300 dark:border-zinc-600"
                  :checked="allDepartmentsOnPageSelected()"
                  @click.prevent="toggleSelectAllDepartmentsOnPage"
                >
              </th>
              <th class="px-3 py-2 text-left font-semibold">{{ t("admin.labelFr") }}</th>
              <th class="px-3 py-2 text-left font-semibold">{{ t("admin.labelEn") }}</th>
              <th class="px-3 py-2 text-right font-semibold">{{ t("admin.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in departments.items"
              :key="d.id"
              class="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
            >
              <td class="px-2 py-2 text-center" @click.stop>
                <input
                  type="checkbox"
                  class="rounded border-zinc-300 dark:border-zinc-600"
                  :checked="selectedDepartmentIds.includes(d.id)"
                  @change="toggleDepartmentSelection(d.id, ($event.target as HTMLInputElement).checked)"
                >
              </td>
              <td class="px-3 py-2 cursor-pointer" @click="openEditDepartment(d)">{{ d.label_fr }}</td>
              <td class="px-3 py-2 cursor-pointer" @click="openEditDepartment(d)">{{ d.label_en }}</td>
              <td class="px-3 py-2 text-right">
                <UButton variant="ghost" size="xs" @click.stop="openEditDepartment(d)">{{ t("admin.editCard") }}</UButton>
                <UButton color="red" variant="ghost" size="xs" @click.stop="removeDepartment(d)">{{ t("admin.delete") }}</UButton>
              </td>
            </tr>
            <tr v-if="departments.items.length === 0">
              <td colspan="4" class="px-3 py-4 text-center text-zinc-500">{{ t("admin.noCards") }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between gap-3 px-2 py-3">
        <p class="text-xs text-zinc-500">
          {{ departments.total }} résultat(s)
        </p>
        <div class="flex items-center gap-2">
          <UButton type="button" size="sm" variant="outline" :disabled="pageDepartments <= 1" @click="pageDepartments -= 1">
            {{ t("admin.prev") }}
          </UButton>
          <span class="text-xs text-zinc-600 dark:text-zinc-300">
            {{ pageDepartments }} / {{ Math.max(1, Math.ceil(departments.total / pageSize)) }}
          </span>
          <UButton
            type="button"
            size="sm"
            variant="outline"
            :disabled="pageDepartments >= Math.ceil(departments.total / pageSize)"
            @click="pageDepartments += 1"
          >
            {{ t("admin.next") }}
          </UButton>
        </div>
      </div>
    </template>

    <!-- Onglet Titres / Postes -->
    <template v-else-if="activeTab === 'job_titles'">
      <input
        ref="importJobTitlesInput"
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        class="hidden"
        @change="onScopedImportFileChange($event, 'job_titles')"
      >
      <div
        class="mb-4 flex flex-col gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/40 p-4"
      >
        <p class="text-xs text-zinc-600 dark:text-zinc-400">
          {{ t("admin.dataTransferHintJobTitles") }}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            type="button"
            variant="outline"
            size="sm"
            icon="i-lucide-download"
            @click="exportScopedCsv('job_titles')"
          >
            {{ t("admin.exportCsv") }}
          </UButton>
          <UButton
            type="button"
            variant="outline"
            size="sm"
            icon="i-lucide-upload"
            @click="importJobTitlesInput?.click()"
          >
            {{ t("admin.importCsv") }}
          </UButton>
        </div>
        <p v-if="jobTitlesTransferMessage" class="text-xs text-green-600 dark:text-green-400">
          {{ jobTitlesTransferMessage }}
        </p>
        <p v-if="jobTitlesTransferError" class="text-xs text-red-500">
          {{ jobTitlesTransferError }}
        </p>
        <template v-if="jobTitlesTransferWarnings.length">
          <p class="text-xs font-medium text-amber-700 dark:text-amber-300">
            {{ t("admin.importWarningsTitle") }}
          </p>
          <ul class="text-xs text-amber-800 dark:text-amber-200 list-disc pl-4 space-y-0.5 max-h-32 overflow-y-auto">
            <li v-for="(w, i) in jobTitlesTransferWarnings" :key="i">
              {{ w }}
            </li>
          </ul>
        </template>
      </div>
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <UButton color="primary" variant="soft" @click="openAddJobTitle">
            {{ t("admin.addJobTitle") }}
          </UButton>
          <UButton
            v-if="selectedJobTitleIds.length"
            type="button"
            color="red"
            variant="soft"
            size="sm"
            icon="i-lucide-trash-2"
            @click="bulkDeleteSelectedJobTitles"
          >
            {{ t("admin.bulkDelete") }} ({{ selectedJobTitleIds.length }})
          </UButton>
          <UButton type="button" variant="outline" size="sm" @click="toggleSelectAllJobTitlesOnPage">
            {{ allJobTitlesOnPageSelected() ? t("admin.deselectAllPage") : t("admin.selectAllPage") }}
          </UButton>
        </div>
        <div class="sm:ml-auto w-full sm:w-72">
          <UInput v-model="searchJobTitles" :placeholder="t('admin.searchJobTitles')" />
        </div>
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
      <div class="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900">
        <table class="min-w-full text-sm">
          <thead class="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th class="px-2 py-2 w-10 text-center font-semibold" @click.stop>
                <input
                  type="checkbox"
                  class="rounded border-zinc-300 dark:border-zinc-600"
                  :checked="allJobTitlesOnPageSelected()"
                  @click.prevent="toggleSelectAllJobTitlesOnPage"
                >
              </th>
              <th class="px-3 py-2 text-left font-semibold">{{ t("admin.labelFr") }}</th>
              <th class="px-3 py-2 text-left font-semibold">{{ t("admin.labelEn") }}</th>
              <th class="px-3 py-2 text-right font-semibold">{{ t("admin.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="j in jobTitles.items"
              :key="j.id"
              class="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
            >
              <td class="px-2 py-2 text-center" @click.stop>
                <input
                  type="checkbox"
                  class="rounded border-zinc-300 dark:border-zinc-600"
                  :checked="selectedJobTitleIds.includes(j.id)"
                  @change="toggleJobTitleSelection(j.id, ($event.target as HTMLInputElement).checked)"
                >
              </td>
              <td class="px-3 py-2 cursor-pointer" @click="openEditJobTitle(j)">{{ j.label_fr }}</td>
              <td class="px-3 py-2 cursor-pointer" @click="openEditJobTitle(j)">{{ j.label_en }}</td>
              <td class="px-3 py-2 text-right">
                <UButton variant="ghost" size="xs" @click.stop="openEditJobTitle(j)">{{ t("admin.editCard") }}</UButton>
                <UButton color="red" variant="ghost" size="xs" @click.stop="removeJobTitle(j)">{{ t("admin.delete") }}</UButton>
              </td>
            </tr>
            <tr v-if="jobTitles.items.length === 0">
              <td colspan="4" class="px-3 py-4 text-center text-zinc-500">{{ t("admin.noCards") }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between gap-3 px-2 py-3">
        <p class="text-xs text-zinc-500">
          {{ jobTitles.total }} résultat(s)
        </p>
        <div class="flex items-center gap-2">
          <UButton type="button" size="sm" variant="outline" :disabled="pageJobTitles <= 1" @click="pageJobTitles -= 1">
            {{ t("admin.prev") }}
          </UButton>
          <span class="text-xs text-zinc-600 dark:text-zinc-300">
            {{ pageJobTitles }} / {{ Math.max(1, Math.ceil(jobTitles.total / pageSize)) }}
          </span>
          <UButton
            type="button"
            size="sm"
            variant="outline"
            :disabled="pageJobTitles >= Math.ceil(jobTitles.total / pageSize)"
            @click="pageJobTitles += 1"
          >
            {{ t("admin.next") }}
          </UButton>
        </div>
      </div>
    </template>

    <!-- Onglet Apparence -->
    <template v-else-if="activeTab === 'appearance'">
      <div class="max-w-3xl space-y-5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <div>
          <h2 class="text-lg font-semibold">{{ t("admin.appearanceTitle") }}</h2>
          <p class="mt-1 text-xs text-zinc-500">{{ t("admin.appearanceHelp") }}</p>
        </div>

        <p v-if="appearanceLoading" class="text-sm text-zinc-500">{{ t("admin.loading") }}</p>
        <template v-else>
          <label class="flex items-start gap-3 cursor-pointer select-none">
            <input
              v-model="appearanceAllowUser"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
            >
            <span>
              <span class="block text-sm font-medium">{{ t("admin.appearanceAllowUser") }}</span>
              <span class="block text-xs text-zinc-500 dark:text-zinc-400">{{ t("admin.appearanceAllowUserHelp") }}</span>
            </span>
          </label>

          <div>
            <p class="text-sm font-medium mb-2">{{ t("admin.appearanceDefaultTemplate") }}</p>
            <p class="text-xs text-zinc-500 mb-3">{{ t("admin.appearanceDefaultTemplateHelp") }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                v-for="tpl in CARD_TEMPLATES"
                :key="tpl.id"
                type="button"
                class="group relative rounded-xl overflow-hidden border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
                :class="appearanceDefaultTemplate === tpl.id ? 'border-primary-500 shadow-md' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'"
                :aria-pressed="appearanceDefaultTemplate === tpl.id"
                @click="appearanceDefaultTemplate = tpl.id"
              >
                <img
                  :src="tpl.background"
                  :alt="t(tpl.labelKey)"
                  class="w-full h-32 object-cover"
                  loading="lazy"
                >
                <span class="block px-3 py-2 text-sm font-medium bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200">
                  {{ t(tpl.labelKey) }}
                </span>
                <span
                  v-if="appearanceDefaultTemplate === tpl.id"
                  class="absolute top-2 right-2 rounded-full bg-primary-500 text-white w-6 h-6 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <UIcon name="i-lucide-check" class="w-4 h-4" />
                </span>
              </button>
            </div>
          </div>

          <p v-if="appearanceMessage" class="text-sm text-green-600 dark:text-green-400">{{ appearanceMessage }}</p>
          <p v-if="appearanceError" class="text-sm text-red-500">{{ appearanceError }}</p>

          <UButton color="primary" :loading="appearanceSaving" @click="saveAppearanceSettings">
            {{ t("admin.save") }}
          </UButton>
        </template>
      </div>
    </template>

    <template v-else-if="activeTab === 'account'">
      <div class="max-w-lg space-y-4 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <h2 class="text-lg font-semibold">{{ t("admin.accountTitle") }}</h2>
        <p class="text-xs text-zinc-500">{{ t("admin.accountHelp") }}</p>
        <p class="text-xs text-zinc-600 dark:text-zinc-400">
          {{ adminCredStoredInDb ? t("admin.accountStoredInDb") : t("admin.accountStoredInEnv") }}
        </p>
        <p v-if="adminCredLoading && !adminCredEmail" class="text-sm text-zinc-500">{{ t("admin.loading") }}</p>
        <template v-else>
          <UFormField :label="t('admin.accountCurrentPassword')">
            <UInput v-model="adminCredCurrentPassword" type="password" autocomplete="current-password" />
          </UFormField>
          <UFormField :label="t('admin.accountNewEmail')">
            <UInput v-model="adminCredNewEmail" type="email" autocomplete="username" />
          </UFormField>
          <UFormField :label="t('admin.accountNewPassword')">
            <UInput v-model="adminCredNewPassword" type="password" autocomplete="new-password" />
          </UFormField>
          <p v-if="adminCredError" class="text-sm text-red-500">{{ adminCredError }}</p>
          <p v-if="adminCredMessage" class="text-sm text-green-600 dark:text-green-400">{{ adminCredMessage }}</p>
          <UButton color="primary" :loading="adminCredLoading" @click="saveAdminCredentials">
            {{ t("admin.accountSave") }}
          </UButton>
        </template>
      </div>
    </template>
  </div>
</template>
