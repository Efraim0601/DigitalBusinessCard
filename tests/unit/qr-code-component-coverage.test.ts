import { shallowMount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Card } from "../../types/card";

type QRVm = {
  downloadSVG: () => void;
  downloadVCard: () => Promise<void>;
  getQRAsFile: () => Promise<File | null>;
};

const copyMock = vi.fn();
const shareMock = vi.fn();
const canShareMock = vi.fn(() => false);

vi.mock("#imports", () => ({
  useClipboard: () => ({ copy: copyMock }),
}));

vi.mock("vcard-creator", () => {
  return {
    default: class FakeVCard {
      addName() { return this; }
      addCompany() { return this; }
      addJobtitle() { return this; }
      addEmail() { return this; }
      addPhoneNumber() { return this; }
      toString() { return "BEGIN:VCARD"; }
    },
  };
});

describe("app/components/QRCode.vue coverage branches", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    canShareMock.mockReset();
    canShareMock.mockReturnValue(true);
    shareMock.mockReset();
    shareMock.mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share: shareMock, canShare: canShareMock });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:qr");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  it("runs downloadSVG image conversion path", async () => {
    const { default: QRCode } = await import("../../app/components/QRCode.vue");
    vi.spyOn(document, "getElementById").mockReturnValue({} as unknown as HTMLElement);
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: vi.fn() }),
          toDataURL: () => "data:image/webp;base64,AA",
        } as unknown as HTMLElement;
      }
      return originalCreateElement(tagName);
    });

    class ImgOk {
      onload: (() => void) | null = null;
      set src(_v: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal("Image", ImgOk as unknown as typeof Image);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const wrapper = shallowMount(QRCode, { props: { url: "https://card.local/x" } });
    const vm = wrapper.vm as unknown as QRVm;
    vm.downloadSVG();
    expect(clickSpy).toHaveBeenCalled();
  });

  it("runs getQRAsFile success path", async () => {
    const { default: QRCode } = await import("../../app/components/QRCode.vue");
    vi.spyOn(document, "getElementById").mockReturnValue({} as unknown as HTMLElement);
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: vi.fn() }),
          toBlob: (cb: BlobCallback) => cb?.(new Blob(["qr"], { type: "image/png" })),
        } as unknown as HTMLElement;
      }
      return originalCreateElement(tagName);
    });
    class ImgOk {
      onload: (() => void) | null = null;
      set src(_v: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal("Image", ImgOk as unknown as typeof Image);
    const wrapper = shallowMount(QRCode, { props: { url: "https://card.local/x" } });
    const vm = wrapper.vm as unknown as QRVm;
    const qrFile = await vm.getQRAsFile();
    expect(qrFile?.name).toBe("qr-code-carte.png");
  });

  it("uses native share for vcard file", async () => {
    const { default: QRCode } = await import("../../app/components/QRCode.vue");
    const card: Card = {
      color: "red",
      fName: "Jane",
      lName: "Doe",
      email: "jane@x.com",
      phone: "111",
      fax: "",
      mobile: "",
      co: "AFB",
      title: "Analyst",
    };
    const wrapper = shallowMount(QRCode, { props: { url: "https://card.local/x", card } });
    const vm = wrapper.vm as unknown as QRVm;
    await vm.downloadVCard();
    expect(canShareMock).toHaveBeenCalled();
    expect(shareMock).toHaveBeenCalled();
  });
});
