<script lang="ts" setup>
import type { Card } from "~~/types/card";

const appConfig = useAppConfig();
const { t } = useAppLocale();
const route = useRoute();
const baseURL = ref("");

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

const url = computed(() => {
  const params = new URLSearchParams();
  params.set("color", String(appConfig.ui.colors.primary));
  params.set("type", "view");
  if (newCard.value.fName) params.set("fName", newCard.value.fName.trim());
  if (newCard.value.lName) params.set("lName", newCard.value.lName.trim());
  if (newCard.value.email) params.set("email", newCard.value.email.trim());
  if (newCard.value.phone) params.set("phone", newCard.value.phone.trim());
  if (newCard.value.fax) params.set("fax", newCard.value.fax.trim());
  if (newCard.value.mobile) params.set("mobile", newCard.value.mobile.trim());
  if (newCard.value.co) params.set("co", newCard.value.co.trim());
  if (newCard.value.title) params.set("title", newCard.value.title.trim());
  const qs = params.toString();
  return qs ? `${baseURL.value}?${qs}` : baseURL.value;
});

const formatEmail = () => {
  if (newCard.value.email) {
    newCard.value.email = newCard.value.email.replaceAll(" ", "");
  }
};

watch(
  () => appConfig.ui.colors.primary,
  (newColor) => {
    newCard.value.color = newColor;
    console.log("Color Changed!");
  }
);

const getQueryValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const hydrateFromQuery = () => {
  const query = route.query;

  newCard.value.fName = getQueryValue(query.fName);
  newCard.value.lName = getQueryValue(query.lName);
  newCard.value.co = getQueryValue(query.co);
  newCard.value.title = getQueryValue(query.title);
  newCard.value.email = getQueryValue(query.email);
  newCard.value.phone = getQueryValue(query.phone);
  newCard.value.fax = getQueryValue(query.fax);
  newCard.value.mobile = getQueryValue(query.mobile);

  const color = getQueryValue(query.color);
  if (color) {
    newCard.value.color = color;
    appConfig.ui.colors.primary = color;
  }
};

onMounted(() => {
  baseURL.value = `${globalThis.location?.origin ?? ""}${globalThis.location?.pathname ?? ""}`;
});

watch(
  () => route.query,
  () => hydrateFromQuery(),
  { immediate: true }
);
</script>

<template>
  <div class="flex flex-col justify-between gap-4 w-full mt-12">
    <QRCode :url />
    <h1 class="font-bold text-5xl text-(--ui-primary)">{{ t('create.title') }}</h1>

    <UForm
      :state="newCard"
      class="w-full flex flex-col gap-3"
      @submit="console.log('NewCard:', newCard)"
    >
      <UFormField :label="t('create.firstName')" name="fName" class="w-full">
        <UInput v-model="newCard.fName" class="w-full" />
      </UFormField>
      <UFormField :label="t('create.lastName')" name="lName" class="w-full">
        <UInput v-model="newCard.lName" class="w-full" />
      </UFormField>
      <UFormField :label="t('create.company')" name="co" class="w-full">
        <UInput v-model="newCard.co" class="w-full" />
      </UFormField>
      <UFormField :label="t('create.titleField')" name="title" class="w-full">
        <UInput v-model="newCard.title" class="w-full" />
      </UFormField>
      <UFormField :label="t('create.email')" name="email" class="w-full">
        <UInput v-model="newCard.email" class="w-full" @change="formatEmail" />
      </UFormField>
      <UFormField :label="t('create.phone')" name="phone" class="w-full">
        <UInput
          v-model="newCard.phone"
          type="tel"
          :label="t('create.phone')"
          name="phone"
          class="w-full"
        />
      </UFormField>
            <UFormField :label="t('create.mobile')" name="mobile" class="w-full">
        <UInput v-model="newCard.mobile" type="tel" class="w-full" />
      </UFormField>

      <a :href="`${url}${url.includes('?') ? '&' : '?'}owner=1`">
        <UButton :label="t('create.viewCard')" />
      </a>
    </UForm>
  </div>
</template>
