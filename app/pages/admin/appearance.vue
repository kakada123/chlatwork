<script setup lang="ts">
import { KHMER_FONT_NAMES, type KhmerFont, type SiteAppearance } from "~/lib/site-appearance";

definePageMeta({ middleware: ["auth", "admin"] });
const { t } = useAppI18n();
useSeoMeta({ title: () => t("shared.pages_account.appearance"), robots: "noindex, nofollow" });
const { data } = useNuxtData<SiteAppearance>("site-appearance");
const draft = ref<KhmerFont>(data.value?.khmerFont ?? "google-sans");
watch(data, (saved) => { if (saved) draft.value = saved.khmerFont; });
const saving = ref(false);
const feedback = ref<"saved" | "failed" | null>(null);

async function save() {
  if (saving.value || !data.value) return;
  saving.value = true;
  feedback.value = null;
  try {
    data.value = await $fetch<SiteAppearance>("/api/appearance/admin", {
      method: "PUT", body: { khmerFont: draft.value },
    });
    feedback.value = "saved";
  } catch {
    feedback.value = "failed";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="mx-auto max-w-xl space-y-5 p-5">
    <NuxtLink to="/admin" class="text-sm underline">{{ t("shared.components_admin_activity_dashboard.admin") }}</NuxtLink>
    <h1>{{ t("shared.pages_account.appearance") }}</h1>
    <form class="space-y-4 rounded-xl border p-5" @submit.prevent="save">
      <label class="block font-semibold" for="khmer-font">{{ t("shared.admin_appearance.khmer_font") }}</label>
      <select id="khmer-font" v-model="draft" class="w-full rounded-lg border bg-transparent p-2" :disabled="saving || !data" @change="feedback = null">
        <option v-for="(name, key) in KHMER_FONT_NAMES" :key="key" :value="key">{{ name }}</option>
      </select>
      <p :data-khmer-font="draft" lang="km" class="font-khmer rounded-lg border p-4 text-lg">សួស្តី ChlatWork ១២៣</p>
      <template v-if="!data">
        <p role="alert">{{ t("shared.admin_appearance.load_failed") }}</p>
        <button type="button" class="underline" @click="refreshNuxtData('site-appearance')">{{ t("shared.common.try_again") }}</button>
      </template>
      <button v-else type="submit" class="rounded-lg bg-sky-700 px-4 py-2 text-white disabled:opacity-50" :disabled="saving || draft === data.khmerFont">
        {{ saving ? t("shared.common.saving") : t("shared.admin_appearance.save") }}
      </button>
      <p v-if="feedback" role="status">{{ feedback === "saved" ? t("shared.admin_appearance.saved") : t("shared.admin_appearance.failed") }}</p>
    </form>
  </main>
</template>
