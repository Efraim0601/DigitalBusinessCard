import { shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { reactive } from "vue";
import TheColorModeButton from "../../app/components/buttons/TheColorModeButton.vue";

describe("app/components/buttons/TheColorModeButton.vue", () => {
  const colorMode = reactive({ value: "dark", preference: "dark", forced: false });

  beforeEach(() => {
    colorMode.value = "dark";
    colorMode.preference = "dark";
    colorMode.forced = false;
    Object.assign(globalThis, {
      useColorMode: () => colorMode,
    });
  });

  it("toggles dark/light preference on click", async () => {
    const wrapper = shallowMount(TheColorModeButton, {
      global: {
        stubs: {
          ClientOnly: { template: "<div><slot /></div>" },
          UButton: { template: "<button @click=\"$emit('click')\"><slot /></button>" },
        },
      },
    });
    await wrapper.find("button").trigger("click");
    expect(colorMode.preference).toBe("light");
  });

  it("hides button when color mode is forced", () => {
    colorMode.forced = true;
    const wrapper = shallowMount(TheColorModeButton, {
      global: {
        stubs: {
          ClientOnly: { template: "<div><slot /></div>" },
          UButton: { template: "<button><slot /></button>" },
        },
      },
    });
    expect(wrapper.find("button").exists()).toBe(false);
  });
});
