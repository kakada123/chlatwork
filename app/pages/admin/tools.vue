<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { ENABLED_TOOLS } from "~/lib/tool-registry";
import { CREATOR_FEATURE_TO_TOOL, CREATOR_TOOLS } from "~/data/creator-tools";
import { useProductCopy } from "~/composables/useProductCopy";

const { t } = useAppI18n();
const { isKhmer, localizeTool } = useLanguage();
const { productText } = useProductCopy();
type FeatureRow = {
  key: string;
  label: string;
  group: string;
  enabled: boolean;
  updatedAt: string | null;
};

definePageMeta({ middleware: ["auth", "admin"] });
useSeoMeta({
  title: () => t("shared.pages_admin_tools.tools_ads_chlat_work_admin"),
  robots: "noindex, nofollow",
});

const { data, status, error } = await useFetch<FeatureRow[]>(
  "/api/feature-availability/admin",
  { lazy: true },
);
const pending = computed(() => ["idle", "pending"].includes(status.value));
const { refresh: refreshPublic, disabled } = useFeatureAvailability();
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

const TELEGRAM_LABEL_KEYS: Record<string, string> = {
  "expenses": "shared.admin_telegram.expenses",
  "spending": "shared.admin_telegram.spending",
  "voting": "shared.admin_telegram.voting",
  "group-voting": "shared.admin_telegram.group_voting",
  "bill-split": "shared.admin_telegram.bill_split",
  "kla-klok": "shared.admin_telegram.kla_klok",
  "khqr": "shared.components_bot_group_khqr_directory.group_khqr",
  "notifications": "shared.admin_telegram.notifications",
  "assistant": "shared.admin_telegram.assistant",
  "phone": "shared.admin_telegram.phone"
};
function featureLabel(row: FeatureRow) {
  if (row.key === "ads:sitewide") return t("shared.admin_features.show_website_ads");
  const [kind, key] = row.key.split(":");
  if (kind === "website") {
    const tool = ENABLED_TOOLS.find(item => item.key === key);
    if (tool) return localizeTool(tool).name;
  }
  if (kind === "creator") {
    const id = CREATOR_FEATURE_TO_TOOL[key];
    const tool = CREATOR_TOOLS.find(item => item.id === id);
    if (tool) return productText(tool.title);
  }
  return kind === "telegram" && TELEGRAM_LABEL_KEYS[key] ? t(TELEGRAM_LABEL_KEYS[key]!) : productText(row.label);
}
const FEATURE_GROUP_KEYS: Record<string, string> = {
  "Website advertising": "shared.admin_feature_groups.website_advertising",
  "Website tools": "shared.admin_feature_groups.website_tools",
  "Creator AI · Website and Telegram": "shared.admin_feature_groups.creator_ai_website_and_telegram",
  "Main Telegram bot": "shared.admin_feature_groups.main_telegram_bot"
};
function featureGroup(name: string) {
  const key = FEATURE_GROUP_KEYS[name];
  return key ? t(key) : name;
}
const groups = computed(() => {
  const grouped = new Map<string, FeatureRow[]>();
  const term = search.value.trim().toLowerCase();
  for (const row of data.value ?? []) {
    if (term && !`${row.label} ${featureLabel(row)} ${row.key}`.toLowerCase().includes(term)) continue;
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
    draft[row.key] = saved.enabled;
    // Apply the confirmed ad choice immediately, even if the subsequent public read is unavailable.
    if (row.key === "ads:sitewide") {
      disabled.value = saved.enabled
        ? disabled.value.filter(key => key !== row.key)
        : [...new Set([...disabled.value, row.key])];
    }
    data.value = (data.value ?? []).map((item) =>
      item.key === row.key
        ? { ...item, enabled: saved.enabled, updatedAt: saved.updatedAt }
        : item,
    );
    await refreshPublic({ force: true }).catch(() => undefined);
    message.value = t("shared.pages_admin_tools.availability_saved", { rowLabel: row.label, featureLabelRow: featureLabel(row) });
  } catch {
    // Roll back the optimistic switch so the UI still reflects persisted state.
    draft[row.key] = row.enabled;
    saveError.value = t("shared.pages_admin_tools.could_not_save_please_try_again", { rowLabel: row.label, featureLabelRow: featureLabel(row) });
  } finally {
    saving.value = null;
  }
}

async function toggleAndSave(row: FeatureRow) {
  if (saving.value) return;
  draft[row.key] = !draft[row.key];
  await save(row);
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
        >{{ t("shared.pages_admin_tools.admin") }}</NuxtLink
      >
      <h1 class="mt-3 text-2xl font-bold">{{ t("shared.components_layout_product_navigation.tools_ads") }}</h1>
      <p class="mt-2 text-sm text-slate-600 dark:text-white/60">
        {{ t("shared.pages_admin_tools.show_website_ads_controls_banners_sidebars_native_ads_and") }}
      </p>
    </header>
    <div class="flex flex-wrap items-center gap-3">
      <input v-model="search" type="search" :placeholder="t(&quot;shared.pages_admin_tools.search_tools_and_features&quot;)" :aria-label="t(&quot;shared.pages_admin_tools.search_tools_and_features&quot;)" class="min-h-11 min-w-56 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-white/20 dark:bg-white/[0.06]" />
      <label class="flex min-h-11 items-center gap-2 text-sm font-medium"><input v-model="disabledOnly" type="checkbox" class="size-5 accent-violet-600" /> {{ t("shared.pages_admin_tools.disabled_only") }}</label>
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
      {{ saveError || t("shared.pages_admin_tools.could_not_load_tool_availability") }}
    </p>
    <p v-if="pending" class="text-sm text-slate-500">{{ t("shared.pages_admin_tools.loading_tools") }}</p>
    <section v-for="group in groups" :key="group.name" class="space-y-3">
      <h2 class="text-lg font-semibold">{{ featureGroup(group.name) }}</h2>
      <div
        class="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.05]"
      >
        <div
          v-for="row in group.items"
          :key="row.key"
          class="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">{{ featureLabel(row) }}</p>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-white/50">
              {{ row.key }}
            </p>
          </div>
          <div class="flex min-h-11 items-center gap-3 text-sm font-medium">
            <span class="min-w-16 text-right text-slate-600 dark:text-white/65">
              {{ saving === row.key ? t("shared.common.saving") : draft[row.key] ? t("shared.common.enabled") : t("shared.common.disabled") }}
            </span>
            <button
              type="button"
              role="switch"
              :aria-checked="draft[row.key]"
              :aria-label="t(&quot;shared.pages_admin_tools.availability&quot;, { rowLabel: row.label, featureLabelRow: featureLabel(row) })"
              :disabled="Boolean(saving)"
              class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              :class="draft[row.key] ? 'bg-violet-600 dark:bg-violet-300' : 'bg-slate-300 dark:bg-white/20'"
              @click="toggleAndSave(row)"
            >
              <span
                class="ml-1 size-5 rounded-full bg-white shadow-sm transition dark:bg-slate-950"
                :class="draft[row.key] ? 'translate-x-5' : ''"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
