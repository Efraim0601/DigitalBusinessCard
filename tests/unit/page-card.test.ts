import { ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CardPage from "../../app/pages/card.vue";

const fetchMock = vi.fn();
let routeQuery: Record<string, unknown> = {};

describe("app/pages/card.vue", () => {
  function mountInSuspense() {
    return mount(
      {
        components: { CardPage },
        template: "<Suspense><CardPage /></Suspense>",
      },
      {
        global: {
          stubs: {
            NuxtPwaManifest: true,
            TheViewComponent: { template: "<div data-test='view'>view</div>" },
          },
        },
      }
    );
  }

  beforeEach(() => {
    fetchMock.mockReset();
    routeQuery = {};
    Object.assign(globalThis, {
      useRoute: () => ({ query: routeQuery }),
      useAppLocale: () => ({ t: (k: string) => k }),
      useAppConfig: () => ({ ui: { colors: { primary: "red" } } }),
      $fetch: fetchMock,
      useAsyncData: async (_key: string, handler: () => Promise<unknown>) => {
        try {
          const value = await handler();
          return { data: ref(value), pending: ref(false), error: ref(null) };
        } catch (e) {
          return { data: ref(null), pending: ref(false), error: ref(e) };
        }
      },
    });
  });

  it("shows missing email message", async () => {
    const wrapper = mountInSuspense();
    await flushPromises();
    await flushPromises();
    expect(wrapper.html()).toContain("card.emailRequired");
    expect(wrapper.find("[data-testid=\"card-email-required\"]").exists()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("traite email dupliqué en query (tableau) comme le premier", async () => {
    routeQuery = { email: ["first@x.com", "second@x.com"] };
    fetchMock.mockResolvedValue({
      email: "first@x.com",
      first_name: "A",
      last_name: "B",
      company: null,
      title: null,
      phone: null,
      fax: null,
      mobile: null,
      department: null,
      job_title: null,
    });
    const wrapper = mountInSuspense();
    await flushPromises();
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledWith("/api/cards", { query: { email: "first@x.com" } });
    expect(wrapper.html()).toContain("data-test=\"view\"");
  });

  it("maps fetched card and renders view component", async () => {
    routeQuery = { email: " person@example.com " };
    fetchMock.mockResolvedValue({
      email: "person@example.com",
      first_name: "Jane",
      last_name: "Doe",
      company: "AFB",
      title: "Analyst",
      phone: "1",
      fax: "2",
      mobile: "3",
      department: null,
      job_title: null,
    });

    const wrapper = mountInSuspense();
    await flushPromises();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/api/cards", { query: { email: "person@example.com" } });
    expect(wrapper.html()).toContain("data-test=\"view\"");
  });

  it("converts 404 into translated not-found error", async () => {
    routeQuery = { email: "x@example.com" };
    fetchMock.mockRejectedValue({ statusCode: 404 });

    const wrapper = mountInSuspense();
    await flushPromises();
    await flushPromises();

    expect(wrapper.html()).toContain("card.notFound");
  });
});
