<script lang="ts" setup>
import type { Card } from "~~/types/card";

const appConfig = useAppConfig();
const router = useRouter();

// Origin disponible côté client dès le premier rendu (évite lien vide avant onMounted)
const origin = ref(import.meta.client ? window.location.origin : "");

const newCard = ref<Card>({
  color: appConfig.ui.colors.primary,
  fName: "",
  lName: "",
  email: "",
  phone: "",
  fax: "",
  mobile: "",
  co: "",
  title: "",
});

/** Query pour la page "View" (navigation et URL du QR code) */
const viewQuery = computed(() => {
  const c = newCard.value;
  const q: Record<string, string> = {
    color: String(appConfig.ui.colors.primary),
    type: "view",
    fName: c.fName ?? "",
    lName: c.lName ?? "",
    email: (c.email ?? "").replace(/\s/g, ""),
    phone: c.phone ?? "",
    co: c.co ?? "",
    title: c.title ?? "",
  };
  if (c.fax) q.fax = c.fax;
  if (c.mobile) q.mobile = c.mobile;
  return q;
});

/** URL complète pour le QR code et le partage (même que la cible du NuxtLink) */
const url = computed(() => {
  if (!origin.value) return "";
  const resolved = router.resolve({ path: "/", query: viewQuery.value });
  return origin.value + resolved.fullPath;
});

const formatEmail = () => {
  if (newCard.value.email) {
    newCard.value.email = newCard.value.email.replace(/ /g, "");
  }
};
const formatPhone = () => {
  if (newCard.value.phone) {
    return newCard.value.phone.replace(/ /g, "%20");
  }
};
const formatCompany = () => {
  if (newCard.value.co) {
    return newCard.value.co.replace(/ /g, "%20");
  }
};
const formatTitle = () => {
  if (newCard.value.title) {
    return newCard.value.title.replace(/ /g, "%20");
  }
};
const formatFName = () => {
  if (newCard.value.fName) {
    return newCard.value.fName.replace(/ /g, "%20");
  }
};
const formatLName = () => {
  if (newCard.value.lName) {
    return newCard.value.lName.replace(/ /g, "%20");
  }
};

watch(
  () => appConfig.ui.colors.primary,
  (newColor) => {
    newCard.value.color = newColor;
  }
);

onMounted(() => {
  if (!origin.value) origin.value = window.location.origin;
});
</script>

<template>
  <div class="flex flex-col justify-between gap-4 w-full mt-12">
    <QRCode :url />
    <h1 class="font-bold text-5xl text-(--ui-primary)">Create A Card</h1>

    <UForm
      :state="newCard"
      class="w-full flex flex-col gap-3"
      @submit="console.log('NewCard:', newCard)"
    >
      <UFormField label="First Name" name="fName" class="w-full">
        <UInput v-model="newCard.fName" class="w-full" />
      </UFormField>
      <UFormField label="Last Name" name="lName" class="w-full">
        <UInput v-model="newCard.lName" class="w-full" />
      </UFormField>
      <UFormField label="Company" name="co" class="w-full">
        <UInput v-model="newCard.co" class="w-full" />
      </UFormField>
      <UFormField label="Title" name="title" class="w-full">
        <UInput v-model="newCard.title" class="w-full" />
      </UFormField>
      <UFormField label="Email" name="email" class="w-full">
        <UInput v-model="newCard.email" class="w-full" @change="formatEmail" />
      </UFormField>
      <UFormField label="Phone" name="phone" class="w-full">
        <UInput
          v-model="newCard.phone"
          type="tel"
          label="Phone"
          name="phone"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Fax" name="fax" class="w-full">
        <UInput v-model="newCard.fax" type="tel" class="w-full" />
      </UFormField>
      <UFormField label="Mobile" name="mobile" class="w-full">
        <UInput v-model="newCard.mobile" type="tel" class="w-full" />
      </UFormField>

      <NuxtLink :to="{ path: '/', query: viewQuery }" class="inline-block">
        <UButton label="View Your Card" />
      </NuxtLink>
    </UForm>
  </div>
</template>

<style></style>
