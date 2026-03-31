import { shallowMount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Card } from "../../types/card";
type QRVm = {
  copyToClipboard: () => Promise<void>;
  downloadVCard: () => Promise<void>;
  downloadSVG: () => void;
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

describe("app/components/QRCode.vue", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    copyMock.mockReset();
    shareMock.mockReset();
    canShareMock.mockReset();
    canShareMock.mockReturnValue(false);
    vi.stubGlobal("navigator", { share: shareMock, canShare: canShareMock });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:1");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  it("copies URL with useClipboard", async () => {
    const { default: QRCode } = await import("../../app/components/QRCode.vue");
    const wrapper = shallowMount(QRCode, { props: { url: "https://card.local/x" } });
    const vm = wrapper.vm as unknown as QRVm;
    await vm.copyToClipboard();
    expect(copyMock).toHaveBeenCalledWith("https://card.local/x");
  });

  it("returns early when card is missing", async () => {
    const { default: QRCode } = await import("../../app/components/QRCode.vue");
    const wrapper = shallowMount(QRCode, { props: { url: "https://card.local/x" } });
    const vm = wrapper.vm as unknown as QRVm;
    await expect(vm.downloadVCard()).resolves.toBeUndefined();
    expect(shareMock).not.toHaveBeenCalled();
  });

  it("falls back to anchor download when Web Share files are unavailable", async () => {
    const { default: QRCode } = await import("../../app/components/QRCode.vue");
    const appendSpy = vi.spyOn(document.body, "appendChild");
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
    expect(appendSpy).toHaveBeenCalled();
  });

  it("downloadSVG returns early when #QRcode is absent", async () => {
    const { default: QRCode } = await import("../../app/components/QRCode.vue");
    const getById = vi.spyOn(document, "getElementById").mockReturnValue(null);
    const wrapper = shallowMount(QRCode, { props: { url: "https://card.local/x" } });
    const vm = wrapper.vm as unknown as QRVm;
    expect(() => vm.downloadSVG()).not.toThrow();
    expect(getById).toHaveBeenCalledWith("QRcode");
  });

  it("getQRAsFile returns null when image loading fails", async () => {
    const { default: QRCode } = await import("../../app/components/QRCode.vue");
    vi.spyOn(document, "getElementById").mockReturnValue({} as unknown as HTMLElement);

    class ImgErr {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        this.onerror?.();
      }
    }
    vi.stubGlobal("Image", ImgErr as unknown as typeof Image);

    const wrapper = shallowMount(QRCode, { props: { url: "https://card.local/x" } });
    const vm = wrapper.vm as unknown as QRVm;
    await expect(vm.getQRAsFile()).resolves.toBeNull();
  });
});
