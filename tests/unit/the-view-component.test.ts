import { shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Card } from "../../types/card";
import TheViewComponent from "../../app/components/TheViewComponent.vue";

const baseCard: Card = {
  color: "red",
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  phone: "111",
  fax: "",
  mobile: "222",
  co: "Operations",
  title: "Analyst",
};

describe("app/components/TheViewComponent.vue", () => {
  beforeEach(() => {
    Object.assign(globalThis, {
      useAppLocale: () => ({ t: (k: string) => k, locale: { value: "fr" } }),
      useAppConfig: () => ({ ui: { colors: { primary: "red" } }, company: { website: "afrilandfirstbank.com" } }),
      useRoute: () => ({ path: "/card", query: { email: "jane@example.com" } }),
      useHead: vi.fn(),
    });
    vi.stubGlobal("location", {
      origin: "https://cardyo.local",
      pathname: "/card",
      href: "https://cardyo.local/card?email=jane@example.com",
    });
  });

  it("renders employee contact links and website with protocol", () => {
    const wrapper = shallowMount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: false },
      global: {
        stubs: {
          QRCode: true,
          UPopover: true,
          UButton: true,
          UIcon: true,
          NuxtLink: { props: ["to"], template: "<a :href='to'><slot /></a>" },
        },
      },
    });
    expect(wrapper.text()).toContain("Jane Doe");
    expect(wrapper.find('a[href="https://afrilandfirstbank.com"]').exists()).toBe(true);
    expect(wrapper.find('a[href="mailto:jane@example.com"]').exists()).toBe(true);
  });

  it("shows edit action for creator and builds edit URL", () => {
    const wrapper = shallowMount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: {
        stubs: {
          QRCode: true,
          UPopover: true,
          UButton: true,
          UIcon: true,
          NuxtLink: { props: ["to"], template: "<a data-test='nuxt-link' :href='to'><slot /></a>" },
        },
      },
    });
    expect(wrapper.html()).toContain("type=create");
    expect(wrapper.html()).toContain("email=jane%40example.com");
  });
});
