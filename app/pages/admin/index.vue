<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import ActivityDashboard from "~/components/admin/ActivityDashboard.vue";
import { LANDING_TOOLS } from "~/data/tools";
import type { AdminAnalytics, AnalyticsRange } from "~/lib/admin-dashboard";

const { t } = useAppI18n();

// Only this route uses the viewport workspace; the other admin pages retain their layouts.
definePageMeta({ middleware: "admin", layout: "admin", blankCanvas: true });
useSeoMeta({ title: () => t("shared.pages_admin_index.admin_activity_chlat_work"), robots: "noindex, nofollow" });

const { isKhmer, localizeTool } = useLanguage();
const localizedTools = computed(() => LANDING_TOOLS.map(localizeTool));
const selectedRange = ref<AnalyticsRange>("30d");
const { data, status, error, refresh } = await useFetch<AdminAnalytics>("/api/admin/analytics", {
  key: "admin-analytics",
  lazy: true,
  query: computed(() => ({ range: selectedRange.value })),
});
const isLoading = computed(() => ["idle", "pending"].includes(status.value));
</script>

<template>
  <div class="h-full min-h-0">
    <!-- Out-in page transitions need one stable element root when leaving the workspace. -->
    <ActivityDashboard
      :analytics="data ?? null"
      :range="selectedRange"
      :loading="isLoading"
      :failed="Boolean(error)"
      :tool-catalog="localizedTools"
      @range-change="selectedRange = $event"
      @refresh="refresh()"
    />
  </div>
</template>
