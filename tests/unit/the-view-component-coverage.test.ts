import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, ref } from "vue";
import type { Card } from "../../types/card";
import TheViewComponent from "../../app/components/TheViewComponent.vue";

vi.mock("html-to-image", () => ({
  toPng: vi.fn(async () => "data:image/png;base64,AAA"),
}));

type ViewVm = {
  downloadCardImage: () => Promise<void>;
  shareCardImage: () => Promise<void>;
  shareQRCode: () => Promise<void>;
};

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

let getQRAsFileMock = vi.fn(async () => new File(["qr"], "qr.png", { type: "image/png" }));
const QRCodeStub = defineComponent({
  props: ["url", "card"],
  setup(_props, { expose }) {
    expose({ getQRAsFile: () => getQRAsFileMock() });
    return {};
  },
  template: "<div class='qr' />",
});

describe("app/components/TheViewComponent.vue coverage branches", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getQRAsFileMock = vi.fn(async () => new File(["qr"], "qr.png", { type: "image/png" }));
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("fr") }));
    Object.assign(globalThis, {
      useAppConfig: () => ({
        ui: { colors: { primary: "red" } },
        company: { website: "afrilandfirstbank.com", cardBackground: "" },
      }),
      useRoute: () => ({ path: "/card", query: { email: "jane@example.com" } }),
      useHead: vi.fn(),
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:view");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ blob: async () => new Blob(["x"], { type: "image/png" }) }) as typeof fetch);
  });

  it("runs downloadCardImage path and fallback when fetch fails", async () => {
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: {
        stubs: {
          QRCode: QRCodeStub,
          UPopover: { template: "<div><slot /><slot name='content' /></div>" },
          UButton: { template: "<button><slot /></button>" },
          UIcon: true,
          NuxtLink: { props: ["to"], template: "<a :href='to'><slot /></a>" },
        },
      },
    });
    const vm = wrapper.vm as unknown as ViewVm;
    await vm.downloadCardImage();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")) as typeof fetch);
    await vm.downloadCardImage();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("runs shareCardImage native share path and download fallback path", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn(() => true);
    vi.stubGlobal("navigator", { share, canShare } as Navigator);
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: {
        stubs: {
          QRCode: QRCodeStub,
          UPopover: { template: "<div><slot /><slot name='content' /></div>" },
          UButton: { template: "<button><slot /></button>" },
          UIcon: true,
          NuxtLink: { props: ["to"], template: "<a :href='to'><slot /></a>" },
        },
      },
    });
    const vm = wrapper.vm as unknown as ViewVm;
    await vm.shareCardImage();
    vi.stubGlobal("navigator", { canShare: vi.fn(() => false) } as Navigator);
    await vm.shareCardImage();
    expect(share).toHaveBeenCalled();
  });

  it("runs shareQRCode branch with native share", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn(() => true);
    vi.stubGlobal("navigator", { share, canShare } as Navigator);
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: {
        stubs: {
          QRCode: QRCodeStub,
          UPopover: { template: "<div><slot /><slot name='content' /></div>" },
          UButton: { template: "<button><slot /></button>" },
          UIcon: true,
          NuxtLink: { props: ["to"], template: "<a :href='to'><slot /></a>" },
        },
      },
    });
    const vm = wrapper.vm as unknown as ViewVm;
    await vm.shareQRCode();
    expect(getQRAsFileMock).toHaveBeenCalled();
    expect(share).toHaveBeenCalled();
  });
});
