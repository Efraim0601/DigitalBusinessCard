import { flushPromises, shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCardsPage from "../../app/pages/admin/cards.vue";

const STUBS = [
  "ButtonsTheLocaleToggle",
  "ButtonsTheColorModeButton",
  "ButtonsTheColorSelector",
  "UButton",
  "UInput",
  "UFormField",
] as const;

/** Accès aux bindings `<script setup>` (refs déballées sur `vm` selon la version). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminVm = any;

const fetchMock = vi.fn();
const navigateToMock = vi.fn();
type AdminCardsVm = {
  logoutAdmin: () => Promise<void>;
  authError: string | null;
  startCreate: () => void;
  startEdit: (card: Record<string, unknown>) => void;
  saveCard: () => Promise<void>;
  removeCard: (card: Record<string, unknown>) => Promise<void>;
  openAddDepartment: () => void;
  openEditDepartment: (d: { id: string; label_fr: string; label_en: string }) => void;
  saveDepartment: () => Promise<void>;
  openAddJobTitle: () => void;
  openEditJobTitle: (j: { id: string; label_fr: string; label_en: string }) => void;
  saveJobTitle: () => Promise<void>;
  cardDepartmentLabel: (card: Record<string, unknown>) => string;
  cardTitleLabel: (card: Record<string, unknown>) => string;
  editing: Record<string, unknown> | null;
  departmentForm: { id: string | null; label_fr: string; label_en: string } | null;
  jobTitleForm: { id: string | null; label_fr: string; label_en: string } | null;
  departmentSaveError: string | null;
  jobTitleSaveError: string | null;
};

describe("app/pages/admin/cards.vue", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    navigateToMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });

    Object.assign(globalThis, {
      definePageMeta: vi.fn(),
      useAppLocale: () => ({ t: (k: string) => k, locale: "fr" }),
      $fetch: fetchMock,
      navigateTo: navigateToMock,
      confirm: vi.fn(() => true),
    });
  });

  it("loads cards, departments and job titles on mount", async () => {
    shallowMount(AdminCardsPage, {
      global: {
        stubs: [
          "ButtonsTheLocaleToggle",
          "ButtonsTheColorModeButton",
          "ButtonsTheColorSelector",
          "UButton",
          "UInput",
          "UFormField",
        ],
      },
    });
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledWith("/api/cards", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/departments", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/job-titles", expect.any(Object));
  });

  it("logs out and redirects to home", async () => {
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: ["ButtonsTheLocaleToggle", "ButtonsTheColorModeButton", "ButtonsTheColorSelector", "UButton", "UInput", "UFormField"] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await vm.logoutAdmin();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/admin/logout", { method: "POST" });
    expect(navigateToMock).toHaveBeenCalledWith("/");
  });

  it("keeps auth error when logout fails", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/auth/admin/logout") return Promise.reject(new Error("boom"));
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: ["ButtonsTheLocaleToggle", "ButtonsTheColorModeButton", "ButtonsTheColorSelector", "UButton", "UInput", "UFormField"] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await vm.logoutAdmin();
    expect(vm.authError).toBe("boom");
  });

  it("creates and updates a card payload with fixed phone/fax", async () => {
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: ["ButtonsTheLocaleToggle", "ButtonsTheColorModeButton", "ButtonsTheColorSelector", "UButton", "UInput", "UFormField"] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;

    vm.startCreate();
    vm.editing!.email = "john@example.com";
    vm.editing!.first_name = "John";
    vm.editing!.last_name = "Doe";
    vm.editing!.mobile = "699112233";
    await vm.saveCard();
    expect(fetchMock).toHaveBeenCalledWith("/api/cards", {
      method: "POST",
      body: expect.objectContaining({
        email: "john@example.com",
        phone: "222 233 068",
        fax: "222 221 785",
        mobile: "699 112 233",
      }),
    });

    vm.startEdit({ id: "c1", email: "john@example.com", first_name: "John", last_name: "Doe", mobile: "690111222" });
    await vm.saveCard();
    expect(fetchMock).toHaveBeenCalledWith("/api/cards/c1", {
      method: "PUT",
      body: expect.objectContaining({
        phone: "222 233 068",
        fax: "222 221 785",
      }),
    });
  });

  it("respects delete confirmation for cards", async () => {
    const confirmMock = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmMock);
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: ["ButtonsTheLocaleToggle", "ButtonsTheColorModeButton", "ButtonsTheColorSelector", "UButton", "UInput", "UFormField"] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await vm.removeCard({ id: "c1", first_name: "John", last_name: "Doe" });
    expect(fetchMock).not.toHaveBeenCalledWith("/api/cards/c1", expect.anything());
    confirmMock.mockReturnValue(true);
    await vm.removeCard({ id: "c1", first_name: "John", last_name: "Doe" });
    expect(fetchMock).toHaveBeenCalledWith("/api/cards/c1", { method: "DELETE" });
  });

  it("validates and saves departments for create and update", async () => {
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: ["ButtonsTheLocaleToggle", "ButtonsTheColorModeButton", "ButtonsTheColorSelector", "UButton", "UInput", "UFormField"] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    vm.openAddDepartment();
    vm.departmentForm!.label_fr = "";
    vm.departmentForm!.label_en = "";
    await vm.saveDepartment();
    expect(vm.departmentSaveError).toContain("admin.labelFr");

    vm.departmentForm = { id: null, label_fr: "Finance", label_en: "Finance" };
    await vm.saveDepartment();
    expect(fetchMock).toHaveBeenCalledWith("/api/departments", {
      method: "POST",
      body: { label_fr: "Finance", label_en: "Finance" },
    });

    vm.openEditDepartment({ id: "d1", label_fr: "DSI", label_en: "IT" });
    await vm.saveDepartment();
    expect(fetchMock).toHaveBeenCalledWith("/api/departments/d1", {
      method: "PUT",
      body: { label_fr: "DSI", label_en: "IT" },
    });
  });

  it("sets save error from API when department save fails", async () => {
    fetchMock.mockImplementation((url: string, options?: { method?: string }) => {
      if (url === "/api/departments" && options?.method === "POST") {
        return Promise.reject({ data: { error: "duplicate" } });
      }
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: ["ButtonsTheLocaleToggle", "ButtonsTheColorModeButton", "ButtonsTheColorSelector", "UButton", "UInput", "UFormField"] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    vm.departmentForm = { id: null, label_fr: "DSI", label_en: "IT" };
    await vm.saveDepartment();
    expect(vm.departmentSaveError).toBe("duplicate");
  });

  it("validates and saves job titles for create and update", async () => {
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: ["ButtonsTheLocaleToggle", "ButtonsTheColorModeButton", "ButtonsTheColorSelector", "UButton", "UInput", "UFormField"] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    vm.openAddJobTitle();
    vm.jobTitleForm!.label_fr = "";
    vm.jobTitleForm!.label_en = "";
    await vm.saveJobTitle();
    expect(vm.jobTitleSaveError).toContain("admin.labelFr");

    vm.jobTitleForm = { id: null, label_fr: "Analyste", label_en: "Analyst" };
    await vm.saveJobTitle();
    expect(fetchMock).toHaveBeenCalledWith("/api/job-titles", {
      method: "POST",
      body: { label_fr: "Analyste", label_en: "Analyst" },
    });

    vm.openEditJobTitle({ id: "j1", label_fr: "Chef", label_en: "Lead" });
    await vm.saveJobTitle();
    expect(fetchMock).toHaveBeenCalledWith("/api/job-titles/j1", {
      method: "PUT",
      body: { label_fr: "Chef", label_en: "Lead" },
    });
  });

  it("uses localized labels for department and job title", async () => {
    Object.assign(globalThis, {
      definePageMeta: vi.fn(),
      useAppLocale: () => ({ t: (k: string) => k, locale: "en" }),
      $fetch: fetchMock,
      navigateTo: navigateToMock,
      confirm: vi.fn(() => true),
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: ["ButtonsTheLocaleToggle", "ButtonsTheColorModeButton", "ButtonsTheColorSelector", "UButton", "UInput", "UFormField"] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    expect(vm.cardDepartmentLabel({ department: { label_fr: "Direction", label_en: "Management" } })).toBe("Management");
    expect(vm.cardTitleLabel({ job_title: { label_fr: "Directeur", label_en: "Director" } })).toBe("Director");
  });
});

describe("app/pages/admin/cards.vue — couverture étendue", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    navigateToMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation((url: string, options?: { method?: string }) => {
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/auth/admin/credentials" && options?.method !== "PUT") {
        return Promise.resolve({ email: "admin@test.com", storedInDatabase: false });
      }
      return Promise.resolve({});
    });
    Object.assign(globalThis, {
      definePageMeta: vi.fn(),
      useAppLocale: () => ({ t: (k: string, params?: Record<string, string>) => (params ? `${k}:${JSON.stringify(params)}` : k), locale: "fr" }),
      $fetch: fetchMock,
      navigateTo: navigateToMock,
      confirm: vi.fn(() => true),
    });
  });

  function mountPage() {
    return shallowMount(AdminCardsPage, { global: { stubs: [...STUBS] } });
  }

  it("exportScopedCsv : succès pour cards, departments et job_titles (blob + lien)", async () => {
    const click = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return { click, href: "", download: "" } as unknown as HTMLAnchorElement;
      }
      return origCreate(tag);
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/admin/data-export") return Promise.resolve(new ArrayBuffer(2));
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });

    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;

    await vm.exportScopedCsv("cards");
    expect(vm.cardsXferMsg).toBe("admin.exportCsvSuccess");
    await vm.exportScopedCsv("departments");
    expect(vm.deptXferMsg).toBe("admin.exportCsvSuccess");
    await vm.exportScopedCsv("job_titles");
    expect(vm.jobXferMsg).toBe("admin.exportCsvSuccess");
    expect(click.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("exportScopedCsv : erreur réseau par scope", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/admin/data-export") return Promise.reject(new Error("net"));
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;
    await vm.exportScopedCsv("cards");
    expect(vm.cardsXferErr).toBe("admin.exportError");
    await vm.exportScopedCsv("departments");
    expect(vm.deptXferErr).toBe("admin.exportError");
    await vm.exportScopedCsv("job_titles");
    expect(vm.jobXferErr).toBe("admin.exportError");
  });

  function fileChangeEvent(name = "x.csv") {
    const input = document.createElement("input");
    const dt = new DataTransfer();
    dt.items.add(new File(["e"], name, { type: "text/csv" }));
    input.files = dt.files;
    return { target: input } as unknown as Event;
  }

  it("onScopedImportChange : ignore sans fichier", async () => {
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;
    const input = document.createElement("input");
    const ev = { target: input } as unknown as Event;
    await vm.onScopedImportChange(ev, "cards");
    const importCalls = fetchMock.mock.calls.filter((c) => c[0] === "/api/admin/data-import");
    expect(importCalls.length).toBe(0);
  });

  it("onScopedImportChange : succès + avertissements (cartes)", async () => {
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/admin/data-import" && opts?.method === "POST") {
        return Promise.resolve({
          success: true,
          imported: { departments: 0, job_titles: 0, cards: 3 },
          warnings: ["ligne 2"],
        });
      }
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;
    vm.selectedCardIds = ["x"];
    await vm.onScopedImportChange(fileChangeEvent(), "cards");
    expect(vm.cardsXferMsg).toContain("admin.importSuccessCards");
    expect(vm.cardsXferWarn).toEqual(["ligne 2"]);
    expect(vm.selectedCardIds).toEqual([]);
  });

  it("onScopedImportChange : erreur API avec data.error ou message générique", async () => {
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;

    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/admin/data-import" && opts?.method === "POST") {
        return Promise.reject({ data: { error: "refus" } });
      }
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    await vm.onScopedImportChange(fileChangeEvent(), "cards");
    expect(vm.cardsXferErr).toBe("refus");

    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/admin/data-import" && opts?.method === "POST") return Promise.reject(new Error("x"));
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    await vm.onScopedImportChange(fileChangeEvent("b.csv"), "departments");
    expect(vm.deptXferErr).toBe("admin.importError");

    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/admin/data-import" && opts?.method === "POST") return Promise.reject(new Error("y"));
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    await vm.onScopedImportChange(fileChangeEvent("c.csv"), "job_titles");
    expect(vm.jobXferErr).toBe("admin.importError");
  });

  it("loadCards : erreur API et filtre des sélections après rechargement", async () => {
    let calls = 0;
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/cards") {
        calls += 1;
        if (calls === 1) return Promise.reject(new Error("down"));
        return Promise.resolve({ items: [{ id: "c1", email: "a@b.com" }], total: 1, limit: 20, offset: 0 });
      }
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;
    expect(vm.error).toBe("admin.loadError");
    vm.selectedCardIds = ["gone", "c1"];
    await vm.loadCards();
    expect(vm.selectedCardIds).toEqual(["c1"]);
  });

  it("loadDepartments / loadJobTitles : réponse sans items et catch", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.reject(new Error("jt"));
      return Promise.resolve({});
    });
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;
    expect(vm.departments.items).toEqual([]);
    await expect(vm.loadJobTitles()).resolves.toBeUndefined();
  });

  it("setters departmentSelectValue / jobTitleSelectValue et options peuplées", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") {
        return Promise.resolve({
          items: [{ id: "d1", label_fr: "RH", label_en: "HR" }],
          total: 1,
          limit: 20,
          offset: 0,
        });
      }
      if (url === "/api/job-titles") {
        return Promise.resolve({
          items: [{ id: "j1", label_fr: "Dev", label_en: "Dev" }],
          total: 1,
          limit: 20,
          offset: 0,
        });
      }
      return Promise.resolve({});
    });
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;
    vm.startCreate();
    vm.departmentSelectValue = "d1";
    expect(vm.editing.company).toBeNull();
    vm.jobTitleSelectValue = "j1";
    expect(vm.editing.title).toBeNull();
    const dOpts = wrapper.vm.departmentOptions as { value: string; label: string }[];
    expect(dOpts.some((o) => o.value === "d1")).toBe(true);
    const jOpts = wrapper.vm.jobTitleOptions as { value: string; label: string }[];
    expect(jOpts.some((o) => o.value === "j1")).toBe(true);
  });

  it("saveCard : sans formulaire, branches company/title, et catch", async () => {
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;
    await vm.saveCard();
    vm.editing = null;
    await vm.saveCard();

    vm.startCreate();
    vm.editing.email = "u@x.com";
    vm.editing.company = "Libre";
    vm.editing.title = "Titre libre";
    await vm.saveCard();
    let post = fetchMock.mock.calls.find((c) => c[0] === "/api/cards" && (c[1] as { method?: string })?.method === "POST");
    expect((post?.[1] as { body: { company: string | null; title: string | null } }).body).toMatchObject({
      company: "Libre",
      title: "Titre libre",
    });

    vm.startCreate();
    vm.editing.email = "u2@x.com";
    vm.editing.department_id = "d1";
    vm.editing.job_title_id = "j1";
    await vm.saveCard();
    const posts = fetchMock.mock.calls.filter(
      (c) => c[0] === "/api/cards" && (c[1] as { method?: string })?.method === "POST"
    );
    post = posts.at(-1);
    expect((post?.[1] as { body: { company: unknown; title: unknown } }).body).toMatchObject({
      company: null,
      title: null,
    });

    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/cards" && opts?.method === "POST") return Promise.reject(new Error("fail"));
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    vm.startCreate();
    vm.editing.email = "u3@x.com";
    await vm.saveCard();
  });

  it("sélection cartes : toggle, tout sélectionner / désélectionner, bulk delete", async () => {
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/cards") {
        return Promise.resolve({
          items: [
            { id: "c1", email: "a@b.com" },
            { id: "c2", email: "b@b.com" },
          ],
          total: 2,
          limit: 20,
          offset: 0,
        });
      }
      if (url === "/api/cards/bulk-delete" && opts?.method === "POST") return Promise.resolve({ success: true });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;

    await vm.bulkDeleteSelectedCards();
    vm.toggleCardSelection("c1", true);
    expect(vm.selectedCardIds).toContain("c1");
    vm.toggleCardSelection("c1", false);
    expect(vm.selectedCardIds).not.toContain("c1");

    vm.toggleSelectAllCardsOnPage();
    expect(vm.allCardsOnPageSelected()).toBe(true);
    vm.toggleSelectAllCardsOnPage();
    expect(vm.selectedCardIds.length).toBe(0);

    vm.toggleSelectAllCardsOnPage();
    vi.stubGlobal("confirm", vi.fn(() => false));
    await vm.bulkDeleteSelectedCards();
    vi.stubGlobal("confirm", vi.fn(() => true));

    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/cards/bulk-delete" && opts?.method === "POST") return Promise.reject(new Error("bd"));
      if (url === "/api/cards") {
        return Promise.resolve({
          items: [
            { id: "c1", email: "a@b.com" },
            { id: "c2", email: "b@b.com" },
          ],
          total: 2,
          limit: 20,
          offset: 0,
        });
      }
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    vm.selectedCardIds = ["c1", "c2"];
    await vm.bulkDeleteSelectedCards();
    await flushPromises();
    expect(vm.error).toBe("admin.loadError");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cards/bulk-delete",
      expect.objectContaining({ method: "POST", body: { ids: expect.any(Array) } })
    );
  });

  it("directions : sélection, bulk delete (annulation + erreur), removeDepartment", async () => {
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") {
        return Promise.resolve({
          items: [
            { id: "d1", label_fr: "A", label_en: "A" },
            { id: "d2", label_fr: "B", label_en: "B" },
          ],
          total: 2,
          limit: 20,
          offset: 0,
        });
      }
      if (url === "/api/departments/bulk-delete" && opts?.method === "POST") return Promise.reject(new Error("x"));
      if (url === "/api/departments/d1" && opts?.method === "DELETE") return Promise.resolve({});
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;

    vm.toggleDepartmentSelection("d1", true);
    expect(vm.selectedDepartmentIds).toContain("d1");
    vm.toggleSelectAllDepartmentsOnPage();
    expect(vm.allDepartmentsOnPageSelected()).toBe(true);
    vm.toggleSelectAllDepartmentsOnPage();

    vi.stubGlobal("confirm", vi.fn(() => false));
    vm.toggleSelectAllDepartmentsOnPage();
    await vm.bulkDeleteSelectedDepartments();
    vi.stubGlobal("confirm", vi.fn(() => true));
    await vm.bulkDeleteSelectedDepartments();

    vi.stubGlobal("confirm", vi.fn(() => false));
    await vm.removeDepartment({ id: "d1" });
    vi.stubGlobal("confirm", vi.fn(() => true));
    await vm.removeDepartment({ id: "d1" });
  });

  it("titres : sélection, bulk delete, removeJobTitle, saveJobTitle sans formulaire + catch", async () => {
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles" && opts?.method === "POST") {
        return Promise.reject({ data: { error: "dup" } });
      }
      if (url === "/api/job-titles") {
        return Promise.resolve({
          items: [
            { id: "j1", label_fr: "T1", label_en: "T1" },
            { id: "j2", label_fr: "T2", label_en: "T2" },
          ],
          total: 2,
          limit: 20,
          offset: 0,
        });
      }
      if (url === "/api/job-titles/bulk-delete" && opts?.method === "POST") return Promise.resolve({ success: true });
      if (url === "/api/job-titles/j1" && opts?.method === "DELETE") return Promise.resolve({});
      return Promise.resolve({});
    });
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;

    vm.toggleJobTitleSelection("j1", true);
    vm.toggleSelectAllJobTitlesOnPage();
    expect(vm.allJobTitlesOnPageSelected()).toBe(true);
    await vm.bulkDeleteSelectedJobTitles();

    vi.stubGlobal("confirm", vi.fn(() => true));
    await vm.removeJobTitle({ id: "j1" });

    vm.jobTitleForm = null;
    await vm.saveJobTitle();

    vm.openAddJobTitle();
    vm.jobTitleForm!.label_fr = "X";
    vm.jobTitleForm!.label_en = "Y";
    await vm.saveJobTitle();
    await flushPromises();
    expect(vm.jobTitleSaveError).toBe("dup");
    const jtPosts = fetchMock.mock.calls.filter(
      (c) => c[0] === "/api/job-titles" && (c[1] as { method?: string })?.method === "POST"
    );
    expect(jtPosts.length).toBeGreaterThan(0);
  });

  it("watch recherche / pagination (debounce) et onglet compte", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/auth/admin/credentials") return Promise.resolve({ email: "a@z.com", storedInDatabase: true });
      return Promise.resolve({});
    });
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;
    const deptCalls0 = fetchMock.mock.calls.filter((c) => c[0] === "/api/departments").length;

    vm.searchDepartments = "q";
    await vi.advanceTimersByTimeAsync(400);
    expect(fetchMock.mock.calls.filter((c) => c[0] === "/api/departments").length).toBeGreaterThan(deptCalls0);

    vm.searchJobTitles = "z";
    await vi.advanceTimersByTimeAsync(400);

    vm.pageCards = 2;
    await flushPromises();
    expect(vm.selectedCardIds).toEqual([]);

    vm.activeTab = "account";
    await flushPromises();
    expect(vm.adminCredEmail).toBe("a@z.com");

    vi.useRealTimers();
  });

  it("loadAdminCredentials en erreur et saveAdminCredentials (validations + succès + erreur PUT)", async () => {
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;

    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/auth/admin/credentials" && !opts?.method) return Promise.reject({ data: { error: "no" } });
      return Promise.resolve({});
    });
    await vm.loadAdminCredentials();
    expect(vm.adminCredError).toBe("no");

    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/auth/admin/credentials") {
        if (opts?.method === "PUT") return Promise.resolve({});
        return Promise.resolve({ email: "adm@x.com", storedInDatabase: true });
      }
      return Promise.resolve({});
    });
    vm.adminCredCurrentPassword = "";
    await vm.saveAdminCredentials();
    expect(vm.adminCredError).toContain("admin.accountCurrentPassword");

    vm.adminCredCurrentPassword = "cur";
    vm.adminCredEmail = "adm@x.com";
    vm.adminCredNewEmail = "adm@x.com";
    vm.adminCredNewPassword = "";
    await vm.saveAdminCredentials();
    expect(vm.adminCredError).toBe("admin.accountNothingToChange");

    vm.adminCredNewPassword = "newsecret";
    await vm.saveAdminCredentials();
    expect(vm.adminCredMessage).toBe("admin.accountSaved");

    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/auth/admin/credentials" && opts?.method === "PUT") {
        return Promise.reject({ data: { error: "bad pwd" } });
      }
      if (url === "/api/auth/admin/credentials") {
        return Promise.resolve({ email: "adm@x.com", storedInDatabase: true });
      }
      return Promise.resolve({});
    });
    vm.adminCredCurrentPassword = "cur";
    vm.adminCredNewPassword = "x";
    await vm.saveAdminCredentials();
    expect(vm.adminCredError).toBe("bad pwd");
  });

  it("removeCard sans id ne fait pas de requête", async () => {
    const wrapper = mountPage();
    await flushPromises();
    const vm = wrapper.vm as AdminVm;
    const before = fetchMock.mock.calls.length;
    await vm.removeCard({ id: null, first_name: "A" });
    expect(fetchMock.mock.calls.length).toBe(before);
  });
});
