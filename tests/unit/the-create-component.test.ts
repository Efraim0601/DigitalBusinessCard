import { shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TheCreateComponent from "../../app/components/TheCreateComponent.vue";
import type { Card } from "../../types/card";

describe("app/components/TheCreateComponent.vue", () => {
  type CreateVm = {
    newCard: Card;
    formatEmail: () => void;
    url: string;
  };

  const appConfig = { ui: { colors: { primary: "red" } } };
  const route = {
    query: {
      fName: " Jane ",
      lName: " Doe ",
      email: " jane@example.com ",
      color: "blue",
    },
  };

  beforeEach(() => {
    Object.assign(globalThis, {
      useAppConfig: () => appConfig,
      useAppLocale: () => ({ t: (k: string) => k }),
      useRoute: () => route,
    });
    vi.stubGlobal("location", { origin: "https://cardyo.local", pathname: "/create" });
  });

  it("hydrates card from query and syncs color back to config", async () => {
    const wrapper = shallowMount(TheCreateComponent, {
      global: { stubs: ["QRCode", "UForm", "UFormField", "UInput", "UButton"] },
    });
    await Promise.resolve();
    const vm = wrapper.vm as unknown as CreateVm;
    expect(vm.newCard.fName).toBe(" Jane ");
    expect(vm.newCard.color).toBe("blue");
    expect(appConfig.ui.colors.primary).toBe("blue");
  });

  it("formats email and builds view URL query", async () => {
    const wrapper = shallowMount(TheCreateComponent, {
      global: { stubs: ["QRCode", "UForm", "UFormField", "UInput", "UButton"] },
    });
    const vm = wrapper.vm as unknown as CreateVm;
    vm.newCard.email = " jane @example.com ";
    vm.formatEmail();
    expect(vm.newCard.email).toBe("jane@example.com");
    expect(vm.url).toContain("type=view");
    expect(vm.url).toContain("email=jane%40example.com");
  });
});
