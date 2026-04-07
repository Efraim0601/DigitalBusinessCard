<script setup lang="ts">
const router = useRouter();
const { t } = useAppLocale();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref<string | null>(null);
/** Affiché uniquement après détection email admin (indice serveur). */
const showAdminPassword = ref(false);

async function go() {
  error.value = null;
  const trimmedEmail = email.value.trim();
  if (!trimmedEmail) {
    error.value = t("card.emailRequired");
    return;
  }

  loading.value = true;
  try {
    const hint = await $fetch<{ isAdminEmail: boolean; hasCard: boolean }>("/api/auth/login-hint", {
      query: { email: trimmedEmail },
    });

    if (hint.isAdminEmail) {
      const trimmedPassword = password.value.trim();
      if (!trimmedPassword) {
        showAdminPassword.value = true;
        error.value = t("login.adminPasswordRequired");
        return;
      }
      await $fetch("/api/auth/admin/login", {
        method: "POST",
        body: { email: trimmedEmail, password: trimmedPassword },
      });
      password.value = "";
      showAdminPassword.value = false;
      await router.push("/admin/cards");
      return;
    }

    showAdminPassword.value = false;
    password.value = "";
    await router.push({
      path: "/card",
      query: { email: trimmedEmail },
    });
  } catch (e: unknown) {
    const payload = e as { data?: { error?: string } };
    error.value = payload?.data?.error ?? t("login.authFailed");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center justify-center bg-white px-4 py-10 sm:py-14 text-zinc-900"
  >
    <div class="w-full max-w-[420px] flex flex-col items-stretch">
      <header class="flex flex-col items-center text-center mb-6">
        <div
          class="w-14 h-14 rounded-xl bg-red-600 flex items-center justify-center shadow-sm mb-4"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-building-2" class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-zinc-900 tracking-tight">
          {{ t("login.title") }}
        </h1>
        <p
          class="mt-2 text-[11px] sm:text-xs font-medium text-zinc-500 uppercase tracking-[0.18em] max-w-sm"
        >
          {{ t("login.subtitle") }}
        </p>
      </header>

      <div
        class="mb-6 rounded-xl border border-red-200 bg-[#fff5f5] px-4 py-3.5"
        role="status"
      >
        <p class="text-sm text-red-600 leading-snug">
          <span class="font-bold">{{ t("login.employeePortal") }}</span>
          <span> – {{ t("login.employeePortalBanner") }}</span>
        </p>
      </div>

      <div
        class="rounded-2xl bg-white border border-zinc-200/90 shadow-[0_8px_30px_rgba(15,23,42,0.08)] px-6 py-6 sm:px-7 sm:py-7"
      >
        <h2 class="text-lg font-bold text-zinc-900">
          {{ t("login.welcomeBack") }}
        </h2>
        <p class="mt-2 text-sm text-zinc-600 leading-relaxed">
          {{ showAdminPassword ? t("login.hintAdminStep") : t("login.hint") }}
        </p>

        <form class="mt-6 flex flex-col gap-4" @submit.prevent="go">
          <UFormField
            :label="t('login.emailLabel')"
            name="email"
            class="w-full"
            :ui="{ label: 'text-sm font-semibold text-zinc-800' }"
          >
            <UInput
              v-model="email"
              type="email"
              leading-icon="i-lucide-mail"
              variant="subtle"
              color="neutral"
              size="lg"
              class="w-full"
              :ui="{
                base: 'bg-zinc-100 ring-1 ring-inset ring-zinc-200/90 placeholder:text-zinc-400 focus-visible:ring-zinc-300',
              }"
              autocomplete="email"
              :placeholder="t('login.emailPlaceholder')"
            />
          </UFormField>
          <template v-if="showAdminPassword">
            <UFormField
              :label="t('login.adminSecretLabel')"
              name="password"
              class="w-full"
              :ui="{ label: 'text-sm font-semibold text-zinc-800' }"
            >
              <UInput
                v-model="password"
                type="password"
                variant="subtle"
                color="neutral"
                size="lg"
                class="w-full"
                :ui="{
                  base: 'bg-zinc-100 ring-1 ring-inset ring-zinc-200/90 focus-visible:ring-zinc-300',
                }"
                autocomplete="current-password"
                :placeholder="t('login.adminSecretPlaceholder')"
              />
            </UFormField>
            <p class="text-xs text-zinc-500 -mt-1">
              {{ t("login.adminSecretHint") }}
            </p>
          </template>
          <p v-if="error" class="text-sm text-red-600">
            {{ error }}
          </p>

          <UButton
            type="submit"
            color="primary"
            size="lg"
            :loading="loading"
            class="w-full mt-1 justify-center gap-2 font-semibold rounded-xl py-3"
          >
            {{ t("login.submitButton") }}
            <UIcon name="i-lucide-arrow-right" class="w-4 h-4 shrink-0" />
          </UButton>

          <p class="mt-2 text-[11px] text-zinc-400 text-center leading-relaxed">
            {{ t("login.footer", { year: String(new Date().getFullYear()) }) }}
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
