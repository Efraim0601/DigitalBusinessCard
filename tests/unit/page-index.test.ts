import { shallowMount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import IndexPage from "../../app/pages/index.vue";

const push = vi.fn();
const fetchMock = vi.fn();
type IndexVm = {
  email: string;
  password: string;
  error: string | null;
  go: () => Promise<void>;
};

describe("app/pages/index.vue", () => {
  beforeEach(() => {
    push.mockReset();
    fetchMock.mockReset();
    Object.assign(globalThis, {
      useRouter: () => ({ push }),
      useAppLocale: () => ({ t: (k: string) => k }),
      $fetch: fetchMock,
    });
  });

  it("affiche Email requis si email vide et ne navigue pas", async () => {
    const wrapper = shallowMount(IndexPage, {
      global: { stubs: ["NuxtPwaManifest", "UFormField", "UInput", "UButton", "UIcon"] },
    });
    const vm = wrapper.vm as unknown as IndexVm;
    vm.email = "   ";
    vm.password = "";

    await vm.go();

    expect(vm.error).toBe("card.emailRequired");
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates to card page when password is empty", async () => {
    const wrapper = shallowMount(IndexPage, {
      global: { stubs: ["NuxtPwaManifest", "UFormField", "UInput", "UButton", "UIcon"] },
    });
    const vm = wrapper.vm as unknown as IndexVm;
    vm.email = "  user@example.com ";
    vm.password = " ";

    await vm.go();

    expect(push).toHaveBeenCalledWith({
      path: "/card",
      query: { email: "user@example.com" },
    });
  });

  it("authenticates admin and redirects", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const wrapper = shallowMount(IndexPage, {
      global: { stubs: ["NuxtPwaManifest", "UFormField", "UInput", "UButton", "UIcon"] },
    });
    const vm = wrapper.vm as unknown as IndexVm;
    vm.email = "admin@example.com";
    vm.password = "secret";

    await vm.go();

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/admin/login", {
      method: "POST",
      body: { email: "admin@example.com", password: "secret" },
    });
    expect(vm.password).toBe("");
    expect(push).toHaveBeenCalledWith("/admin/cards");
  });

  it("shows auth error when login fails", async () => {
    fetchMock.mockRejectedValue({ data: { error: "bad creds" } });
    const wrapper = shallowMount(IndexPage, {
      global: { stubs: ["NuxtPwaManifest", "UFormField", "UInput", "UButton", "UIcon"] },
    });
    const vm = wrapper.vm as unknown as IndexVm;
    vm.email = "admin@example.com";
    vm.password = "wrong";

    await vm.go();

    expect(vm.error).toBe("bad creds");
    expect(push).not.toHaveBeenCalledWith("/admin/cards");
  });
});
