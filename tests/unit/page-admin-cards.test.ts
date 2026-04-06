import { shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCardsPage from "../../app/pages/admin/cards.vue";

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
  exportScopedCsv: (scope: "cards" | "departments" | "job_titles") => Promise<void>;
  onScopedImportFileChange: (ev: Event, scope: "cards" | "departments" | "job_titles") => Promise<void>;
  cardsTransferMessage: string | null;
  cardsTransferError: string | null;
  cardsTransferWarnings: string[];
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
      global: { stubs: ["ButtonsTheLocaleToggle", "ButtonsTheColorModeButton", "ButtonsTheColorSelector", "UButton", "UInput", "UFormField"] },
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
      global: { stubs: ["ButtonsTheLocaleToggle", "ButtonsTheColorModeButton", "ButtonsTheColorSelector", "UButton", "UInput", "UFormField"] },
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
      global: { stubs: ["ButtonsTheLocaleToggle", "ButtonsTheColorModeButton", "ButtonsTheColorSelector", "UButton", "UInput", "UFormField"] },
    });
    const vm = wrapper.vm as unknown as AdminCardsVm;
    expect(vm.cardDepartmentLabel({ department: { label_fr: "Direction", label_en: "Management" } })).toBe("Management");
    expect(vm.cardTitleLabel({ job_title: { label_fr: "Directeur", label_en: "Director" } })).toBe("Director");
  });
});
