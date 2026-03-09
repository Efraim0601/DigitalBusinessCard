<script setup lang="ts">
const cards = ref<any[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const editing = ref<any | null>(null);

async function loadCards() {
  loading.value = true;
  error.value = null;
  try {
    const res = await $fetch("/api/cards");
    cards.value = Array.isArray(res) ? res : [];
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

function startCreate() {
  editing.value = {
    id: null,
    email: "",
    first_name: "",
    last_name: "",
    company: "",
    title: "",
    phone: "",
    fax: "",
    mobile: "",
  };
}

function startEdit(card: any) {
  editing.value = { ...card };
}

async function saveCard() {
  if (!editing.value) return;
  const payload = {
    email: editing.value.email,
    first_name: editing.value.first_name,
    last_name: editing.value.last_name,
    company: editing.value.company,
    title: editing.value.title,
    phone: editing.value.phone,
    fax: editing.value.fax,
    mobile: editing.value.mobile,
  };
  try {
    if (editing.value.id) {
      await $fetch(`/api/cards/${editing.value.id}`, {
        method: "PUT",
        body: payload,
      });
    } else {
      await $fetch("/api/cards", {
        method: "POST",
        body: payload,
      });
    }
    editing.value = null;
    await loadCards();
  } catch (e) {
    console.error(e);
  }
}

async function removeCard(card: any) {
  if (!card.id) return;
  if (!confirm(`Supprimer la carte de ${card.first_name ?? ""} ${card.last_name ?? ""} ?`)) return;
  try {
    await $fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    await loadCards();
  } catch (e) {
    console.error(e);
  }
}

onMounted(() => {
  loadCards();
});
</script>

<template>
  <div class="min-h-screen px-4 py-6 sm:px-8">
    <h1 class="text-2xl font-bold mb-4">Gestion des cartes de visite</h1>

    <div class="mb-4 flex items-center gap-3">
      <UButton color="primary" variant="soft" @click="startCreate">
        Créer une carte
      </UButton>
      <span v-if="loading" class="text-sm text-zinc-500">Chargement…</span>
      <span v-if="error" class="text-sm text-red-500">{{ error }}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[2fr,1.2fr] gap-6">
      <div class="overflow-x-auto border border-zinc-200 rounded-xl bg-white dark:bg-zinc-900">
        <table class="min-w-full text-sm">
          <thead class="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th class="px-3 py-2 text-left font-semibold">Email</th>
              <th class="px-3 py-2 text-left font-semibold">Nom</th>
              <th class="px-3 py-2 text-left font-semibold">Entreprise</th>
              <th class="px-3 py-2 text-left font-semibold">Titre</th>
              <th class="px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="card in cards"
              :key="card.id"
              class="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer"
              @click="startEdit(card)"
            >
              <td class="px-3 py-2">{{ card.email }}</td>
              <td class="px-3 py-2">
                {{ [card.first_name, card.last_name].filter(Boolean).join(" ") }}
              </td>
              <td class="px-3 py-2">{{ card.company }}</td>
              <td class="px-3 py-2">{{ card.title }}</td>
              <td class="px-3 py-2 text-right">
                <UButton
                  color="red"
                  variant="ghost"
                  size="xs"
                  @click.stop="removeCard(card)"
                >
                  Supprimer
                </UButton>
              </td>
            </tr>
            <tr v-if="!loading && cards.length === 0">
              <td colspan="5" class="px-3 py-4 text-center text-sm text-zinc-500">
                Aucune carte créée pour le moment.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="border border-zinc-200 rounded-xl bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h2 class="text-lg font-semibold mb-1">
          {{ editing?.id ? "Modifier une carte" : "Créer une carte" }}
        </h2>
        <p class="text-xs text-zinc-500 mb-2">
          Les RH peuvent créer ou mettre à jour les cartes. L'employé y accède via son email uniquement.
        </p>

        <div v-if="editing" class="space-y-2">
          <UFormField label="Email" required>
            <UInput v-model="editing.email" type="email" />
          </UFormField>
          <UFormField label="Prénom">
            <UInput v-model="editing.first_name" />
          </UFormField>
          <UFormField label="Nom">
            <UInput v-model="editing.last_name" />
          </UFormField>
          <UFormField label="Entreprise">
            <UInput v-model="editing.company" />
          </UFormField>
          <UFormField label="Titre / Poste">
            <UInput v-model="editing.title" />
          </UFormField>
          <UFormField label="Téléphone">
            <UInput v-model="editing.phone" />
          </UFormField>
          <UFormField label="Fax">
            <UInput v-model="editing.fax" />
          </UFormField>
          <UFormField label="Mobile">
            <UInput v-model="editing.mobile" />
          </UFormField>

          <div class="flex gap-2 pt-2">
            <UButton color="primary" @click="saveCard">
              Enregistrer
            </UButton>
            <UButton variant="ghost" @click="editing = null">
              Annuler
            </UButton>
          </div>
        </div>

        <p v-else class="text-sm text-zinc-500">
          Sélectionnez une carte dans la liste ou cliquez sur « Créer une carte ».
        </p>
      </div>
    </div>
  </div>
</template>

