<script lang="ts" setup>
import type { Card } from "~~/types/card";
import type { DropdownMenuItem } from "@nuxt/ui";
import { toPng } from "html-to-image";

const url = ref("waiting");
const appConfig = useAppConfig();
const qrRef = ref<{ downloadSVG: () => void; copyToClipboard: () => Promise<void>; downloadVCard: () => Promise<void> } | null>(null);
const cardRef = ref<HTMLElement | null>(null);
const copySuccess = ref(false);

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
      label: "Ajouter aux contacts (.vcf)",
      icon: "i-lucide-square-user-round",
      onSelect: () => qrRef.value?.downloadVCard(),
    },
    {
      label: "Copier le lien",
      icon: "i-lucide-link",
      onSelect: async () => {
        await qrRef.value?.copyToClipboard();
        copySuccess.value = true;
        setTimeout(() => { copySuccess.value = false; }, 2500);
      },
    },
  ],
]);

async function downloadCardImage() {
  if (!cardRef.value) return;
  try {
    const dataUrl = await toPng(cardRef.value, { cacheBust: true, backgroundColor: "#ffffff" });
    const { jsPDF } = await import("jspdf");
    // Format carte de visite standard (paysage) : 90 x 55 mm max
    const maxWidthMm = 90;
    const maxHeightMm = 55;
    const el = cardRef.value;
    const ratio = el.offsetWidth / el.offsetHeight;
    const cardWidthMm = ratio >= maxWidthMm / maxHeightMm ? maxWidthMm : maxHeightMm * ratio;
    const cardHeightMm = ratio >= maxWidthMm / maxHeightMm ? maxWidthMm / ratio : maxHeightMm;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [cardWidthMm, cardHeightMm],
      hotfixes: ["px_scaling"],
    });
    doc.addImage(dataUrl, "PNG", 0, 0, cardWidthMm, cardHeightMm);
    const fileName = `carte-${[urlCard.fName, urlCard.lName].filter(Boolean).join("-") || "visite"}.pdf`;
    doc.save(fileName);
  } catch (e) {
    console.error("Export carte PDF:", e);
  }
}

onMounted(() => {
  url.value = window.location.href;
});
</script>

<template>
  <div class="flex flex-col items-center w-full max-w-lg gap-4">
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

    <!-- Carte de visite : fond blanc, visuel identique à la référence -->
    <div
      ref="cardRef"
      class="relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
    >
      <!-- Motif watermark discret à droite (forme géométrique légère) -->
      <div
        class="absolute right-0 top-0 bottom-0 w-28 bg-[linear-gradient(135deg,transparent_45%,rgba(0,0,0,0.03)_50%,transparent_55%)] bg-[length:20px_20px] pointer-events-none"
        aria-hidden="true"
      />

      <div class="relative px-5 pt-5 pb-5">
        <!-- En-tête : logo Afriland (taille visible sur toutes les cartes) -->
        <div class="flex items-center gap-3 pb-3">
          <NuxtImg
            v-if="company?.logo"
            :src="company.logo"
            alt="Afriland First Bank"
            width="220"
            height="56"
            class="h-14 w-auto min-h-[3.5rem] max-h-16 object-contain object-left"
          />
          <div v-else class="flex items-baseline flex-wrap gap-1">
            <template v-if="company?.name">
              <span class="text-xl font-bold text-black border-b-2 border-red-600">
                {{ company.name.split(" ")[0] }}
              </span>
              <span class="text-xl font-bold text-black">
                {{ company.name.split(" ").slice(1).join(" ") }}
              </span>
            </template>
          </div>
        </div>

        <!-- Nom et titre -->
        <div class="pb-4">
          <h1
            v-if="urlCard.fName || urlCard.lName"
            class="font-bold text-2xl text-black tracking-tight"
          >
            {{ [urlCard.fName, urlCard.lName].filter(Boolean).join(" ") }}
          </h1>
          <p
            v-if="urlCard.title && urlCard.title !== 'undefined'"
            class="text-sm text-black/80 mt-1"
          >
            {{ urlCard.title }}
          </p>
        </div>

        <!-- Deux colonnes : design identique à la carte de visite (libellés en gras, valeurs en normal) -->
        <div class="grid grid-cols-[1fr_1fr] gap-8 text-sm text-black/90 leading-snug">
          <!-- Colonne gauche : adresse, B.P., Telex, E-mail, Site Web -->
          <div class="flex flex-col gap-1.5">
            <p v-if="company?.address" class="font-bold">
              {{ company.address }}
            </p>
            <p v-if="company?.addressComplement">
              <span class="font-bold">B.P:</span> {{ company.addressComplement.replace(/^B\.P:\s*/i, "") }}
            </p>
            <p v-if="company?.telex">
              <span class="font-bold">Telex:</span> {{ company.telex }}
            </p>
            <p v-if="urlCard.email && urlCard.email !== ''">
              <span class="font-bold">E-mail:</span>
              <a :href="`mailto:${urlCard.email}`" class="text-black/90 hover:underline">{{ urlCard.email }}</a>
            </p>
            <p v-if="company?.website">
              <span class="font-bold">Site Web:</span>
              <a :href="websiteUrl" target="_blank" rel="noopener noreferrer" class="text-black/90 hover:underline">{{ company.website }}</a>
            </p>
          </div>
          <!-- Colonne droite : Tél, Fax, Mob -->
          <div class="flex flex-col gap-1.5">
            <p v-if="urlCard.phone && urlCard.phone !== ''">
              <span class="font-bold">Tél:</span>
              <a :href="`tel:${urlCard.phone}`" class="text-black/90 hover:underline">{{ urlCard.phone }}</a>
            </p>
            <p v-if="urlCard.fax && urlCard.fax !== ''">
              <span class="font-bold">Fax:</span>
              <a :href="`tel:${urlCard.fax}`" class="text-black/90 hover:underline">{{ urlCard.fax }}</a>
            </p>
            <p v-if="urlCard.mobile && urlCard.mobile !== ''">
              <span class="font-bold">Mob:</span>
              <a :href="`tel:${urlCard.mobile}`" class="text-black/90 hover:underline">{{ urlCard.mobile }}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
