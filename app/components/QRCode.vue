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

/** Retourne le QR code (vers l’URL de la carte) sous forme de fichier PNG pour partage. */
const getQRAsFile = (): Promise<File | null> => {
  return new Promise((resolve) => {
    const svg = document.getElementById("QRcode") as SVGSVGElement | null;
    if (!svg) {
      resolve(null);
      return;
    }
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
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(svgUrl);
          resolve(blob ? new File([blob], "qr-code-carte.png", { type: "image/png" }) : null);
        },
        "image/png",
        1
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      resolve(null);
    };
    img.src = svgUrl;
  });
};

const downloadSVG = () => {
  const svg = document.getElementById("QRcode") as HTMLElement;
  if (!svg) return;
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

  const blob = new Blob([vcard.toString()], { type: "text/vcard" });
  const vcardUrl = URL.createObjectURL(blob);

  const tryAddToContacts = () => {
    const a = document.createElement("a");
    a.href = vcardUrl;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(vcardUrl), 500);
  };

  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    const file = new File([blob], `${card.fName}_${card.lName}.vcf`, { type: "text/vcard" });
    if (navigator.canShare({ files: [file] })) {
      navigator
        .share({ files: [file], title: `${card.fName} ${card.lName}` })
        .then(() => URL.revokeObjectURL(vcardUrl))
        .catch(() => tryAddToContacts());
      return;
    }
  }
  tryAddToContacts();
};

defineExpose({
  downloadSVG,
  copyToClipboard,
  downloadVCard,
  getQRAsFile,
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
