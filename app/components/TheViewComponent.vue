<script lang="ts" setup>
import type { Card } from "~~/types/card";
import type { DropdownMenuItem } from "@nuxt/ui";
import { toPng } from "html-to-image";

const url = ref("waiting");
const appConfig = useAppConfig();
const qrRef = ref<{ downloadSVG: () => void; copyToClipboard: () => Promise<void>; downloadVCard: () => Promise<void> } | null>(null);
const cardContentRef = ref<HTMLElement | null>(null);
const copySuccess = ref(false);
const CARD_WIDTH = 900;
const CARD_HEIGHT = 550;
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
  website: "www.afrilandfirstbank.com",
});

const websiteUrl = computed(() => {
  const w = company.value?.website ?? "";
  return w.startsWith("http") ? w : `https://${w}`;
});

const dropdownItems = computed<DropdownMenuItem[][]>(() => [
  [
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
      label: "Ajouter aux contacts",
      icon: "i-lucide-square-user-round",
      onSelect: () => qrRef.value?.downloadVCard(),
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
      backgroundColor: "#f2f2f0",
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
  const linkToCopy = typeof window !== "undefined" ? window.location.href : url.value;
  try {
    if (navigator.clipboard?.writeText) {
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
    console.error("Copier le lien:", e);
  }
}

onMounted(() => {
  url.value = window.location.href;
  updateScale();
  window.addEventListener("resize", updateScale, { passive: true });
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
        class="business-card card-visite-bg relative overflow-hidden rounded-xl border border-zinc-200 shadow-md"
        style="background-color: #f2f2f0;"
        >
          <div class="card-visite-watermark" aria-hidden="true" />
          <div class="relative px-8 pt-8 pb-8">
          <!-- En-tête : logo Afriland + soulignement rouge -->
          <div class="flex items-center gap-3 pb-8">
            <img
              v-if="company?.logo"
              :src="company.logo"
              alt="Afriland First Bank"
              width="320"
              height="100"
              class="h-[6.25rem] w-auto min-h-[5rem] max-h-28 object-contain object-left"
            />
            <div v-else class="flex items-baseline flex-wrap gap-1">
              <template v-if="company?.name">
                <span class="text-lg sm:text-xl font-bold text-[#1a1a1a] border-b-2 border-red-600">{{ company.name.split(" ")[0] }}</span>
                <span class="text-lg sm:text-xl font-bold text-[#1a1a1a]">{{ company.name.split(" ").slice(1).join(" ") }}</span>
              </template>
            </div>
          </div>
          <!-- Nom (gros, gras) et titre (régulier, plus petit) avec espacement marqué -->
          <div class="pb-10">
            <h1 v-if="urlCard.fName || urlCard.lName" class="text-2xl font-bold text-[#1a1a1a] tracking-tight leading-tight">
              {{ [urlCard.fName, urlCard.lName].filter(Boolean).join(" ") }}
            </h1>
            <p v-if="urlCard.title && urlCard.title !== 'undefined'" class="text-base text-[#333] font-normal mt-2 leading-snug">
              {{ urlCard.title }}
            </p>
          </div>
          <!-- Coordonnées : deux colonnes comme la référence (y compris sur mobile) -->
          <div class="grid grid-cols-2 gap-x-10 gap-y-3 text-sm text-[#1a1a1a] leading-[1.45]">
            <div class="flex flex-col gap-3 min-w-0">
              <p v-if="company?.address" class="font-semibold break-words">{{ company.address }}</p>
              <p v-if="company?.addressComplement" class="flex flex-wrap items-baseline gap-x-1 min-w-0">
                <span class="font-semibold shrink-0 whitespace-nowrap">B.P:</span>
                <span class="font-normal break-words">{{ company.addressComplement.replace(/^B\.P:\s*/i, "") }}</span>
              </p>
              <p v-if="urlCard.email && urlCard.email !== ''" class="flex flex-wrap items-baseline gap-x-1 min-w-0">
                <span class="font-semibold shrink-0 whitespace-nowrap">E-mail:</span>
                <a :href="`mailto:${urlCard.email}`" class="font-normal text-[#1a1a1a] hover:underline break-all">{{ urlCard.email }}</a>
              </p>
              <p v-if="company?.website" class="flex flex-wrap items-baseline gap-x-1 min-w-0">
                <span class="font-semibold shrink-0 whitespace-nowrap">Site Web:</span>
                <a :href="websiteUrl" target="_blank" rel="noopener noreferrer" class="font-normal text-[#1a1a1a] hover:underline break-all">{{ company.website }}</a>
              </p>
            </div>
            <div class="flex flex-col gap-3 min-w-0">
              <p v-if="urlCard.phone && urlCard.phone !== ''" class="flex flex-wrap items-baseline gap-x-1 min-w-0">
                <span class="font-semibold shrink-0 whitespace-nowrap">Tél:</span>
                <a :href="`tel:${urlCard.phone}`" class="font-normal text-[#1a1a1a] hover:underline whitespace-nowrap">{{ urlCard.phone }}</a>
              </p>
              <p v-if="urlCard.fax && urlCard.fax !== ''" class="flex flex-wrap items-baseline gap-x-1 min-w-0">
                <span class="font-semibold shrink-0 whitespace-nowrap">Fax:</span>
                <a :href="`tel:${urlCard.fax}`" class="font-normal text-[#1a1a1a] hover:underline whitespace-nowrap">{{ urlCard.fax }}</a>
              </p>
              <p v-if="urlCard.mobile && urlCard.mobile !== ''" class="flex flex-wrap items-baseline gap-x-1 min-w-0">
                <span class="font-semibold shrink-0 whitespace-nowrap">Mob:</span>
                <a :href="`tel:${urlCard.mobile}`" class="font-normal text-[#1a1a1a] hover:underline whitespace-nowrap">{{ urlCard.mobile }}</a>
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Boutons d'action : hors capture d'image -->
    <div
      v-if="(urlCard.phone || urlCard.mobile || urlCard.email) && (urlCard.phone !== '' || urlCard.mobile !== '' || urlCard.email !== '')"
      class="pt-4 pb-4 px-4 sm:px-5 border border-zinc-200/80 flex flex-wrap items-center justify-center gap-3 sm:gap-4 bg-zinc-50/50 rounded-xl w-full max-w-2xl"
    >
      <a
        v-if="urlCard.phone && urlCard.phone !== ''"
        :href="`tel:${urlCard.phone}`"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-(--ui-primary) hover:text-white text-zinc-700 text-sm font-medium transition-colors"
        title="Appeler"
      >
        <UIcon name="i-lucide-phone" class="size-5" />
        <span>Appeler</span>
      </a>
      <button
        v-if="urlCard.mobile && urlCard.mobile !== ''"
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-(--ui-primary) hover:text-white text-zinc-700 text-sm font-medium transition-colors"
        title="Ajouter aux contacts"
        @click="qrRef?.downloadVCard()"
      >
        <UIcon name="i-lucide-smartphone" class="size-5" />
        <span>Ajouter aux contacts</span>
      </button>
      <a
        v-if="urlCard.email && urlCard.email !== ''"
        :href="`mailto:${urlCard.email}`"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-(--ui-primary) hover:text-white text-zinc-700 text-sm font-medium transition-colors"
        title="Envoyer un email"
      >
        <UIcon name="i-lucide-mail" class="size-5" />
        <span>Envoyer un email</span>
      </a>
    </div>
  </div>
</template>
