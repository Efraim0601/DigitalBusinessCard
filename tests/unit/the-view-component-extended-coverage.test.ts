/**
 * Couverture complémentaire TheViewComponent : branches template, popovers,
 * waitForImages / waitForBackgroundImage, chemins d’erreur (Sonar : non couvert / partiel).
 */
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import type { Card } from "../../types/card";
import * as cardUrls from "../../app/utils/card-urls";
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

const popoverStub = { template: "<div class='popover'><slot /><slot name='content' /></div>" };

function mountView(card: Card, isCreator: boolean, extraStubs: Record<string, unknown> = {}) {
  return mount(TheViewComponent, {
    props: { urlCard: card, isCreator },
    attachTo: document.body,
    global: {
      stubs: {
        QRCode: { props: ["url", "card"], template: "<img class='qr-img' :data-url='url' />" },
        UPopover: popoverStub,
        UButton: { template: "<button type='button' class='u-btn' @click='$attrs.onClick?.()'><slot />{{ $attrs.label }}</button>" },
        UIcon: true,
        NuxtLink: { props: ["to"], template: "<a :href='to'><slot /></a>" },
        ...extraStubs,
      },
    },
  });
}

describe("TheViewComponent.vue — couverture étendue (branches & erreurs)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(toPng).mockResolvedValue("data:image/png;base64,AAA");
    vi.stubGlobal("requestAnimationFrame", ((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ blob: async () => new Blob(["x"], { type: "image/png" }) }) as typeof fetch
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:ext");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    Object.assign(globalThis, {
      useAppConfig: () => ({
        ui: { colors: { primary: "red" } },
        company: {
          name: "Afriland First Bank",
          address: "Place de l'Indépendance",
          addressComplement: "B.P: 11834",
          telex: "8907 KN",
          website: "https://www.afrilandfirstbank.com",
          cardBackground: "",
        },
      }),
      useRoute: () => ({ path: "/card", query: { email: "jane@example.com" } }),
      useHead: vi.fn(),
    });
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("fr") }));
  });

  it("ouvre le popover partage et déclenche shareCardImage puis referme (ligne ~498)", async () => {
    const wrapper = mountView(baseCard, true);
    await flushPromises();
    const cta = wrapper.find(".card-cta-zone");
    const shareTrigger = cta.findAll("button").find((b) => b.attributes("title") === "action.share");
    expect(shareTrigger).toBeTruthy();
    await shareTrigger!.trigger("click");
    const shareImgBtn = cta.findAll("button").find((b) => b.text().includes("share.shareCardImage"));
    expect(shareImgBtn).toBeTruthy();
    await shareImgBtn!.trigger("click");
    await flushPromises();
    expect(toPng).toHaveBeenCalled();
  });

  it("QRCode visible : publicUrl vide utilise url (mock buildPublicCardUrl)", async () => {
    vi.spyOn(cardUrls, "buildPublicCardUrl").mockReturnValue("");
    const wrapper = mountView(baseCard, false);
    await flushPromises();
    const qrImg = wrapper.find(".qr-img");
    expect(qrImg.attributes("data-url")).toBeTruthy();
    expect(qrImg.attributes("data-url")).not.toBe("");
  });

  it("downloadVCard depuis le popover QR (UButton save contact)", async () => {
    const downloadVCard = vi.fn().mockResolvedValue(undefined);
    const QRStub = defineComponent({
      setup(_, { expose }) {
        expose({ downloadVCard, getQRAsFile: async () => null });
        return () => h("div", { class: "qr-stub" });
      },
    });
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: false },
      attachTo: document.body,
      global: {
        stubs: {
          QRCode: QRStub,
          UPopover: popoverStub,
          UButton: {
            template:
              "<button type='button' class='u-btn' @click=\"$attrs['onClick'] && $attrs['onClick']()\">{{ label }}</button>",
            props: ["label"],
            inheritAttrs: false,
          },
          UIcon: true,
          NuxtLink: { props: ["to"], template: "<a :href='to'><slot /></a>" },
        },
      },
    });
    await flushPromises();
    const cta = wrapper.find(".card-cta-zone");
    const qrTriggers = cta.findAll("button").filter((b) => b.attributes("title") === "action.showQR");
    expect(qrTriggers.length).toBeGreaterThan(0);
    await qrTriggers[0]!.trigger("click");
    const saveBtn = wrapper.findAll("button").find((b) => b.text().includes("action.saveContact"));
    expect(saveBtn).toBeTruthy();
    await saveBtn!.trigger("click");
    expect(downloadVCard).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("waitForImages : img incomplète puis onload dans la carte", async () => {
    const wrapper = mountView(baseCard, true);
    await flushPromises();
    const card = wrapper.get(".business-card").element;
    const img = document.createElement("img");
    Object.defineProperty(img, "complete", { configurable: true, get: () => false });
    card.appendChild(img);
    const p = (wrapper.vm as { downloadCardImage: () => Promise<void> }).downloadCardImage();
    // Laisser nextTick + waitForBackgroundImage + nextTick : waitForImages doit enregistrer onload avant le load.
    await flushPromises();
    img.dispatchEvent(new Event("load"));
    await flushPromises();
    await p;
    expect(toPng).toHaveBeenCalled();
  });

  it("downloadCardImage : catch externe journalise (toPng rejette)", async () => {
    vi.mocked(toPng).mockRejectedValueOnce(new Error("png fail"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountView(baseCard, true);
    await flushPromises();
    await (wrapper.vm as { downloadCardImage: () => Promise<void> }).downloadCardImage();
    expect(errSpy).toHaveBeenCalledWith("Export carte PNG:", expect.any(Error));
    errSpy.mockRestore();
  });

  it("fileNameFromCard utilise le fallback « card » sans prénom/nom", async () => {
    const card: Card = {
      ...baseCard,
      fName: "",
      lName: "",
    };
    const wrapper = mountView(card, true);
    await flushPromises();
    await (wrapper.vm as { downloadCardImage: () => Promise<void> }).downloadCardImage();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("template : sans nom affiché, sans titre/département si vides", () => {
    const minimal: Card = {
      color: "red",
      fName: "",
      lName: "",
      phone: "",
      title: "",
      co: "",
      email: "",
      mobile: "",
    };
    const wrapper = mountView(minimal, false, {
      QRCode: true,
    });
    expect(wrapper.find("h1").exists()).toBe(false);
  });

  it("template : job_title et department structurés (displayedTitle / displayedDepartment)", () => {
    const c: Card = {
      ...baseCard,
      job_title: { label_fr: "Chef", label_en: "Head" },
      department: { label_fr: "RH", label_en: "HR" },
      title: "",
      co: "",
    };
    vi.stubGlobal("useAppLocale", () => ({ t: (k: string) => k, locale: ref<"fr" | "en">("en") }));
    const wrapper = mountView(c, false, { QRCode: true });
    expect(wrapper.text()).toContain("Head");
    expect(wrapper.text()).toContain("HR");
  });

  it("template : company sans address / complement / telex (v-if faux)", () => {
    Object.assign(globalThis, {
      useAppConfig: () => ({
        ui: { colors: { primary: "red" } },
        company: { name: "X", website: "x.com" },
      }),
    });
    const wrapper = mountView(baseCard, false, { QRCode: true });
    expect(wrapper.text()).not.toContain("Place de l'Indépendance");
  });

  it("lien tel utilise le numéro fixe si mobile vide", async () => {
    const c = { ...baseCard, mobile: "" };
    const wrapper = mountView(c, false, { QRCode: true });
    await flushPromises();
    const callLink = wrapper.find(".card-cta-zone a[title='action.call']");
    expect(callLink.exists()).toBe(true);
    expect(callLink.attributes("href")).toContain("222");
  });

  it("shareQRCode : sans getQRAsFile ne fait rien", async () => {
    const QRStub = defineComponent({
      setup(_, { expose }) {
        expose({ downloadVCard: vi.fn() });
        return () => h("div");
      },
    });
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: {
        stubs: {
          QRCode: QRStub,
          UPopover: popoverStub,
          UButton: { template: "<button><slot /></button>" },
          UIcon: true,
          NuxtLink: { props: ["to"], template: "<a :href='to'><slot /></a>" },
        },
      },
    });
    await (wrapper.vm as { shareQRCode: () => Promise<void> }).shareQRCode();
    await flushPromises();
  });

  it("shareQRCode : fichier null retourne tôt", async () => {
    const QRStub = defineComponent({
      setup(_, { expose }) {
        expose({ getQRAsFile: async () => null });
        return () => h("div");
      },
    });
    const share = vi.fn();
    vi.stubGlobal("navigator", { share, canShare: () => true } as Navigator);
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: {
        stubs: {
          QRCode: QRStub,
          UPopover: popoverStub,
          UButton: { template: "<button><slot /></button>" },
          UIcon: true,
          NuxtLink: { props: ["to"], template: "<a :href='to'><slot /></a>" },
        },
      },
    });
    await (wrapper.vm as { shareQRCode: () => Promise<void> }).shareQRCode();
    expect(share).not.toHaveBeenCalled();
  });

  it("shareQRCode : erreur autre qu’AbortError est journalisée", async () => {
    const file = new File(["x"], "q.png", { type: "image/png" });
    const QRStub = defineComponent({
      setup(_, { expose }) {
        expose({ getQRAsFile: async () => file });
        return () => h("div");
      },
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "navigator",
      {
        share: vi.fn().mockRejectedValue(new Error("share fail")),
        canShare: () => true,
      } as Navigator
    );
    const wrapper = mount(TheViewComponent, {
      props: { urlCard: baseCard, isCreator: true },
      global: {
        stubs: {
          QRCode: QRStub,
          UPopover: popoverStub,
          UButton: { template: "<button><slot /></button>" },
          UIcon: true,
          NuxtLink: { props: ["to"], template: "<a :href='to'><slot /></a>" },
        },
      },
    });
    await (wrapper.vm as { shareQRCode: () => Promise<void> }).shareQRCode();
    await flushPromises();
    expect(errSpy).toHaveBeenCalledWith("Share QR code:", expect.any(Error));
    errSpy.mockRestore();
  });

  it("shareCardImage : AbortError sur share ne journalise pas", async () => {
    vi.stubGlobal(
      "navigator",
      {
        share: vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" })),
        canShare: () => true,
      } as Navigator
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountView(baseCard, true);
    await flushPromises();
    await (wrapper.vm as { shareCardImage: () => Promise<void> }).shareCardImage();
    await flushPromises();
    expect(errSpy).not.toHaveBeenCalledWith("Share card image:", expect.anything());
    errSpy.mockRestore();
  });

  it("copyLink : échec clipboard déclenche console.error dans copyLink", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("clip")) } } as Navigator);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountView(baseCard, true);
    await flushPromises();
    await (wrapper.vm as { copyLink: () => Promise<void> }).copyLink();
    await flushPromises();
    expect(errSpy).toHaveBeenCalledWith("Copier le lien:", expect.any(Error));
    errSpy.mockRestore();
  });

  it("copyEmployeeLink : lien vide retourne sans copier", async () => {
    vi.spyOn(cardUrls, "buildPublicCardUrl").mockReturnValue("");
    vi.spyOn(cardUrls, "withEmployeeQuery").mockReturnValue("");
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { clipboard: { writeText } } as Navigator);
    const wrapper = mountView(baseCard, true);
    await flushPromises();
    await (wrapper.vm as { copyEmployeeLink: () => Promise<void> }).copyEmployeeLink();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("waitForBackgroundImage : url vide résout tout de suite", async () => {
    Object.assign(globalThis, {
      useAppConfig: () => ({
        ui: { colors: { primary: "red" } },
        company: { website: "x.com", cardBackground: "   " },
      }),
    });
    const wrapper = mountView(baseCard, true);
    await flushPromises();
    await (wrapper.vm as { downloadCardImage: () => Promise<void> }).downloadCardImage();
    expect(toPng).toHaveBeenCalled();
  });

  it("waitForBackgroundImage : Image déjà complete (branche img.complete)", async () => {
    class ImgComplete {
      crossOrigin = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      get complete() {
        return true;
      }
      set src(_: string) {}
    }
    vi.stubGlobal("Image", ImgComplete as unknown as typeof Image);
    Object.assign(globalThis, {
      useAppConfig: () => ({
        ui: { colors: { primary: "red" } },
        company: { website: "x.com", cardBackground: "/logo.png" },
      }),
    });
    const wrapper = mountView(baseCard, true);
    await flushPromises();
    await (wrapper.vm as { downloadCardImage: () => Promise<void> }).downloadCardImage();
    expect(toPng).toHaveBeenCalled();
  });

  it("useHead précharge cardBackground quand défini", () => {
    const useHead = vi.fn();
    Object.assign(globalThis, {
      useAppConfig: () => ({
        ui: { colors: { primary: "red" } },
        company: { website: "x.com", cardBackground: "/bg.png" },
      }),
      useHead,
    });
    mountView(baseCard, false, { QRCode: true });
    expect(useHead).toHaveBeenCalled();
    const arg = useHead.mock.calls[0]![0];
    const links = typeof arg === "function" ? arg() : arg;
    expect(links.link?.length).toBeGreaterThan(0);
  });

  it("shareCardLink : erreur share non-Abort fait tomber sur copyLink", async () => {
    const share = vi.fn().mockRejectedValue(new Error("not abort"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText } } as Navigator);
    const wrapper = mountView(baseCard, true);
    await flushPromises();
    const cta = wrapper.find(".card-cta-zone");
    const shareTrigger = cta.findAll("button").find((b) => b.attributes("title") === "action.share");
    await shareTrigger!.trigger("click");
    const linkBtn = cta.findAll("button").find((b) => b.text().includes("share.shareCardLink"));
    await linkBtn!.trigger("click");
    await flushPromises();
    expect(share).toHaveBeenCalled();
    expect(writeText).toHaveBeenCalled();
  });
});
