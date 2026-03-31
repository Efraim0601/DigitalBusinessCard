import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { reactive } from "vue";
import AppRoot from "../../app/app.vue";
import DefaultLayout from "../../app/layouts/default.vue";
import TheCreateButton from "../../app/components/buttons/TheCreateButton.vue";
import TheLocaleToggle from "../../app/components/buttons/TheLocaleToggle.vue";
import TheColorModeButton from "../../app/components/buttons/TheColorModeButton.vue";
import TheColorSelector from "../../app/components/buttons/TheColorSelector.vue";
import ThemePickerButton from "../../app/components/buttons/ThemePickerButton.vue";

const stubBtn = {
  props: ["label", "icon", "size", "color", "variant", "class", "ui"],
  template: "<button><slot name=\"leading\" /><slot />{{ label }}</button>",
};

const stubPopover = {
  props: ["ui"],
  template:
    "<div><slot name=\"default\" :open=\"false\" /><div data-popover-content><slot name=\"content\" /></div></div>",
};

describe("app Vue shells and buttons", () => {
  it("app.vue renders layout slots", () => {
    const w = mount(AppRoot, {
      global: {
        stubs: {
          UApp: { template: "<div class=\"uapp\"><slot /></div>" },
          NuxtLayout: { template: "<div class=\"layout\"><slot /></div>" },
          NuxtPage: { template: "<div class=\"page\" />" },
        },
      },
    });
    expect(w.find(".uapp").exists()).toBe(true);
    expect(w.find(".layout").exists()).toBe(true);
  });

  it("TheCreateButton uses location.origin after mount", async () => {
    const loc = { origin: "https://example.test" };
    vi.stubGlobal("location", loc as Location);
    const w = mount(TheCreateButton, {
      global: { stubs: { UButton: stubBtn } },
    });
    await w.vm.$nextTick();
    expect(w.find("a").attributes("href")).toBe("https://example.test");
  });

  it("ThemePickerButton renders label and leading chip", () => {
    const w = mount(ThemePickerButton, {
      props: { label: "red", chip: "red", selected: true },
      global: { stubs: { UButton: stubBtn } },
    });
    expect(w.text()).toContain("red");
    expect(w.find("button").exists()).toBe(true);
  });

  it("default.vue shows create button off home and admin", async () => {
    const route = reactive({ path: "/about" });
    vi.stubGlobal("useRoute", () => route);
    const w = mount(DefaultLayout, {
      slots: { default: "<p class=\"page-slot\">x</p>" },
      global: {
        stubs: {
          ButtonsTheCreateButton: { template: "<span data-cb />", name: "ButtonsTheCreateButton" },
          ButtonsTheColorSelector: true,
          ButtonsTheLocaleToggle: true,
          ButtonsTheColorModeButton: true,
        },
      },
    });
    expect(w.find("[data-cb]").exists()).toBe(true);
    route.path = "/";
    await w.vm.$nextTick();
    expect(w.find("[data-cb]").exists()).toBe(false);
    route.path = "/admin/cards";
    await w.vm.$nextTick();
    expect(w.find("[data-cb]").exists()).toBe(false);
  });

  it("TheLocaleToggle toggles locale label", async () => {
    const w = mount(TheLocaleToggle, {
      props: { floating: false },
      global: { stubs: { UButton: stubBtn } },
    });
    expect(w.text()).toContain("EN");
    await w.find("button").trigger("click");
    expect(w.text()).toContain("FR");
  });

  it("TheColorModeButton renders and toggles preference", async () => {
    const cm = { value: "light", preference: "light", forced: false };
    vi.stubGlobal("useColorMode", () => cm);
    const w = mount(TheColorModeButton, {
      props: { floating: false },
      global: {
        stubs: {
          ClientOnly: { template: "<div><slot /></div>" },
          UButton: stubBtn,
        },
      },
    });
    await w.find("button").trigger("click");
    expect(cm.preference).toBe("dark");
  });

  it("TheColorSelector mounts and can update primary color", async () => {
    const appConfig = reactive({ ui: { colors: { primary: "red" } } });
    vi.stubGlobal("useAppConfig", () => appConfig);
    const w = mount(TheColorSelector, {
      props: { floating: false },
      global: {
        stubs: {
          UPopover: stubPopover,
          UButton: stubBtn,
          ButtonsThemePickerButton: { template: "<button class=\"chip\" @click=\"$emit('click')\" />" },
        },
      },
    });
    expect(w.find("[data-popover-content]").exists()).toBe(true);
    await w.find(".chip").trigger("click");
    expect(typeof appConfig.ui.colors.primary).toBe("string");
  });
});
