import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { reactive, ref } from "vue";

vi.mock("#imports", () => ({
  useClipboard: () => ({ copy: vi.fn() }),
}));

vi.mock("vcard-creator", () => {
  class MockVCard {
    addName() {
      return this;
    }
    addCompany() {
      return this;
    }
    addJobtitle() {
      return this;
    }
    addEmail() {
      return this;
    }
    addPhoneNumber() {
      return this;
    }
    toString() {
      return "BEGIN:VCARD\nEND:VCARD";
    }
  }
  return { default: MockVCard };
});

const UButtonStub = {
  props: ["label", "type", "loading", "variant", "size", "color", "disabled"],
  emits: ["click"],
  template: "<button :type=\"type || 'button'\" :disabled=\"disabled\" @click=\"$emit('click', $event)\"><slot />{{ label }}</button>",
};

describe("app/components/TheCreateComponent.vue", () => {
  it("hydrate depuis la query et construit le lien owner", async () => {
    const appConfig = reactive({ ui: { colors: { primary: "red" } } });
    const route = reactive({ query: { fName: "Jean", lName: "Dupont", email: "j@a.com", color: "blue" } });
    vi.stubGlobal("useAppConfig", () => appConfig);
    vi.stubGlobal("useRoute", () => route);
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k }));
    vi.stubGlobal("location", { origin: "https://vcard.test", pathname: "/create" } as Location);
    const mod = await import("../../app/components/TheCreateComponent.vue");
    const w = mount(mod.default, {
      global: {
        stubs: {
          QRCode: true,
          UForm: { template: "<form><slot /></form>" },
          UFormField: { template: "<div><slot /></div>" },
          UInput: {
            props: ["modelValue"],
            emits: ["update:modelValue", "change"],
            template: "<input :value=\"modelValue\" @input=\"$emit('update:modelValue', $event.target.value)\" @change=\"$emit('change')\" />",
          },
          UButton: UButtonStub,
        },
      },
    });
    await w.vm.$nextTick();
    expect(w.html()).toContain("owner=1");
  });
});

describe("app/components/TheViewComponent.vue", () => {
  it("monte avec une carte et rend les actions", async () => {
    vi.stubGlobal("useAppConfig", () => ({
      ui: { colors: { primary: "red" } },
      company: { website: "www.afrilandfirstbank.com", cardBackground: "" },
    }));
    vi.stubGlobal("useRoute", () => ({ path: "/card", query: { email: "a@b.com", owner: "1" } }));
    vi.stubGlobal("useHead", vi.fn());
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("fr") }));
    const mod = await import("../../app/components/TheViewComponent.vue");
    const w = mount(mod.default, {
      props: {
        isCreator: true,
        urlCard: {
          color: "red",
          fName: "Jean",
          lName: "Dupont",
          email: "jean@bank.com",
          phone: "222 233 068",
          fax: "222 221 785",
          mobile: "690000000",
          co: "DSI",
          title: "Ingénieur",
        },
      },
      global: {
        stubs: {
          QRCode: true,
          UIcon: true,
          UButton: UButtonStub,
          UPopover: { template: "<div><slot /><slot name=\"content\" /></div>" },
          NuxtLink: { template: "<a><slot /></a>" },
        },
      },
    });
    expect(w.text()).toContain("Jean Dupont");
    expect(w.html()).toContain("card-cta-icon");
  });
});

describe("app/components/QRCode.vue", () => {
  it("expose les actions et genere une vcard", async () => {
    const mod = await import("../../app/components/QRCode.vue");
    const w = mount(mod.default, {
      props: {
        url: "https://vcard.test/card?email=a@b.com",
        card: {
          fName: "Jean",
          lName: "Dupont",
          email: "jean@bank.com",
          phone: "222 233 068",
          fax: "222 221 785",
          mobile: "690000000",
          co: "DSI",
          title: "Ingénieur",
        },
      },
      global: {
        stubs: {
          Qrcode: { template: "<svg id=\"QRcode\"></svg>" },
        },
      },
    });
    const vm = w.vm as unknown as { downloadVCard: () => Promise<void> };
    await expect(vm.downloadVCard()).resolves.toBeUndefined();
  });
});
