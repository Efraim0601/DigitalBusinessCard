import { mount, shallowMount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import IndexPage from "../../app/pages/index.vue";

const push = vi.fn();
const fetchMock = vi.fn();
type IndexVm = {
  email: string;
  password: string;
  error: string | null;
  showAdminPassword: boolean;
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

  it("montre le bloc mot de passe admin dans le template après l’indice serveur", async () => {
    fetchMock.mockResolvedValue({ isAdminEmail: true, hasCard: false });
    const wrapper = mount(IndexPage, {
      attachTo: document.body,
      global: {
        stubs: {
          NuxtPwaManifest: true,
          UIcon: true,
          UFormField: {
            props: ["label"],
            template: "<div class=\"ff\"><span class=\"lbl\">{{ label }}</span><slot /></div>",
          },
          UInput: {
            props: ["modelValue", "type"],
            emits: ["update:modelValue"],
            template:
              "<input class=\"uinp\" :type=\"type || 'text'\" :value=\"modelValue\" @input=\"$emit('update:modelValue', $event.target.value)\" />",
          },
          UButton: { template: "<button type=\"submit\"><slot /></button>" },
        },
      },
    });
    const vm = wrapper.vm as unknown as IndexVm;
    vm.email = "admin@example.com";
    await vm.go();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("login.adminSecretLabel");
    expect(wrapper.text()).toContain("login.adminSecretHint");
    wrapper.unmount();
  });

  it("admin sans mot de passe : affiche l’erreur et showAdminPassword", async () => {
    fetchMock.mockResolvedValue({ isAdminEmail: true, hasCard: false });
    const wrapper = shallowMount(IndexPage, {
      global: { stubs: ["NuxtPwaManifest", "UFormField", "UInput", "UButton", "UIcon"] },
    });
    const vm = wrapper.vm as unknown as IndexVm;
    vm.email = "admin@example.com";
    vm.password = "";

    await vm.go();

    expect(vm.showAdminPassword).toBe(true);
    expect(vm.error).toBe("login.adminPasswordRequired");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login-hint", {
      query: { email: "admin@example.com" },
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates to card page when password is empty", async () => {
    fetchMock.mockResolvedValue({ isAdminEmail: false, hasCard: true });
    const wrapper = shallowMount(IndexPage, {
      global: { stubs: ["NuxtPwaManifest", "UFormField", "UInput", "UButton", "UIcon"] },
    });
    const vm = wrapper.vm as unknown as IndexVm;
    vm.email = "  user@example.com ";
    vm.password = " ";

    await vm.go();

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login-hint", {
      query: { email: "user@example.com" },
    });
    expect(push).toHaveBeenCalledWith({
      path: "/card",
      query: { email: "user@example.com" },
    });
  });

  it("authenticates admin and redirects", async () => {
    fetchMock
      .mockResolvedValueOnce({ isAdminEmail: true, hasCard: false })
      .mockResolvedValueOnce({ success: true });
    const wrapper = shallowMount(IndexPage, {
      global: { stubs: ["NuxtPwaManifest", "UFormField", "UInput", "UButton", "UIcon"] },
    });
    const vm = wrapper.vm as unknown as IndexVm;
    vm.email = "admin@example.com";
    vm.password = "secret";

    await vm.go();

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/login-hint", {
      query: { email: "admin@example.com" },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/auth/admin/login", {
      method: "POST",
      body: { email: "admin@example.com", password: "secret" },
    });
    expect(vm.password).toBe("");
    expect(push).toHaveBeenCalledWith("/admin/cards");
  });

  it("shows auth error when login fails", async () => {
    fetchMock
      .mockResolvedValueOnce({ isAdminEmail: true, hasCard: false })
      .mockRejectedValueOnce({ data: { error: "bad creds" } });
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
