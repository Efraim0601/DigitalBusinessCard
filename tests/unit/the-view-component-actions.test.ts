import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import type { Card } from "../../types/card";
import TheViewComponent from "../../app/components/TheViewComponent.vue";
import { toPng } from "html-to-image";

vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,AAA"),
}));

const baseCard: Card = {
  color: "red",
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  phone: "111",
  fax: "222",
  mobile: "333",
  co: "DSI",
  title: "Ingénieur d'étude",
};

const UPopoverStub = {
  template: "<div><slot /><slot name=\"content\" /></div>",
};

const stubs = {
  QRCode: { props: ["url", "card"], template: "<div class='qr' :data-url='url' />" },
  UPopover: UPopoverStub,
  UButton: { template: "<button><slot /></button>" },
  UIcon: true,
  NuxtLink: { props: ["to"], template: "<a :href='to'><slot /></a>" },
};

function qrExposeStub(file: File | null) {
  return defineComponent({
    name: "QRCodeExposeStub",
    setup(_, { expose }) {
      expose({
        getQRAsFile: async () => file,
        downloadVCard: vi.fn(),
      });
      return () => h("div", { class: "qr-stub" });
    },
  });
}

describe("app/components/TheViewComponent actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.stubGlobal("requestAnimationFrame", ((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    }) as typeof requestAnimationFrame);
    Object.assign(globalThis, {
      useAppConfig: () => ({
        ui: { colors: { primary: "red" } },
        company: { website: "afrilandfirstbank.com", cardBackground: "" },
      }),
      useRoute: () => ({ path: "/card", query: { email: "jane@example.com", owner: "1", employee: "1" } }),
      useHead: vi.fn(),
    });
  });

  it("partage par Web Share API quand disponible", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share } as Navigator);
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("fr") }));
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: { stubs },
    });
    const btn = wrapper.findAll("button").find((b) => b.text().includes("share.shareCardLink"));
    expect(btn).toBeTruthy();
    await btn!.trigger("click");
    await flushPromises();
    expect(share).toHaveBeenCalled();
  });

  it("copie le lien via clipboard quand navigator.share est absent", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } } as Navigator);
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("fr") }));
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: { stubs },
    });
    const btn = wrapper.findAll("button").find((b) => b.text().includes("share.shareCardLink"));
    await btn!.trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/"));
  });

  it("copie le lien employe sans owner=1", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } } as Navigator);
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("fr") }));
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: { stubs },
    });
    const btn = wrapper.findAll("button").find((b) => b.text().includes("share.copyEmployeeLink"));
    await btn!.trigger("click");
    await flushPromises();
    const copied = String(writeText.mock.calls[0]?.[0] ?? "");
    expect(copied).toContain("employee=1");
    expect(copied).not.toContain("owner=1");
  });

  it("utilise les traductions fallback en anglais pour titre/departement", () => {
    vi.stubGlobal("navigator", {} as Navigator);
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("en") }));
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: false },
      global: { stubs },
    });
    expect(wrapper.text()).toContain("Study Engineer");
    expect(wrapper.text()).toContain("IT");
  });

  it("attache et detache le listener resize", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    vi.stubGlobal("navigator", {} as Navigator);
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("fr") }));
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: false },
      global: { stubs },
    });
    wrapper.unmount();
    expect(add).toHaveBeenCalledWith("resize", expect.any(Function), { passive: true });
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("fallback prompt quand copyLink echoue", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("no clipboard"));
    const promptSpy = vi.fn();
    vi.stubGlobal("prompt", promptSpy);
    vi.stubGlobal("navigator", { clipboard: { writeText } } as Navigator);
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("fr") }));
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: { stubs },
    });
    const btn = wrapper.findAll("button").find((b) => b.text().includes("share.shareCardLink"));
    await btn!.trigger("click");
    await flushPromises();
    expect(promptSpy).toHaveBeenCalled();
  });

  it("ignore AbortError lors du partage de lien", async () => {
    const share = vi.fn().mockRejectedValue({ name: "AbortError" });
    const promptSpy = vi.fn();
    vi.stubGlobal("prompt", promptSpy);
    vi.stubGlobal("navigator", { share } as Navigator);
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("fr") }));
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: { stubs },
    });
    const btn = wrapper.findAll("button").find((b) => b.text().includes("share.shareCardLink"));
    await btn!.trigger("click");
    await flushPromises();
    expect(share).toHaveBeenCalled();
    expect(promptSpy).not.toHaveBeenCalled();
  });

  it("utilise execCommand quand clipboard API est absente", async () => {
    const execSpy = vi.fn().mockReturnValue(true);
    Object.assign(document, { execCommand: execSpy });
    vi.stubGlobal("navigator", {} as Navigator);
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("fr") }));
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: { stubs },
    });
    const btn = wrapper.findAll("button").find((b) => b.text().includes("share.shareCardLink"));
    await btn!.trigger("click");
    await flushPromises();
    expect(execSpy).toHaveBeenCalledWith("copy");
  });

  it("shareQRCode telecharge le fichier quand canShare est false", async () => {
    const file = new File(["x"], "qr.png", { type: "image/png" });
    vi.stubGlobal(
      "navigator",
      { share: vi.fn(), canShare: vi.fn().mockReturnValue(false) } as unknown as Navigator
    );
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("fr") }));
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: {
        stubs: {
          ...stubs,
          QRCode: qrExposeStub(file),
        },
      },
    });
    const btn = wrapper.findAll("button").find((b) => b.text().includes("share.shareQRCode"));
    await btn!.trigger("click");
    await flushPromises();
    expect(appendSpy).toHaveBeenCalled();
  });

  it("shareCardImage passe par toPng et fallback download", async () => {
    class ImgOk {
      crossOrigin = "";
      complete = false;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal("Image", ImgOk as unknown as typeof Image);
    vi.stubGlobal(
      "navigator",
      { share: vi.fn(), canShare: vi.fn().mockReturnValue(false) } as unknown as Navigator
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ blob: async () => new Blob(["x"], { type: "image/png" }) }) as unknown as typeof fetch);
    vi.stubGlobal("useAppConfig", () => ({
      ui: { colors: { primary: "red" } },
      company: { website: "afrilandfirstbank.com", cardBackground: "/bg.png" },
    }));
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("fr") }));
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: { stubs },
    });
    const vm = wrapper.vm as unknown as { shareCardImage: () => Promise<void> };
    await vm.shareCardImage();
    await flushPromises();
    expect(vi.mocked(toPng)).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
  });
});
