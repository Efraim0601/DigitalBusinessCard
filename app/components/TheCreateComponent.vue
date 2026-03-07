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
  const faxStr = newCard.value.fax ? `&fax=${encodeURIComponent(newCard.value.fax)}` : "";
  const mobileStr = newCard.value.mobile ? `&mobile=${encodeURIComponent(newCard.value.mobile)}` : "";
  return `${baseURL.value}?color=${
    appConfig.ui.colors.primary
  }&type=view&fName=${formatFName()}&lName=${formatLName()}&email=${
    newCard.value.email
  }&phone=${formatPhone()}${faxStr}${mobileStr}&co=${formatCompany()}&title=${formatTitle()}`;
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
  baseURL.value = `${window.location.origin}${window.location.pathname}`;
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
      <UFormField :label="t('create.fax')" name="fax" class="w-full">
        <UInput v-model="newCard.fax" type="tel" class="w-full" />
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

<style></style>
