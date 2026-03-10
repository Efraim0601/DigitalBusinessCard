<script setup lang="ts">
const router = useRouter();
const appConfig = useAppConfig();
const { t } = useAppLocale();

const email = ref("");
const password = ref("");

const adminEmail = computed(() => appConfig.admin?.email?.toLowerCase() ?? "");
const adminPassword = computed(() => appConfig.admin?.password ?? "adminabf@afrilandfirstbank.com");

function go() {
  const trimmedEmail = email.value.trim();
  const trimmedPassword = password.value.trim();
  if (!trimmedEmail) return;

  const lowerEmail = trimmedEmail.toLowerCase();

  if (trimmedPassword === adminPassword.value && adminEmail.value && lowerEmail === adminEmail.value) {
    router.push("/admin/cards");
    return;
  }

  router.push({
    path: "/card",
    query: { email: trimmedEmail },
  });
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-950 via-red-900 to-red-950 px-3 sm:px-4 py-6">
    <NuxtPwaManifest />
    <div class="w-full max-w-md">
      <div class="rounded-3xl bg-[#2b0505] border border-red-700/60 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden">
        <div class="px-6 pt-6 pb-4 flex flex-col items-center">
          <div class="w-16 h-16 rounded-2xl bg-red-800 flex items-center justify-center mb-4">
            <UIcon name="i-lucide-building-2" class="w-9 h-9 text-red-300" />
          </div>
          <h1 class="text-xl sm:text-2xl font-semibold text-white text-center">
            Afriland First Bank
          </h1>
          <p class="text-xs sm:text-sm text-red-200/80 mt-1 text-center">
            Digital Identity Portal
          </p>

          <div class="w-full mt-6 rounded-2xl border border-red-700/60 bg-gradient-to-br from-red-900/70 to-red-800/40 p-4">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-red-300 mb-1">
              Employee Portal
            </p>
            <p class="text-xs text-red-200/70">
              Access your digital business card and share it securely.
            </p>
          </div>

          <div class="w-full mt-6 text-left">
            <h2 class="text-sm font-semibold text-white">
              Welcome back
            </h2>
            <p class="text-[11px] text-red-100/70 mt-1">
              Enter your corporate email to access your digital business card.
              HR can use the admin email with the admin password to manage all cards.
            </p>
          </div>
        </div>

        <form
          class="px-6 pb-6 flex flex-col gap-3"
          @submit.prevent="go"
        >
          <UFormField label="Corporate email" name="email" class="w-full">
            <UInput
              v-model="email"
              type="email"
              class="w-full"
              autocomplete="email"
              placeholder="e.g. name@afrilandfirstbank.com"
            />
          </UFormField>

          <UFormField label="Password" name="password" class="w-full">
            <UInput
              v-model="password"
              type="password"
              class="w-full"
              autocomplete="current-password"
              placeholder="••••••••••"
            />
          </UFormField>

          <UButton
            type="submit"
            color="primary"
            class="w-full mt-1 justify-center gap-2 font-semibold"
          >
            View My Card
            <UIcon name="i-lucide-arrow-right" class="w-4 h-4" />
          </UButton>

          <p class="mt-3 text-[10px] text-red-100/60 text-center leading-relaxed">
            Secure access for authorized personnel only.
            © {{ new Date().getFullYear() }} Afriland First Bank Group.
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
