<script lang="ts" setup>
import { useClipboard } from "#imports";
import type { Card } from "~~/types/card";
import VCard from "vcard-creator";

const { url = "waiting", card } = defineProps<{
  url?: string;
  card?: Card;
}>();

const { copy } = useClipboard({
  source: url,
  legacy: true,
});

const downloadSVG = () => {
  const svg = document.getElementById("QRcode") as HTMLElement;
  console.log(svg);
  const serializer = new XMLSerializer();
  let svgStr = serializer.serializeToString(svg);

  svgStr = svgStr.replace(/var\(--ui-text-highlighted\)/g, "white");

  const svgBlob = new Blob([svgStr], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();

  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pngUrl = canvas.toDataURL("image/webp");

    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = "qr-code.webp";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(svgUrl);
  };
  img.src = svgUrl;
};

const copyToClipboard = async () => {
  copy(url);
};

const downloadVCard = async () => {
  if (!card) {
    return;
  }

  const vcard = new VCard();

  vcard
    .addName(card.lName, card.fName)
    .addCompany(card.co as string)
    .addJobtitle(card.title as string)
    .addEmail(card.email as string)
    .addPhoneNumber(card.phone, "WORK");
  if (card.fax) {
    vcard.addPhoneNumber(card.fax, "WORK;FAX");
  }
  if (card.mobile) {
    vcard.addPhoneNumber(card.mobile, "CELL");
  }

  const vcardStr = vcard.toString();
  const blob = new Blob([vcardStr], { type: "text/vcard" });

  // Sur mobile : priorité au Web Share API pour ouvrir le formulaire contact (pas un téléchargement)
  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    const file = new File([blob], `${card.fName}_${card.lName}.vcf`, { type: "text/vcard" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${card.fName} ${card.lName}` });
        return;
      } catch (e) {
        // Utilisateur a annulé ou partage non supporté : on passe au fallback
      }
    }
  }

  // Fallback : data URL pour que le navigateur propose "Ouvrir avec / Ajouter au contact" au lieu de télécharger
  const dataUrl = "data:text/vcard;charset=utf-8," + encodeURIComponent(vcardStr);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.rel = "noopener";
  // Ne pas mettre d'attribut download : on veut ouvrir le flux contact, pas forcer le téléchargement
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

defineExpose({
  downloadSVG,
  copyToClipboard,
  downloadVCard,
});
</script>

<template>
  <div
    class="flex flex-col items-center place-items-center justify-center w-full"
  >
    <Qrcode id="QRcode" :value="url" class="w-[90%] h-[90%]" variant="circle" />
  </div>
</template>

<style></style>
