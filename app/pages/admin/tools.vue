<script setup lang="ts">
type FeatureRow = {
  key: string;
  label: string;
  group: string;
  enabled: boolean;
  updatedAt: string | null;
};

definePageMeta({ middleware: ["auth", "admin"] });
useSeoMeta({
  title: "Tool availability | ChlatWork Admin",
  robots: "noindex, nofollow",
});

const { data, pending, error } = await useFetch<FeatureRow[]>(
  "/api/feature-availability/admin",
);
const { refresh: refreshPublic } = useFeatureAvailability();
const draft = reactive<Record<string, boolean>>({});
const saving = ref<string | null>(null);
const message = ref("");
const saveError = ref("");
const search = ref("");
const disabledOnly = ref(false);

watch(
  data,
  (rows) => {
    for (const row of rows ?? []) draft[row.key] = row.enabled;
  },
  { immediate: true },
);

const groups = computed(() => {
  const grouped = new Map<string, FeatureRow[]>();
  const term = search.value.trim().toLowerCase();
  for (const row of data.value ?? []) {
    if (term && !`${row.label} ${row.key}`.toLowerCase().includes(term)) continue;
    if (disabledOnly.value && row.enabled) continue;
    const items = grouped.get(row.group) ?? [];
    items.push(row);
    grouped.set(row.group, items);
  }
  return Array.from(grouped, ([name, items]) => ({ name, items }));
});

async function save(row: FeatureRow) {
  if (saving.value || draft[row.key] === row.enabled) return;
  saving.value = row.key;
  message.value = "";
  saveError.value = "";
  try {
    const saved = await $fetch<{ enabled: boolean; updatedAt: string }>(
      `/api/feature-availability/admin/${encodeURIComponent(row.key)}`,
      {
        method: "PUT",
        body: { enabled: draft[row.key] },
      },
    );
    data.value = (data.value ?? []).map((item) =>
      item.key === row.key
        ? { ...item, enabled: saved.enabled, updatedAt: saved.updatedAt }
        : item,
    );
    await refreshPublic().catch(() => undefined);
    message.value = `${row.label} availability saved.`;
  } catch {
    saveError.value = `Could not save ${row.label}. Please try again.`;
  } finally {
    saving.value = null;
  }
}
</script>

<template>
  <main
    class="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 text-slate-900 dark:text-white"
  >
    <header>
      <NuxtLink
        to="/admin"
        class="text-sm font-semibold text-sky-700 dark:text-cyan-300"
        >← Admin</NuxtLink
      >
      <h1 class="mt-3 text-2xl font-bold">Tool availability</h1>
      <p class="mt-2 text-sm text-slate-600 dark:text-white/60">
        Website switches hide tools and block their pages. Creator switches
        block new AI requests on the site and bot. Telegram switches block new
        bot actions. Saved data remains available when you re-enable a feature.
      </p>
    </header>
    <div class="flex flex-wrap items-center gap-3">
      <input v-model="search" type="search" placeholder="Search tools and features" aria-label="Search tools and features" class="min-h-11 min-w-56 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-white/20 dark:bg-white/[0.06]" />
      <label class="flex min-h-11 items-center gap-2 text-sm font-medium"><input v-model="disabledOnly" type="checkbox" class="size-5 accent-violet-600" /> Disabled only</label>
    </div>
    <p
      v-if="message"
      role="status"
      class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200"
    >
      {{ message }}
    </p>
    <p
      v-if="saveError || error"
      role="alert"
      class="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-400/10 dark:text-rose-200"
    >
      {{ saveError || "Could not load tool availability." }}
    </p>
    <p v-if="pending" class="text-sm text-slate-500">Loading tools…</p>
    <section v-for="group in groups" :key="group.name" class="space-y-3">
      <h2 class="text-lg font-semibold">{{ group.name }}</h2>
      <div
        class="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.05]"
      >
        <div
          v-for="row in group.items"
          :key="row.key"
          class="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">{{ row.label }}</p>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-white/50">
              {{ row.key }}
            </p>
          </div>
          <label class="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input
              v-model="draft[row.key]"
              type="checkbox"
              :disabled="Boolean(saving)"
              class="size-5 accent-violet-600"
            />
            {{ draft[row.key] ? "Enabled" : "Disabled" }}
          </label>
          <button
            type="button"
            :disabled="Boolean(saving) || draft[row.key] === row.enabled"
            class="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            @click="save(row)"
          >
            {{ saving === row.key ? "Saving…" : "Save" }}
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
