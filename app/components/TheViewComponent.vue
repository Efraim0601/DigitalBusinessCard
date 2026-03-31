<script lang="ts" setup>
import type { Card } from "~~/types/card";
import { buildPublicCardUrl, withEmployeeQuery } from "~/utils/card-urls";
import { nextPaint } from "~/utils/next-paint";
import { translateCardTitle, translateCardDepartment } from "~/locales/card-value-translations";

const url = ref("waiting");
const appConfig = useAppConfig();
const qrRef = ref<{ downloadSVG: () => void; copyToClipboard: () => Promise<void>; downloadVCard: () => Promise<void> } | null>(null);
const cardContentRef = ref<HTMLElement | null>(null);
const copySuccess = ref(false);
const CARD_WIDTH = 600;
const CARD_HEIGHT = 340;
const cardScale = ref(1);
const updateScale = () => {
  const availableWidth =
    typeof globalThis !== "undefined" && typeof globalThis.window !== "undefined"
      ? Math.max(280, globalThis.window.innerWidth - 24)
      : CARD_WIDTH;
  cardScale.value = Math.min(1, availableWidth / CARD_WIDTH);
};

const { urlCard, isCreator = false } = defineProps<{
  urlCard: Card;
  isCreator?: boolean;
}>();

const { t, locale } = useAppLocale();
const displayedTitle = computed(() => {
  if (urlCard.job_title) return locale.value === "en" ? urlCard.job_title!.label_en : urlCard.job_title!.label_fr;
  return translateCardTitle(urlCard.title, locale.value);
});
const displayedDepartment = computed(() => {
  if (urlCard.department) return locale.value === "en" ? urlCard.department!.label_en : urlCard.department!.label_fr;
  return translateCardDepartment(urlCard.co, locale.value);
});
const route = useRoute();
const FIXED_PHONE = "675 878 034";
const FIXED_FAX = "222 221 785";

/** URL sans owner ni employee : pour partage et QR, le visiteur/employé qui reçoit le lien a la vue adaptée. */
const publicUrl = computed(() => {
  if (typeof globalThis === "undefined" || typeof globalThis.window === "undefined") return "";
  return buildPublicCardUrl(
    globalThis.window.location.origin,
    route.path,
    route.query as Record<string, string | string[] | undefined>
  );
});

/** Lien pour l'employé (RH envoie à Marco) : accès à la carte + QR code, sans droit d'édition. */
const employeeLink = computed(() => withEmployeeQuery(publicUrl.value));

const company = computed(() => appConfig.company ?? {
  name: "Afriland First Bank",
  address: "Place de l'Indépendance",
  addressComplement: "B.P: 11834 Yaoundé - Cameroun",
  telex: "8907 KN",
  website: "www.afrilandfirstbank.com",
});

useHead(() => ({
  link: company.value?.cardBackground
    ? [{ rel: "preload", as: "image", href: company.value.cardBackground }]
    : [],
}));

const websiteUrl = computed(() => {
  const w = company.value?.website ?? "";
  return w.startsWith("http") ? w : `https://${w}`;
});

const editCardUrl = computed(() => {
  const params = new URLSearchParams();
  params.set("type", "create");
  if (appConfig.ui.colors.primary) params.set("color", String(appConfig.ui.colors.primary));
  if (urlCard.fName) params.set("fName", String(urlCard.fName));
  if (urlCard.lName) params.set("lName", String(urlCard.lName));
  if (urlCard.co) params.set("co", String(urlCard.co));
  if (urlCard.title) params.set("title", String(urlCard.title));
  if (urlCard.email) params.set("email", String(urlCard.email));
  if (urlCard.phone) params.set("phone", String(urlCard.phone));
  if (urlCard.fax) params.set("fax", String(urlCard.fax));
  if (urlCard.mobile) params.set("mobile", String(urlCard.mobile));
  return `/?${params.toString()}`;
});

const shareTitle = computed(() => {
  const name = [urlCard.fName, urlCard.lName].filter(Boolean).join(" ");
  return name ? t("share.cardTitle", { name }) : t("share.cardTitleDefault");
});
const shareUrl = computed(() => {
  if (typeof globalThis === "undefined" || typeof globalThis.window === "undefined") return "";
  // Lien partagé = page de login, pas la carte directe
  return `${globalThis.window.location.origin}/`;
});

/** URL courte pour partage : ici on partage également la page de login. */
function buildShortShareUrl(): string {
  if (typeof globalThis === "undefined" || typeof globalThis.window === "undefined") return "";
  return `${globalThis.window.location.origin}/`;
}
const shareUrlShort = computed(() => buildShortShareUrl());

const shareText = computed(() => {
  const name = [urlCard.fName, urlCard.lName].filter(Boolean).join(" ");
  return name ? t("share.discover", { name }) : t("share.discoverDefault");
});

const sharePopoverOpen = ref(false);

function isBrowserRuntime() {
  return typeof globalThis !== "undefined" && typeof globalThis.window !== "undefined";
}

function markCopySuccess() {
  copySuccess.value = true;
  setTimeout(() => {
    copySuccess.value = false;
  }, 2500);
}

async function copyTextWithFallback(text: string, promptMessage: string) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    markCopySuccess();
  } catch (e) {
    if (isBrowserRuntime()) globalThis.window.prompt(promptMessage, text);
    throw e;
  }
}

function downloadBlobAsFile(blob: Blob, fileName: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 100);
}

function fileNameFromCard(prefixKey: string) {
  const namePart = [urlCard.fName, urlCard.lName].filter(Boolean).join("-") || "card";
  return `${t(prefixKey)}-${namePart}.png`;
}

/** Partage natif du lien de la carte (Web Share API si dispo, sinon copie du lien). */
async function shareCardLink() {
  const title = shareTitle.value;
  const pageUrl = shareUrlShort.value || shareUrl.value;
  // On laisse le lien uniquement dans le champ url pour éviter les doublons dans certaines apps.
  const text = shareText.value;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url: pageUrl,
      });
      return;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
    }
  }

  await copyLink();
}

/** Attend le chargement de l’image de fond de la carte (logo) avant capture. */
function waitForBackgroundImage(url: string | undefined): Promise<void> {
  if (!url?.trim()) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Laisser le navigateur peindre le fond avant la capture
      nextPaint().then(resolve);
    };
    img.onerror = () => resolve();
    img.src = url;
    if (img.complete) {
      nextPaint().then(resolve);
    }
  });
}

function waitForImages(el: HTMLElement): Promise<void> {
  const imgs = el.querySelectorAll("img");
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    Array.from(imgs).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        })
    )
  ).then(() => {});
}

async function downloadCardImage() {
  const prevScale = cardScale.value;
  cardScale.value = 1;
  await nextTick();
  const el = cardContentRef.value;
  if (!el) return;
  try {
    await waitForBackgroundImage(company.value?.cardBackground);
    await nextTick();
    await waitForImages(el);
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(el, {
      cacheBust: true,
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      skipFonts: true,
    });
    const fileName = fileNameFromCard("download.cardFilename");
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      downloadBlobAsFile(blob, fileName);
    } catch {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      link.click();
    }
  } catch (e) {
    console.error("Export carte PNG:", e);
  } finally {
    cardScale.value = prevScale;
  }
}

/** Partager l'image de la carte (fichier PNG) : Web Share API si disponible, sinon téléchargement. */
async function shareCardImage() {
  const prevScale = cardScale.value;
  cardScale.value = 1;
  await nextTick();
  const el = cardContentRef.value;
  if (!el) return;
  try {
    await waitForBackgroundImage(company.value?.cardBackground);
    await nextTick();
    await waitForImages(el);
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(el, {
      cacheBust: true,
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      skipFonts: true,
    });
    const fileName = fileNameFromCard("download.cardFilename");
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], fileName, { type: "image/png" });
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: shareTitle.value,
        text: shareText.value,
        files: [file],
      });
    } else {
      downloadBlobAsFile(blob, fileName);
    }
  } catch (e) {
    if ((e as Error)?.name !== "AbortError") console.error("Share card image:", e);
  } finally {
    cardScale.value = prevScale;
  }
}

async function copyLink() {
  const linkToCopy =
    publicUrl.value ||
    (typeof globalThis !== "undefined" && typeof globalThis.window !== "undefined" ? globalThis.window.location.href : url.value);
  try {
    await copyTextWithFallback(linkToCopy, "Copiez ce lien :");
  } catch (e) {
    console.error("Copier le lien:", e);
  }
}

/** Partager le QR code qui mène vers la carte (même URL que le lien partagé). */
async function shareQRCode() {
  const getQR = (qrRef.value as { getQRAsFile?: () => Promise<File | null> } | null)?.getQRAsFile;
  if (!getQR) return;
  const file = await getQR();
  if (!file) return;
  try {
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: shareTitle.value,
        text: shareText.value,
        files: [file],
      });
    } else {
      downloadBlobAsFile(file, file.name);
    }
  } catch (e) {
    if ((e as Error)?.name !== "AbortError") console.error("Share QR code:", e);
  }
}

async function copyEmployeeLink() {
  const linkToCopy = employeeLink.value;
  if (!linkToCopy) return;
  try {
    await copyTextWithFallback(linkToCopy, "Copiez le lien employé :");
  } catch (e) {
    console.error("Copier lien employé:", e);
  }
}

onMounted(() => {
  url.value = globalThis.location?.href ?? "waiting";
  updateScale();
  globalThis.window?.addEventListener("resize", updateScale, { passive: true });
});

onBeforeUnmount(() => {
  globalThis.window?.removeEventListener("resize", updateScale);
});

defineExpose({
  downloadCardImage,
  shareCardImage,
  shareQRCode,
});
</script>

<template>
  <div class="flex flex-col items-center w-full gap-4 px-1 sm:px-0 touch-manipulation">
    <!-- QR code masqué : gardé en DOM pour downloadVCard (enregistrer le contact), le visiteur qui a scanné ne le voit pas -->
    <div class="absolute -left-[9999px] w-48 h-48 opacity-0 pointer-events-none overflow-hidden">
      <QRCode ref="qrRef" :url="publicUrl || url" :card="{ ...urlCard, fax: FIXED_FAX }" />
    </div>

    <!-- Carte de visite : format fixe + scale (pas de responsive layout) -->
    <div
      class="w-full flex justify-center"
      :style="{ height: `${CARD_HEIGHT * cardScale}px` }"
    >
      <div
        class="font-sans"
        :style="{
          width: `${CARD_WIDTH}px`,
          height: `${CARD_HEIGHT}px`,
          transform: `scale(${cardScale})`,
          transformOrigin: 'top center',
        }"
      >
        <!-- Partie capturée en image (sans les icônes en bas) ; fond = template Carte_digitale (logo inclus dans l’image de fond) -->
        <div
          ref="cardContentRef"
          class="business-card relative overflow-hidden border-2 border-gray-400 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
          :style="{
            backgroundColor: '#ffffff',
            backgroundImage: company?.cardBackground ? `url(${company.cardBackground})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }"
        >
          <div class="h-full flex flex-col px-8 pt-[113px] pb-5 relative z-[1]">
          <!-- Nom & titre -->
          <div class="mb-2">
            <h1 v-if="urlCard.fName || urlCard.lName" class="text-[20px] font-bold text-[#1a1a2e] leading-tight font-[Arial,Helvetica,sans-serif]">
              {{ [urlCard.fName, urlCard.lName].filter(Boolean).join(" ") }}
            </h1>
            <p v-if="displayedTitle" class="text-sm font-bold text-[#333] mt-1 leading-[1.35] font-[Arial,Helvetica,sans-serif]">
              {{ displayedTitle }}
            </p>
            <p v-if="displayedDepartment" class="text-xs font-medium text-[#2d2d2d] mt-0.5 leading-[1.4] font-[Arial,Helvetica,sans-serif]">
              {{ displayedDepartment }}
            </p>
          </div>

          <!-- Contact -->
          <div class="mt-5 flex justify-between items-end gap-4">
            <div class="text-[11px] text-[#222] leading-[1.7] font-[Arial,Helvetica,sans-serif]">
              <div v-if="company?.address" class="font-bold text-[11.5px]">{{ company.address }}</div>
              <table class="border-collapse">
                <thead class="sr-only">
                  <tr>
                    <th scope="col">{{ t('card.bp') }}</th>
                    <th scope="col">{{ t('card.email') }}</th>
                  </tr>
                </thead>
                <tbody>
                <tr v-if="company?.addressComplement">
                  <td class="pr-2 align-top text-[11px] leading-[1.55] text-[#333] whitespace-nowrap">{{ t('card.bp') }}</td>
                  <td class="align-top text-[11px] leading-[1.55]">{{ company.addressComplement.replace(/^B\.P:\s*/i, "") }}</td>
                </tr>
                <tr v-if="company?.telex">
                  <td class="pr-2 align-top text-[11px] leading-[1.55] text-[#333] whitespace-nowrap">{{ t('card.telex') }}</td>
                  <td class="align-top text-[11px] leading-[1.55]">{{ company.telex }}</td>
                </tr>
                <tr v-if="urlCard.email && urlCard.email !== ''">
                  <td class="pr-2 align-top text-[11px] leading-[1.55] text-[#333] whitespace-nowrap">{{ t('card.email') }}</td>
                  <td class="align-top text-[11px] leading-[1.55]">
                    <a :href="`mailto:${urlCard.email}`" class="text-[#222] hover:underline break-all">{{ urlCard.email }}</a>
                  </td>
                </tr>
                <tr v-if="company?.website">
                  <td class="pr-2 align-top text-[11px] leading-[1.55] text-[#333] whitespace-nowrap">{{ t('card.website') }}</td>
                  <td class="align-top text-[11px] leading-[1.55]">
                    <a :href="websiteUrl" target="_blank" rel="noopener noreferrer" class="text-[#222] hover:underline">
                      {{ company.website }}
                    </a>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
            <div class="text-[11px] text-[#222] text-right font-[Arial,Helvetica,sans-serif]">
              <table class="border-collapse">
                <thead class="sr-only">
                  <tr>
                    <th scope="col">{{ t('card.phone') }}</th>
                    <th scope="col">{{ t('card.fax') }}</th>
                    <th scope="col">{{ t('card.mobile') }}</th>
                  </tr>
                </thead>
                <tbody>
                <tr>
                  <td class="pl-1.5 text-left text-[#333] text-[11px] leading-[1.55] whitespace-nowrap">{{ t('card.phone') }}</td>
                  <td class="pl-1.5 text-[11px] leading-[1.55] whitespace-nowrap">
                    <a href="tel:675878034" class="text-[#222] hover:underline">{{ FIXED_PHONE }}</a>
                  </td>
                </tr>
                <tr>
                  <td class="pl-1.5 text-left text-[#333] text-[11px] leading-[1.55] whitespace-nowrap">{{ t('card.fax') }}</td>
                  <td class="pl-1.5 text-[11px] leading-[1.55] whitespace-nowrap">
                    <a href="tel:222221785" class="text-[#222] hover:underline">{{ FIXED_FAX }}</a>
                  </td>
                </tr>
                <tr v-if="urlCard.mobile && urlCard.mobile !== ''">
                  <td class="pl-1.5 text-left text-[#333] text-[11px] leading-[1.55] whitespace-nowrap">{{ t('card.mobile') }}</td>
                  <td class="pl-1.5 text-[11px] leading-[1.55] whitespace-nowrap">
                    <a :href="`tel:${urlCard.mobile}`" class="text-[#222] hover:underline">{{ urlCard.mobile }}</a>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Boutons d'action : créateur (éditer, partager, QR, télécharger, appeler, email) / visiteur (partager, QR, télécharger, appeler, email) -->
    <div class="card-cta-zone w-full max-w-2xl">
      <NuxtLink
        v-if="isCreator"
        :to="editCardUrl"
        class="card-cta-icon"
        :title="t('action.edit')"
      >
        <UIcon name="i-lucide-pencil" class="size-5" />
      </NuxtLink>
      <UPopover v-model:open="sharePopoverOpen" :popper="{ placement: 'top' }">
        <button
          type="button"
          class="card-cta-icon"
          :title="t('action.share')"
          @click.stop.prevent="sharePopoverOpen = true"
        >
          <UIcon name="i-lucide-share-2" class="size-5" />
        </button>
        <template #content>
          <div class="p-3 min-w-[220px] bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg flex flex-col gap-3">
            <!-- Option 1 : Partager l'image de la carte (visuel) -->
            <div>
              <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">{{ t('share.cardImage') }}</p>
              <button
                type="button"
                class="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                @click="shareCardImage().then(() => { sharePopoverOpen = false; })"
              >
                <UIcon name="i-lucide-image" class="size-5" />
                <span>{{ t('share.shareCardImage') }}</span>
              </button>
            </div>
            <!-- Option 2 : Partager le lien de la carte (enregistrer / rouvrir) -->
            <div>
              <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">{{ t('share.cardLink') }}</p>
              <div class="flex flex-col gap-0.5">
                <button
                  type="button"
                  class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  @click="shareCardLink().then(() => { sharePopoverOpen = false; })"
                >
                  <UIcon name="i-lucide-share-2" class="size-5" />
                  <span>{{ t('share.shareCardLink') }}</span>
                </button>
                <button
                  type="button"
                  class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  @click="shareQRCode().then(() => { sharePopoverOpen = false; })"
                >
                  <UIcon name="i-lucide-qr-code" class="size-5" />
                  <span>{{ t('share.shareQRCode') }}</span>
                </button>
              </div>
            </div>
            <!-- Lien employé : pour les RH qui envoient le lien à l'employé (ex. Marco) -->
            <div v-if="isCreator" class="pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                @click="copyEmployeeLink(); sharePopoverOpen = false"
              >
                <UIcon name="i-lucide-user-cog" class="size-5" />
                <span>{{ t('share.copyEmployeeLink') }}</span>
              </button>
            </div>
          </div>
        </template>
      </UPopover>
      <!-- QR code (tous : créateur, employé, visiteur) : partager un QR qui mène vers une page où l'on peut partager (lien/image), télécharger et partager à son tour via QR. -->
      <UPopover :popper="{ placement: 'top' }">
        <button
          type="button"
          class="card-cta-icon"
          :title="t('action.showQR')"
        >
          <UIcon name="i-lucide-qr-code" class="size-5" />
        </button>
        <template #content>
          <div class="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg flex flex-col items-center gap-3">
            <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">{{ t('action.scanQR') }}</p>
            <div class="w-40 h-40 flex items-center justify-center bg-white p-2 rounded-lg">
              <QRCode :url="publicUrl || url" :card="{ ...urlCard, fax: FIXED_FAX }" />
            </div>
            <UButton
              size="sm"
              color="primary"
              variant="soft"
              :label="t('action.saveContact')"
              icon="i-lucide-user-plus"
              @click="qrRef?.downloadVCard()"
            />
          </div>
        </template>
      </UPopover>
      <button
        type="button"
        class="card-cta-icon"
        :title="t('action.downloadCard')"
        @click="downloadCardImage"
      >
        <UIcon name="i-lucide-id-card" class="size-5" />
      </button>
      <a
        v-if="(urlCard.mobile || FIXED_PHONE) && (urlCard.mobile !== '' || FIXED_PHONE !== '')"
        :href="`tel:${urlCard.mobile || '675878034'}`"
        class="card-cta-icon"
        :title="t('action.call')"
      >
        <UIcon name="i-lucide-phone" class="size-5" />
      </a>
      <a
        v-if="urlCard.email && urlCard.email !== ''"
        :href="`mailto:${urlCard.email}`"
        class="card-cta-icon"
        :title="t('action.sendEmail')"
      >
        <UIcon name="i-lucide-mail" class="size-5" />
      </a>
    </div>
  </div>
</template>
