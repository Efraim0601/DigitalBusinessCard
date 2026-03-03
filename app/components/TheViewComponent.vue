<script lang="ts" setup>
import type { Card } from "~~/types/card";
import type { DropdownMenuItem } from "@nuxt/ui";
import { toPng } from "html-to-image";

const url = ref("waiting");
const appConfig = useAppConfig();
const qrRef = ref<{ downloadSVG: () => void; copyToClipboard: () => Promise<void>; downloadVCard: () => Promise<void> } | null>(null);
const cardContentRef = ref<HTMLElement | null>(null);
const copySuccess = ref(false);
const CARD_WIDTH = 600;
const CARD_HEIGHT = 340;
const cardScale = ref(1);
const updateScale = () => {
  const availableWidth = typeof window !== "undefined" ? Math.max(280, window.innerWidth - 24) : CARD_WIDTH;
  cardScale.value = Math.min(1, availableWidth / CARD_WIDTH);
};

const { urlCard } = defineProps<{
  urlCard: Card;
}>();

const company = computed(() => appConfig.company ?? {
  name: "Afriland First Bank",
  address: "Place de l'Indépendance",
  addressComplement: "B.P: 11834 Yaoundé - Cameroun",
  telex: "8907 KN",
  website: "www.afrilandfirstbank.com",
});

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
  return name ? `Carte de visite - ${name}` : "Carte de visite - Afriland First Bank";
});
const shareUrl = computed(() => {
  if (typeof window !== "undefined") return window.location.href;
  return url.value;
});
const shareText = computed(() => {
  const name = [urlCard.fName, urlCard.lName].filter(Boolean).join(" ");
  return name ? `Découvrez ma carte de visite : ${name}` : "Découvrez cette carte de visite.";
});

const sharePopoverOpen = ref(false);
/** True quand l’appareil expose le partage natif (Android/iOS ou navigateur avec Web Share API). */
const nativeShareAvailable = ref(false);

async function openShare() {
  const title = shareTitle.value;
  const text = shareText.value;
  const pageUrl = shareUrl.value;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title,
        text: `${text} ${pageUrl}`,
        url: pageUrl,
      });
      sharePopoverOpen.value = false;
      return;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      if (nativeShareAvailable.value) return;
    }
  }
  sharePopoverOpen.value = true;
}

function shareViaWhatsApp() {
  const u = encodeURIComponent(shareUrl.value);
  const t = encodeURIComponent(`${shareText.value} ${shareUrl.value}`);
  window.open(`https://wa.me/?text=${t}`, "_blank", "noopener,noreferrer");
  sharePopoverOpen.value = false;
}
function shareViaTelegram() {
  const u = encodeURIComponent(shareUrl.value);
  const t = encodeURIComponent(shareTitle.value);
  window.open(`https://t.me/share/url?url=${u}&text=${t}`, "_blank", "noopener,noreferrer");
  sharePopoverOpen.value = false;
}
function shareViaTwitter() {
  const u = encodeURIComponent(shareUrl.value);
  const t = encodeURIComponent(shareTitle.value);
  window.open(`https://twitter.com/intent/tweet?url=${u}&text=${t}`, "_blank", "noopener,noreferrer");
  sharePopoverOpen.value = false;
}
function shareViaLinkedIn() {
  const u = encodeURIComponent(shareUrl.value);
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${u}`, "_blank", "noopener,noreferrer");
  sharePopoverOpen.value = false;
}
function shareViaEmail() {
  const subj = encodeURIComponent(shareTitle.value);
  const body = encodeURIComponent(`${shareText.value}\n\n${shareUrl.value}`);
  window.location.href = `mailto:?subject=${subj}&body=${body}`;
  sharePopoverOpen.value = false;
}
async function shareViaCopyLink() {
  await copyLink();
  sharePopoverOpen.value = false;
}

const dropdownItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: "Partager",
      icon: "i-lucide-share-2",
      onSelect: () => openShare(),
    },
    {
      label: "Télécharger le QR code",
      icon: "i-lucide-download",
      onSelect: () => qrRef.value?.downloadSVG(),
    },
    {
      label: "Télécharger la carte de visite",
      icon: "i-lucide-id-card",
      onSelect: downloadCardImage,
    },
    {
      label: "Copier le lien",
      icon: "i-lucide-link",
      onSelect: () => copyLink(),
    },
  ],
]);

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
    await waitForImages(el);
    const dataUrl = await toPng(el, {
      cacheBust: true,
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      skipFonts: true,
    });
    const fileName = `carte-${[urlCard.fName, urlCard.lName].filter(Boolean).join("-") || "visite"}.png`;
    const link = document.createElement("a");
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch {
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

async function copyLink() {
  const getCurrentPageUrl = () => {
    if (typeof window !== "undefined") return window.location.href;
    if (typeof document !== "undefined") return document.URL;
    return url.value;
  };
  const linkToCopy = getCurrentPageUrl();
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(linkToCopy);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = linkToCopy;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2500);
  } catch (e) {
    // Last fallback: open native prompt with current URL.
    if (typeof window !== "undefined") window.prompt("Copiez ce lien :", linkToCopy);
    console.error("Copier le lien:", e);
  }
}

onMounted(() => {
  url.value = window.location.href;
  updateScale();
  window.addEventListener("resize", updateScale, { passive: true });
  nativeShareAvailable.value = typeof navigator !== "undefined" && !!navigator.share;
});

onBeforeUnmount(() => {
  if (typeof window !== "undefined") window.removeEventListener("resize", updateScale);
});
</script>

<template>
  <div class="flex flex-col items-center w-full gap-4 px-1 sm:px-0 touch-manipulation">
    <!-- QR code au-dessus de la carte + menu dropdown -->
    <div class="flex flex-col items-center w-full gap-3">
      <div class="flex flex-col items-center justify-center w-full bg-white/80 rounded-xl p-4 border border-zinc-200/80">
        <QRCode ref="qrRef" :url="url" :card="urlCard" />
      </div>
      <div class="flex flex-col items-center gap-2">
        <UDropdownMenu :items="dropdownItems">
          <UButton
            icon="i-lucide-ellipsis"
            variant="outline"
            color="primary"
            label="Options"
            trailing-icon="i-lucide-chevron-down"
          />
        </UDropdownMenu>
        <p v-if="copySuccess" class="text-sm text-(--ui-primary)">
          Lien copié dans le presse-papier.
        </p>
      </div>
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
        <!-- Partie capturée en image (sans les icônes en bas) -->
        <div
        ref="cardContentRef"
        class="business-card relative overflow-hidden border border-zinc-200 shadow-[0_4px_20px_rgba(0,0,0,0.15)] bg-white"
        >
          <div class="h-full flex flex-col px-8 pt-[18px] pb-5">
          <!-- Logo -->
          <div class="flex items-center mb-[14px]">
            <img
              v-if="company?.logo"
              :src="company.logo"
              alt="Afriland First Bank"
              width="320"
              height="74"
              class="w-[300px] h-[74px] object-cover object-left"
            />
            <div v-else class="flex items-baseline flex-wrap gap-1">
              <template v-if="company?.name">
                <span class="text-lg sm:text-xl font-bold text-[#1a1a1a] border-b-2 border-red-600">{{ company.name.split(" ")[0] }}</span>
                <span class="text-lg sm:text-xl font-bold text-[#1a1a1a]">{{ company.name.split(" ").slice(1).join(" ") }}</span>
              </template>
            </div>
          </div>

          <!-- Nom & titre -->
          <div class="mb-2">
            <h1 v-if="urlCard.fName || urlCard.lName" class="text-[20px] font-bold text-[#1a1a2e] leading-tight font-[Arial,Helvetica,sans-serif]">
              {{ [urlCard.fName, urlCard.lName].filter(Boolean).join(" ") }}
            </h1>
            <p v-if="urlCard.title && urlCard.title !== 'undefined'" class="text-sm font-bold text-[#333] mt-1 leading-[1.35] font-[Arial,Helvetica,sans-serif]">
              {{ urlCard.title }}
            </p>
          </div>

          <!-- Contact -->
          <div class="mt-1 flex justify-between items-end gap-4">
            <div class="text-[11px] text-[#222] leading-[1.7] font-[Arial,Helvetica,sans-serif]">
              <div v-if="company?.address" class="font-bold text-[11.5px]">{{ company.address }}</div>
              <table class="border-collapse">
                <tr v-if="company?.addressComplement">
                  <td class="pr-2 align-top text-[11px] leading-[1.55] text-[#333] whitespace-nowrap">B.P :</td>
                  <td class="align-top text-[11px] leading-[1.55]">{{ company.addressComplement.replace(/^B\.P:\s*/i, "") }}</td>
                </tr>
                <tr v-if="company?.telex">
                  <td class="pr-2 align-top text-[11px] leading-[1.55] text-[#333] whitespace-nowrap">Telex :</td>
                  <td class="align-top text-[11px] leading-[1.55]">{{ company.telex }}</td>
                </tr>
                <tr v-if="urlCard.email && urlCard.email !== ''">
                  <td class="pr-2 align-top text-[11px] leading-[1.55] text-[#333] whitespace-nowrap">E-mail :</td>
                  <td class="align-top text-[11px] leading-[1.55]">
                    <a :href="`mailto:${urlCard.email}`" class="text-[#222] hover:underline break-all">{{ urlCard.email }}</a>
                  </td>
                </tr>
                <tr v-if="company?.website">
                  <td class="pr-2 align-top text-[11px] leading-[1.55] text-[#333] whitespace-nowrap">Site Web :</td>
                  <td class="align-top text-[11px] leading-[1.55]">
                    <a :href="websiteUrl" target="_blank" rel="noopener noreferrer" class="text-[#222] hover:underline">
                      {{ company.website }}
                    </a>
                  </td>
                </tr>
              </table>
            </div>
            <div class="text-[11px] text-[#222] text-right font-[Arial,Helvetica,sans-serif]">
              <table class="border-collapse">
                <tr v-if="urlCard.phone && urlCard.phone !== ''">
                  <td class="pl-1.5 text-left text-[#333] text-[11px] leading-[1.55] whitespace-nowrap">Tél :</td>
                  <td class="pl-1.5 text-[11px] leading-[1.55] whitespace-nowrap">
                    <a :href="`tel:${urlCard.phone}`" class="text-[#222] hover:underline">{{ urlCard.phone }}</a>
                  </td>
                </tr>
                <tr v-if="urlCard.fax && urlCard.fax !== ''">
                  <td class="pl-1.5 text-left text-[#333] text-[11px] leading-[1.55] whitespace-nowrap">Fax :</td>
                  <td class="pl-1.5 text-[11px] leading-[1.55] whitespace-nowrap">
                    <a :href="`tel:${urlCard.fax}`" class="text-[#222] hover:underline">{{ urlCard.fax }}</a>
                  </td>
                </tr>
                <tr v-if="urlCard.mobile && urlCard.mobile !== ''">
                  <td class="pl-1.5 text-left text-[#333] text-[11px] leading-[1.55] whitespace-nowrap">Mob :</td>
                  <td class="pl-1.5 text-[11px] leading-[1.55] whitespace-nowrap">
                    <a :href="`tel:${urlCard.mobile}`" class="text-[#222] hover:underline">{{ urlCard.mobile }}</a>
                  </td>
                </tr>
              </table>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Boutons d'action : hors capture d'image -->
    <div class="card-cta-zone w-full max-w-2xl">
      <NuxtLink
        :to="editCardUrl"
        class="card-cta-icon"
        title="Mettre à jour les informations"
      >
        <UIcon name="i-lucide-pencil" class="size-5" />
      </NuxtLink>
      <!-- Sur Android/iOS : un clic ouvre directement le partage natif (Web Share API). -->
      <!-- Sur desktop sans partage natif : popover avec WhatsApp, Telegram, etc. -->
      <template v-if="nativeShareAvailable">
        <button
          type="button"
          class="card-cta-icon"
          title="Partager (lien et QR code)"
          @click="openShare"
        >
          <UIcon name="i-lucide-share-2" class="size-5" />
        </button>
      </template>
      <UPopover v-else v-model:open="sharePopoverOpen" :popper="{ placement: 'top' }">
        <button
          type="button"
          class="card-cta-icon"
          title="Partager (lien et QR code)"
          @click.stop.prevent="openShare"
        >
          <UIcon name="i-lucide-share-2" class="size-5" />
        </button>
        <template #content>
          <div class="p-3 min-w-[200px] bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg">
            <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Partager via</p>
            <div class="flex flex-col gap-1">
              <button
                type="button"
                class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                @click="shareViaWhatsApp"
              >
                <UIcon name="i-simple-icons-whatsapp" class="size-5 text-[#25D366]" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                @click="shareViaTelegram"
              >
                <UIcon name="i-simple-icons-telegram" class="size-5 text-[#26A5E4]" />
                <span>Telegram</span>
              </button>
              <button
                type="button"
                class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                @click="shareViaTwitter"
              >
                <UIcon name="i-simple-icons-x" class="size-5" />
                <span>X (Twitter)</span>
              </button>
              <button
                type="button"
                class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                @click="shareViaLinkedIn"
              >
                <UIcon name="i-simple-icons-linkedin" class="size-5 text-[#0A66C2]" />
                <span>LinkedIn</span>
              </button>
              <button
                type="button"
                class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                @click="shareViaEmail"
              >
                <UIcon name="i-lucide-mail" class="size-5" />
                <span>E-mail</span>
              </button>
              <button
                type="button"
                class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                @click="shareViaCopyLink"
              >
                <UIcon name="i-lucide-link" class="size-5" />
                <span>Copier le lien</span>
              </button>
            </div>
          </div>
        </template>
      </UPopover>
      <a
        v-if="urlCard.phone && urlCard.phone !== ''"
        :href="`tel:${urlCard.phone}`"
        class="card-cta-icon"
        title="Appeler"
      >
        <UIcon name="i-lucide-phone" class="size-5" />
      </a>
      <a
        v-if="urlCard.email && urlCard.email !== ''"
        :href="`mailto:${urlCard.email}`"
        class="card-cta-icon"
        title="Envoyer un email"
      >
        <UIcon name="i-lucide-mail" class="size-5" />
      </a>
    </div>
  </div>
</template>
