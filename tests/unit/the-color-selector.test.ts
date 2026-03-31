import { shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TheColorSelector from "../../app/components/buttons/TheColorSelector.vue";
type ColorSelectorVm = { handleColorChange: (color: string) => void };

describe("app/components/buttons/TheColorSelector.vue", () => {
  const appConfig = { ui: { colors: { primary: "red" } } };
  const setItem = vi.fn();

  beforeEach(() => {
    appConfig.ui.colors.primary = "red";
    setItem.mockReset();
    Object.assign(globalThis, {
      useAppConfig: () => appConfig,
      localStorage: { setItem },
    });
  });

  it("updates primary color and persists it", () => {
    const wrapper = shallowMount(TheColorSelector, {
      global: {
        stubs: {
          UPopover: { template: "<div><slot :open='false' /><slot name='content' /></div>" },
          UButton: { template: "<button :class='$attrs.class'><slot /></button>" },
          ButtonsThemePickerButton: true,
        },
      },
    });
    const vm = wrapper.vm as unknown as ColorSelectorVm;
    vm.handleColorChange("blue");
    expect(appConfig.ui.colors.primary).toBe("blue");
    expect(setItem).toHaveBeenCalledWith("nuxt-ui-primary", "blue");
  });

  it("applies non-floating class when floating is false", () => {
    const wrapper = shallowMount(TheColorSelector, {
      props: { floating: false },
      global: {
        stubs: {
          UPopover: { template: "<div><slot :open='false' /><slot name='content' /></div>" },
          UButton: { template: "<button :class='$attrs.class'><slot /></button>" },
          ButtonsThemePickerButton: true,
        },
      },
    });
    expect(wrapper.html()).toContain("cursor-pointer");
  });
});
