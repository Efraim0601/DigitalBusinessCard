<script setup lang="ts">
const router = useRouter();
const { t } = useAppLocale();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

async function go() {
  error.value = null;
  const trimmedEmail = email.value.trim();
  if (!trimmedEmail) return;
  const trimmedPassword = password.value.trim();

  if (trimmedPassword) {
    loading.value = true;
    try {
      await $fetch("/api/auth/admin/login", {
        method: "POST",
        body: { email: trimmedEmail, password: trimmedPassword },
      });
      password.value = "";
      await router.push("/admin/cards");
      return;
    } catch (e: any) {
      error.value = e?.data?.error || t("login.authFailed");
      return;
    } finally {
      loading.value = false;
    }
  }

  await router.push({
    path: "/card",
    query: { email: trimmedEmail },
  });
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-950 sm:bg-gradient-to-br sm:from-slate-950 sm:via-slate-900 sm:to-slate-950 px-3 sm:px-4 py-6">
    <NuxtPwaManifest />
    <div class="w-full max-w-md">
      <div class="rounded-3xl bg-white border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.35)] overflow-hidden">
        <div class="px-6 pt-6 pb-4 flex flex-col items-center">
          <div class="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <UIcon name="i-lucide-building-2" class="w-9 h-9 text-red-600" />
          </div>
          <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 text-center">
            {{ t('login.title') }}
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 mt-1 text-center tracking-wide uppercase">
            {{ t('login.subtitle') }}
          </p>

          <div class="w-full mt-6 rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-rose-50 p-4">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-red-600 mb-1">
              {{ t('login.employeePortal') }}
            </p>
            <p class="text-xs text-slate-600">
              {{ t('login.employeePortalDesc') }}
            </p>
          </div>

          <div class="w-full mt-6 text-left">
            <h2 class="text-sm font-semibold text-slate-900">
              {{ t('login.welcomeBack') }}
            </h2>
            <p class="text-[11px] text-slate-500 mt-1">
              {{ t('login.hint') }}
            </p>
          </div>
        </div>

        <form
          class="px-6 pb-6 flex flex-col gap-3"
          @submit.prevent="go"
        >
          <UFormField :label="t('login.emailLabel')" name="email" class="w-full">
            <UInput
              v-model="email"
              type="email"
              class="w-full"
              autocomplete="email"
              :placeholder="t('login.emailPlaceholder')"
            />
          </UFormField>
          <UFormField :label="t('login.passwordLabel')" name="password" class="w-full">
            <UInput
              v-model="password"
              type="password"
              class="w-full"
              autocomplete="current-password"
              :placeholder="t('login.passwordPlaceholder')"
            />
          </UFormField>
          <p class="text-[11px] text-slate-500 -mt-1">
            {{ t('login.passwordHint') }}
          </p>
          <p v-if="error" class="text-xs text-red-500">
            {{ error }}
          </p>

          <UButton
            type="submit"
            color="primary"
            :loading="loading"
            class="w-full mt-1 justify-center gap-2 font-semibold"
          >
            {{ t('login.submitButton') }}
            <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
          </UButton>

          <p class="mt-3 text-[10px] text-slate-400 text-center leading-relaxed">
            {{ t('login.footer', { year: String(new Date().getFullYear()) }) }}
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
