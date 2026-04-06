import { flushPromises, shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCardsPage from "../../app/pages/admin/cards.vue";

const fetchMock = vi.fn();
const navigateToMock = vi.fn();

const STUBS = [
  "ButtonsTheLocaleToggle",
  "ButtonsTheColorModeButton",
  "ButtonsTheColorSelector",
  "UButton",
  "UInput",
  "UFormField",
] as const;

function emptyPaged<T = unknown>(items: T[] = []) {
  return { items, total: items.length, limit: 20, offset: 0 };
}

function defaultFetchImpl(url: string, options?: { method?: string }) {
  if (url === "/api/cards") return Promise.resolve(emptyPaged());
  if (url === "/api/departments") return Promise.resolve(emptyPaged());
  if (url === "/api/job-titles") return Promise.resolve(emptyPaged());
  return Promise.resolve({});
}

type AdminCardsVm = {
  logoutAdmin: () => Promise<void>;
  authError: string | null;
  loadCards: () => Promise<void>;
  loadDepartments: () => Promise<void>;
  loadJobTitles: () => Promise<void>;
  startCreate: () => void;
  startEdit: (card: Record<string, unknown>) => void;
  saveCard: () => Promise<void>;
  removeCard: (card: Record<string, unknown>) => Promise<void>;
  removeDepartment: (d: { id: string }) => Promise<void>;
  removeJobTitle: (j: { id: string }) => Promise<void>;
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
  cards: { items: { id: string }[]; total: number; limit: number; offset: number };
  departments: { items: { id: string; label_fr: string; label_en: string }[]; total: number; limit: number; offset: number };
  jobTitles: { items: { id: string; label_fr: string; label_en: string }[]; total: number; limit: number; offset: number };
  selectedCardIds: string[];
  selectedDepartmentIds: string[];
  selectedJobTitleIds: string[];
  departmentSelectValue: string;
  jobTitleSelectValue: string;
  departmentOptions: { value: string; label: string }[];
  jobTitleOptions: { value: string; label: string }[];
  toggleCardSelection: (id: string, checked: boolean) => void;
  allCardsOnPageSelected: () => boolean;
  toggleSelectAllCardsOnPage: () => void;
  bulkDeleteSelectedCards: () => Promise<void>;
  toggleDepartmentSelection: (id: string, checked: boolean) => void;
  allDepartmentsOnPageSelected: () => boolean;
  toggleSelectAllDepartmentsOnPage: () => void;
  bulkDeleteSelectedDepartments: () => Promise<void>;
  toggleJobTitleSelection: (id: string, checked: boolean) => void;
  allJobTitlesOnPageSelected: () => boolean;
  toggleSelectAllJobTitlesOnPage: () => void;
  bulkDeleteSelectedJobTitles: () => Promise<void>;
  resetTransfers: (scope: "cards" | "departments" | "job_titles") => void;
  exportScopedCsv: (scope: "cards" | "departments" | "job_titles") => Promise<void>;
  onScopedImportFileChange: (ev: Event, scope: "cards" | "departments" | "job_titles") => Promise<void>;
  cardsTransferMessage: string | null;
  cardsTransferError: string | null;
  cardsTransferWarnings: string[];
  departmentsTransferMessage: string | null;
  departmentsTransferError: string | null;
  departmentsTransferWarnings: string[];
  jobTitlesTransferMessage: string | null;
  jobTitlesTransferError: string | null;
  jobTitlesTransferWarnings: string[];
  error: string | null;
};

describe("app/pages/admin/cards.vue", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    navigateToMock.mockReset();
    fetchMock.mockImplementation((url: string, options?: { method?: string }) =>
      defaultFetchImpl(url, options)
    );

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
      global: { stubs: [...STUBS] },
    });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/api/cards", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/departments", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/job-titles", expect.any(Object));
  });

  it("logs out and redirects to home", async () => {
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
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
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await vm.logoutAdmin();
    expect(vm.authError).toBe("boom");
  });

  it("creates and updates a card payload with fixed phone/fax", async () => {
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
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
      global: { stubs: [...STUBS] },
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
      global: { stubs: [...STUBS] },
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
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    vm.departmentForm = { id: null, label_fr: "DSI", label_en: "IT" };
    await vm.saveDepartment();
    expect(vm.departmentSaveError).toBe("duplicate");
  });

  it("validates and saves job titles for create and update", async () => {
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
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

  it("exportScopedCsv appelle data-export avec le bon scope", async () => {
    const ab = new ArrayBuffer(2);
    const impl = vi.fn((url: string, opts?: Record<string, unknown>) => {
      if (url === "/api/admin/data-export") return Promise.resolve(ab);
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    fetchMock.mockImplementation(impl);

    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await vm.exportScopedCsv("departments");

    expect(impl).toHaveBeenCalledWith(
      "/api/admin/data-export",
      expect.objectContaining({
        query: { scope: "departments" },
        responseType: "arrayBuffer",
      })
    );
  });

  it("onScopedImportFileChange importe avec scope et affiche les avertissements", async () => {
    const impl = vi.fn((url: string, opts?: { method?: string; query?: unknown }) => {
      if (url === "/api/admin/data-import" && opts?.method === "POST") {
        return Promise.resolve({
          success: true,
          imported: { departments: 0, job_titles: 0, cards: 2 },
          warnings: ["L1", "L2"],
        });
      }
      if (url === "/api/cards") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/departments") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url === "/api/job-titles") return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    fetchMock.mockImplementation(impl);

    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    const file = new File(["x"], "c.csv", { type: "text/csv" });
    const input = { files: [file], value: "x" };
    await vm.onScopedImportFileChange({ target: input } as unknown as Event, "cards");

    expect(impl).toHaveBeenCalledWith(
      "/api/admin/data-import",
      expect.objectContaining({
        method: "POST",
        query: { scope: "cards" },
      })
    );
    expect(vm.cardsTransferWarnings).toEqual(["L1", "L2"]);
    expect(vm.cardsTransferMessage).toBe("admin.importSuccessCards");
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
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    expect(vm.cardDepartmentLabel({ department: { label_fr: "Direction", label_en: "Management" } })).toBe("Management");
    expect(vm.cardTitleLabel({ job_title: { label_fr: "Directeur", label_en: "Director" } })).toBe("Director");
  });

  it("loadCards filtre les sélections absentes et gère absence d’items dans la réponse", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/cards")
        return Promise.resolve({
          items: [{ id: "c1" }],
          total: 1,
          limit: 20,
          offset: 0,
        });
      return defaultFetchImpl(url);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.selectedCardIds = ["c1", "ghost"];
    await vm.loadCards();
    expect(vm.selectedCardIds).toEqual(["c1"]);
    expect(vm.cards.items).toHaveLength(1);

    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/cards") return Promise.resolve({ total: 0 } as { total: number });
      return defaultFetchImpl(url);
    });
    await vm.loadCards();
    expect(vm.cards.items).toEqual([]);
  });

  it("loadCards écrit l’erreur i18n en catch", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/cards") return Promise.reject(new Error("network"));
      return defaultFetchImpl(url);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    expect(vm.error).toBe("admin.loadError");
    errSpy.mockRestore();
  });

  it("loadDepartments met à jour la liste et filtre la sélection", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/departments")
        return Promise.resolve({
          items: [
            { id: "d1", label_fr: "A", label_en: "A" },
            { id: "d2", label_fr: "B", label_en: "B" },
          ],
          total: 2,
          limit: 20,
          offset: 0,
        });
      return defaultFetchImpl(url);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.selectedDepartmentIds = ["d1", "gone"];
    await vm.loadDepartments();
    expect(vm.selectedDepartmentIds).toEqual(["d1"]);
    expect(vm.departmentOptions.some((o) => o.value === "d1")).toBe(true);
  });

  it("loadDepartments catch loggue l’erreur", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/departments") return Promise.reject(new Error("boom"));
      return defaultFetchImpl(url);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    await flushPromises();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("loadJobTitles filtre la sélection et remplit jobTitleOptions", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/job-titles")
        return Promise.resolve({
          items: [{ id: "j1", label_fr: "T1", label_en: "T1" }],
          total: 1,
          limit: 20,
          offset: 0,
        });
      return defaultFetchImpl(url);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.selectedJobTitleIds = ["j1", "x"];
    await vm.loadJobTitles();
    expect(vm.selectedJobTitleIds).toEqual(["j1"]);
    expect(vm.jobTitleOptions.some((o) => o.value === "j1")).toBe(true);
  });

  it("loadJobTitles catch loggue l’erreur", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/job-titles") return Promise.reject(new Error("boom"));
      return defaultFetchImpl(url);
    });
    shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    await flushPromises();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("departmentSelectValue / jobTitleSelectValue mettent à jour editing", async () => {
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.departments = {
      items: [{ id: "d1", label_fr: "Fin", label_en: "Fin" }],
      total: 1,
      limit: 20,
      offset: 0,
    };
    vm.jobTitles = {
      items: [{ id: "j1", label_fr: "Dev", label_en: "Dev" }],
      total: 1,
      limit: 20,
      offset: 0,
    };
    vm.startCreate();
    vm.editing!.company = "Acme";
    vm.editing!.title = "Boss";
    vm.departmentSelectValue = "d1";
    expect(vm.editing!.department_id).toBe("d1");
    expect(vm.editing!.company).toBeNull();
    vm.jobTitleSelectValue = "j1";
    expect(vm.editing!.job_title_id).toBe("j1");
    expect(vm.editing!.title).toBeNull();
    vm.departmentSelectValue = "";
    vm.jobTitleSelectValue = "";
    expect(vm.editing!.department_id).toBeNull();
    expect(vm.editing!.job_title_id).toBeNull();
  });

  it("saveCard sans editing ne fait rien", async () => {
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    const n = fetchMock.mock.calls.length;
    vm.editing = null;
    await vm.saveCard();
    expect(fetchMock.mock.calls.length).toBe(n);
  });

  it("saveJobTitle sans formulaire ne fait rien", async () => {
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    const n = fetchMock.mock.calls.length;
    vm.jobTitleForm = null;
    await vm.saveJobTitle();
    expect(fetchMock.mock.calls.length).toBe(n);
  });

  it("sélection / tout sélectionner / bulk delete cartes", async () => {
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/cards/bulk-delete" && opts?.method === "POST") return Promise.resolve({});
      return defaultFetchImpl(url, opts);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.cards = {
      items: [{ id: "a" }, { id: "b" }],
      total: 2,
      limit: 20,
      offset: 0,
    };
    vm.toggleCardSelection("a", true);
    expect(vm.selectedCardIds).toEqual(["a"]);
    vm.toggleCardSelection("a", false);
    expect(vm.selectedCardIds).toEqual([]);

    vm.toggleCardSelection("a", true);
    vm.toggleSelectAllCardsOnPage();
    expect(vm.allCardsOnPageSelected()).toBe(true);
    vm.toggleSelectAllCardsOnPage();
    expect(vm.selectedCardIds).toEqual([]);

    vm.selectedCardIds = ["a"];
    const confirmMock = vi.spyOn(globalThis, "confirm" as never).mockReturnValue(false as never);
    await vm.bulkDeleteSelectedCards();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/cards/bulk-delete",
      expect.anything()
    );
    confirmMock.mockReturnValue(true as never);
    await vm.bulkDeleteSelectedCards();
    expect(fetchMock).toHaveBeenCalledWith("/api/cards/bulk-delete", {
      method: "POST",
      body: { ids: ["a"] },
    });
    expect(vm.selectedCardIds).toEqual([]);
    confirmMock.mockRestore();
  });

  it("bulkDeleteSelectedCards sans sélection ni appel API", async () => {
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.selectedCardIds = [];
    await vm.bulkDeleteSelectedCards();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/cards/bulk-delete",
      expect.anything()
    );
  });

  it("bulkDeleteSelectedCards écrit error si $fetch échoue", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/cards/bulk-delete" && opts?.method === "POST")
        return Promise.reject(new Error("fail"));
      return defaultFetchImpl(url, opts);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.selectedCardIds = ["a"];
    await vm.bulkDeleteSelectedCards();
    expect(vm.error).toBe("admin.loadError");
    errSpy.mockRestore();
  });

  it("sélection / bulk delete directions", async () => {
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/departments/bulk-delete" && opts?.method === "POST") return Promise.resolve({});
      return defaultFetchImpl(url, opts);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.departments = {
      items: [
        { id: "d1", label_fr: "A", label_en: "A" },
        { id: "d2", label_fr: "B", label_en: "B" },
      ],
      total: 2,
      limit: 20,
      offset: 0,
    };
    vm.toggleDepartmentSelection("d1", true);
    expect(vm.selectedDepartmentIds).toEqual(["d1"]);
    vm.toggleSelectAllDepartmentsOnPage();
    expect(vm.allDepartmentsOnPageSelected()).toBe(true);
    vm.toggleSelectAllDepartmentsOnPage();
    expect(vm.selectedDepartmentIds).toEqual([]);

    vm.selectedDepartmentIds = ["d1"];
    const confirmMock = vi.spyOn(globalThis, "confirm" as never).mockReturnValue(true as never);
    await vm.bulkDeleteSelectedDepartments();
    expect(fetchMock).toHaveBeenCalledWith("/api/departments/bulk-delete", {
      method: "POST",
      body: { ids: ["d1"] },
    });
    confirmMock.mockRestore();
  });

  it("bulkDeleteSelectedDepartments annulé ou catch", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/departments/bulk-delete" && opts?.method === "POST")
        return Promise.reject(new Error("nope"));
      return defaultFetchImpl(url, opts);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.selectedDepartmentIds = ["d1"];
    const confirmMock = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal("confirm", confirmMock);
    await vm.bulkDeleteSelectedDepartments();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/departments/bulk-delete",
      expect.anything()
    );
    await vm.bulkDeleteSelectedDepartments();
    expect(errSpy).toHaveBeenCalled();
    vi.unstubAllGlobals();
    errSpy.mockRestore();
  });

  it("sélection / bulk delete titres", async () => {
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/job-titles/bulk-delete" && opts?.method === "POST") return Promise.resolve({});
      return defaultFetchImpl(url, opts);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.jobTitles = {
      items: [
        { id: "j1", label_fr: "A", label_en: "A" },
        { id: "j2", label_fr: "B", label_en: "B" },
      ],
      total: 2,
      limit: 20,
      offset: 0,
    };
    vm.toggleJobTitleSelection("j1", true);
    vm.toggleSelectAllJobTitlesOnPage();
    expect(vm.allJobTitlesOnPageSelected()).toBe(true);
    vm.toggleSelectAllJobTitlesOnPage();
    vm.selectedJobTitleIds = ["j1"];
    await vm.bulkDeleteSelectedJobTitles();
    expect(fetchMock).toHaveBeenCalledWith("/api/job-titles/bulk-delete", {
      method: "POST",
      body: { ids: ["j1"] },
    });
  });

  it("bulkDeleteSelectedJobTitles catch loggue", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/job-titles/bulk-delete" && opts?.method === "POST")
        return Promise.reject(new Error("x"));
      return defaultFetchImpl(url, opts);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.selectedJobTitleIds = ["j1"];
    await vm.bulkDeleteSelectedJobTitles();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("resetTransfers nettoie les messages par scope", async () => {
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.cardsTransferMessage = "x";
    vm.cardsTransferError = "e";
    vm.cardsTransferWarnings = ["w"];
    vm.resetTransfers("cards");
    expect(vm.cardsTransferMessage).toBeNull();
    vm.departmentsTransferMessage = "d";
    vm.departmentsTransferError = "de";
    vm.departmentsTransferWarnings = ["dw"];
    vm.resetTransfers("departments");
    expect(vm.departmentsTransferMessage).toBeNull();
    vm.jobTitlesTransferMessage = "j";
    vm.jobTitlesTransferError = "je";
    vm.jobTitlesTransferWarnings = ["jw"];
    vm.resetTransfers("job_titles");
    expect(vm.jobTitlesTransferMessage).toBeNull();
  });

  it("exportScopedCsv télécharge côté client et messages de succès par scope", async () => {
    const ab = new ArrayBuffer(1);
    fetchMock.mockImplementation((url: string, opts?: Record<string, unknown>) => {
      if (url === "/api/admin/data-export") return Promise.resolve(ab);
      return defaultFetchImpl(url, opts as { method?: string });
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();

    const click = vi.fn();
    const realCreate = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, "createElement").mockImplementation((tag: string, options?: unknown) => {
      if (String(tag).toLowerCase() === "a") {
        return { href: "", download: "", click } as unknown as HTMLAnchorElement;
      }
      return realCreate(tag as Parameters<typeof document.createElement>[0], options as never);
    });
    const urlSpyCreate = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    const urlSpyRevoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    try {
      await vm.exportScopedCsv("cards");
      expect(vm.cardsTransferMessage).toBe("admin.exportCsvSuccess");
      await vm.exportScopedCsv("departments");
      expect(vm.departmentsTransferMessage).toBe("admin.exportCsvSuccess");
      await vm.exportScopedCsv("job_titles");
      expect(vm.jobTitlesTransferMessage).toBe("admin.exportCsvSuccess");
      expect(click).toHaveBeenCalled();
      expect(urlSpyRevoke).toHaveBeenCalled();
    } finally {
      createSpy.mockRestore();
      urlSpyCreate.mockRestore();
      urlSpyRevoke.mockRestore();
    }
  });

  it("exportScopedCsv remplit les erreurs par scope", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/admin/data-export") return Promise.reject(new Error("fail"));
      return defaultFetchImpl(url);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    await vm.exportScopedCsv("cards");
    expect(vm.cardsTransferError).toBe("admin.exportError");
    await vm.exportScopedCsv("departments");
    expect(vm.departmentsTransferError).toBe("admin.exportError");
    await vm.exportScopedCsv("job_titles");
    expect(vm.jobTitlesTransferError).toBe("admin.exportError");
    errSpy.mockRestore();
  });

  it("onScopedImportFileChange sans fichier ne poste pas", async () => {
    const impl = vi.fn((url: string, options?: { method?: string }) => defaultFetchImpl(url, options));
    fetchMock.mockImplementation(impl);
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    const n = impl.mock.calls.filter((c) => c[0] === "/api/admin/data-import").length;
    const input = { files: undefined, value: "" };
    await vm.onScopedImportFileChange({ target: input } as unknown as Event, "cards");
    const after = impl.mock.calls.filter((c) => c[0] === "/api/admin/data-import").length;
    expect(after).toBe(n);
  });

  it("onScopedImportFileChange erreur avec data.error", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/admin/data-import" && opts?.method === "POST")
        return Promise.reject({ data: { error: "bad csv" } });
      return defaultFetchImpl(url, opts);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    const file = new File(["x"], "d.csv");
    await vm.onScopedImportFileChange(
      { target: { files: [file], value: "x" } } as unknown as Event,
      "departments"
    );
    expect(vm.departmentsTransferError).toBe("bad csv");
    errSpy.mockRestore();
  });

  it("removeDepartment supprime et recharge", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/departments/d1" && opts?.method === "DELETE") return Promise.resolve({});
      if (url === "/api/departments")
        return Promise.resolve({
          items: [{ id: "d2", label_fr: "B", label_en: "B" }],
          total: 1,
          limit: 20,
          offset: 0,
        });
      return defaultFetchImpl(url, opts);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.selectedDepartmentIds = ["d1", "d2"];
    vi.spyOn(globalThis, "confirm" as never).mockReturnValue(true as never);
    await vm.removeDepartment({ id: "d1" });
    expect(fetchMock).toHaveBeenCalledWith("/api/departments/d1", { method: "DELETE" });
    expect(vm.selectedDepartmentIds).toEqual(["d2"]);
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/departments/d9" && opts?.method === "DELETE")
        return Promise.reject(new Error("fail"));
      return defaultFetchImpl(url, opts);
    });
    await vm.removeDepartment({ id: "d9" });
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("removeDepartment respecte confirm", async () => {
    vi.spyOn(globalThis, "confirm" as never).mockReturnValue(false as never);
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    await vm.removeDepartment({ id: "d1" });
    expect(fetchMock).not.toHaveBeenCalledWith("/api/departments/d1", { method: "DELETE" });
  });

  it("removeJobTitle supprime après confirmation", async () => {
    fetchMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/job-titles/j1" && opts?.method === "DELETE") return Promise.resolve({});
      return defaultFetchImpl(url, opts);
    });
    const wrapper = shallowMount(AdminCardsPage, {
      global: { stubs: [...STUBS] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    await flushPromises();
    vm.selectedJobTitleIds = ["j1"];
    vi.spyOn(globalThis, "confirm" as never).mockReturnValue(true as never);
    await vm.removeJobTitle({ id: "j1" });
    expect(fetchMock).toHaveBeenCalledWith("/api/job-titles/j1", { method: "DELETE" });
    expect(vm.selectedJobTitleIds).toEqual([]);
  });
});
