import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { reactive, ref } from "vue";

const UInputStub = {
  props: ["modelValue", "type", "placeholder", "name", "readonly"],
  emits: ["update:modelValue", "change"],
  template:
    "<input :value=\"modelValue\" :type=\"type || 'text'\" :placeholder=\"placeholder\" :name=\"name\" @input=\"$emit('update:modelValue', $event.target.value)\" @change=\"$emit('change')\" />",
};

const UButtonStub = {
  props: ["label", "type", "loading", "variant", "size", "color", "disabled"],
  emits: ["click"],
  template: "<button :type=\"type || 'button'\" :disabled=\"disabled\" @click=\"$emit('click', $event)\"><slot />{{ label }}</button>",
};

describe("app/pages/index.vue", () => {
  it("redirige vers /card si mot de passe vide", async () => {
    const push = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("useRouter", () => ({ push }));
    vi.stubGlobal("$fetch", fetchMock);
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k }));
    const mod = await import("../../app/pages/index.vue");
    const w = mount(mod.default, {
      global: {
        stubs: {
          NuxtPwaManifest: true,
          UIcon: true,
          UFormField: { template: "<div><slot /></div>" },
          UInput: UInputStub,
          UButton: UButtonStub,
        },
      },
    });
    const inputs = w.findAll("input");
    await inputs[0]?.setValue(" user@bank.com ");
    await w.find("form").trigger("submit");
    expect(push).toHaveBeenCalledWith({ path: "/card", query: { email: "user@bank.com" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("app/pages/card.vue", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("affiche le composant de vue quand la carte est trouvee", async () => {
    const route = reactive({ path: "/card", query: { email: "a@b.com" } });
    vi.stubGlobal("useRoute", () => route);
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k }));
    vi.stubGlobal("useAppConfig", () => ({ ui: { colors: { primary: "red" } } }));
    vi.stubGlobal("$fetch", vi.fn().mockResolvedValue({ email: "a@b.com" }));
    vi.stubGlobal("useAsyncData", async (_k: string, loader: () => Promise<unknown>) => {
      const data = ref<unknown>(null);
      const error = ref<Error | null>(null);
      try {
        data.value = await loader();
      } catch (e) {
        error.value = e as Error;
      }
      return { data, pending: ref(false), error };
    });
    const mod = await import("../../app/pages/card.vue");
    const w = mount({
      components: { CardPage: mod.default },
      template: "<Suspense><CardPage /></Suspense>",
    }, {
      global: {
        stubs: {
          NuxtPwaManifest: true,
          TheViewComponent: { template: "<div data-view />" },
        },
      },
    });
    await flushPromises();
    await flushPromises();
    expect(w.html()).toContain("data-view");
  });
});

describe("app/pages/admin/cards.vue", () => {
  function mountAdminPage(fetchMock: ReturnType<typeof vi.fn>, locale = ref<"fr" | "en">("fr")) {
    vi.stubGlobal("definePageMeta", vi.fn());
    vi.stubGlobal("$fetch", fetchMock);
    vi.stubGlobal("navigateTo", vi.fn());
    vi.stubGlobal("confirm", () => true);
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale }));
    return import("../../app/pages/admin/cards.vue").then((mod) =>
      mount(mod.default, {
        global: {
          stubs: {
            ButtonsTheLocaleToggle: true,
            ButtonsTheColorModeButton: true,
            ButtonsTheColorSelector: true,
            UButton: UButtonStub,
            UInput: UInputStub,
            UFormField: { template: "<div><slot /></div>" },
          },
        },
      })
    );
  }

  it("charge les listes au montage", async () => {
    const locale = ref<"fr" | "en">("fr");
    const fetchMock = vi.fn((url: string) => {
      if (url.startsWith("/api/cards")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url.startsWith("/api/departments")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url.startsWith("/api/job-titles")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    const w = await mountAdminPage(fetchMock, locale);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledWith("/api/cards", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/departments", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/job-titles", expect.any(Object));
    expect(w.text()).toContain("admin.title");
  });

  it("affiche admin.loadError si loadCards echoue", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.startsWith("/api/cards")) return Promise.reject(new Error("db"));
      if (url.startsWith("/api/departments")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url.startsWith("/api/job-titles")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    const w = await mountAdminPage(fetchMock);
    await flushPromises();
    expect(w.text()).toContain("admin.loadError");
  });

  it("journalise les erreurs departments/job-titles dans leur catch", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn((url: string) => {
      if (url.startsWith("/api/cards")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url.startsWith("/api/departments")) return Promise.reject(new Error("dep fail"));
      if (url.startsWith("/api/job-titles")) return Promise.reject(new Error("job fail"));
      return Promise.resolve({});
    });
    await mountAdminPage(fetchMock);
    await flushPromises();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("startCreate ouvre le formulaire avec valeurs fixes", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.startsWith("/api/cards")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url.startsWith("/api/departments")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url.startsWith("/api/job-titles")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    const w = await mountAdminPage(fetchMock);
    await flushPromises();
    const createBtn = w.findAll("button").find((b) => b.text().includes("admin.createCard"));
    await createBtn?.trigger("click");
    await flushPromises();
    expect(w.text()).toContain("admin.createCardForm");
    expect(w.html()).toContain("222 233 068");
    expect(w.html()).toContain("222 221 785");
  });

  it("startEdit formatte mobile et applique les fallback company/title", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.startsWith("/api/cards")) {
        return Promise.resolve({
          items: [
            {
              id: "c1",
              email: "a@b.com",
              first_name: "A",
              last_name: "B",
              company: null,
              title: null,
              mobile: "69011-12aa22",
              department_id: null,
              job_title_id: null,
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
        });
      }
      if (url.startsWith("/api/departments")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url.startsWith("/api/job-titles")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    const w = await mountAdminPage(fetchMock);
    await flushPromises();
    const row = w.find("tbody tr");
    await row.trigger("click");
    await flushPromises();
    expect(w.html()).toContain("690 111 222");
    expect(w.html()).toContain("222 233 068");
    expect(w.html()).toContain("222 221 785");
  });

  it("debounce recherche cartes relance loadCards avec q", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((url: string, opts?: { query?: Record<string, unknown> }) => {
      if (url.startsWith("/api/cards")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0, ...opts });
      if (url.startsWith("/api/departments")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      if (url.startsWith("/api/job-titles")) return Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 });
      return Promise.resolve({});
    });
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    const w = await mountAdminPage(fetchMock);
    await flushPromises();
    const searchInput = w.find("input[placeholder='admin.searchCards']");
    await searchInput.setValue("a");
    await searchInput.setValue("ab");
    vi.advanceTimersByTime(350);
    await flushPromises();
    const cardsCalls = fetchMock.mock.calls.filter((c) => String(c[0]).startsWith("/api/cards"));
    const lastCardsCall = cardsCalls.at(-1);
    expect(lastCardsCall?.[1]).toMatchObject({ query: expect.objectContaining({ q: "ab" }) });
    expect(clearSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
