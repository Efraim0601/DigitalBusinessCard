import { shallowMount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ThemePickerButton from "../../app/components/buttons/ThemePickerButton.vue";

describe("app/components/buttons/ThemePickerButton.vue", () => {
  const buttonStub = {
    props: ["label"],
    template:
      "<button><slot name='leading' /><span data-test='label'>{{ label }}</span><slot /></button>",
  };

  it("renders chip indicator by default", () => {
    const wrapper = shallowMount(ThemePickerButton, {
      props: { label: "red", chip: "red", selected: true },
      global: { stubs: { UButton: buttonStub } },
    });
    expect(wrapper.find("[data-test='label']").text()).toContain("red");
    expect(wrapper.html()).toContain("bg-(--color-light)");
  });

  it("renders custom leading slot when provided", () => {
    const wrapper = shallowMount(ThemePickerButton, {
      props: { label: "blue", chip: "blue" },
      slots: { leading: "<span data-test='custom-leading'>x</span>" },
      global: { stubs: { UButton: buttonStub } },
    });
    expect(wrapper.find("[data-test='custom-leading']").exists()).toBe(true);
  });
});
