<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { computed, nextTick, ref, useId } from "vue";
import {
  Activity, ArrowLeft, ArrowUpRight, BarChart3, Bot, CheckCircle2,
  ChevronRight, Clock3, LayoutDashboard, QrCode, RefreshCw, Settings2,
  ShieldCheck, UserRoundPlus, Users, Wrench,
} from "lucide-vue-next";
import ActivityTrendChart from "./ActivityTrendChart.vue";
import ToolIcon from "~/components/icons/ToolIcon.vue";
import type { AdminAnalytics, AdminUserSummary, AnalyticsRange } from "~/lib/admin-dashboard";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();

const props = withDefaults(defineProps<{
  analytics: AdminAnalytics | null;
  range: AnalyticsRange;
  loading: boolean;
  failed: boolean;
  toolCatalog?: Array<{ key: string; name: string; route: string }>;
}>(), { toolCatalog: () => [] });
const emit = defineEmits<{ rangeChange: [range: AnalyticsRange]; refresh: [] }>();
type Section = "overview" | "tools" | "users" | "activity" | "khqr";
const section = ref<Section>("overview");
const khqrVisited = ref(false);
const heading = ref<HTMLElement | null>(null);
const contentId = useId();
const menu = computed(() => [
  { id: "overview", label: t("shared.components_admin_activity_dashboard.overview"), icon: LayoutDashboard },
  { id: "tools", label: t("shared.common.tools"), icon: Wrench },
  { id: "users", label: t("shared.common.users"), icon: Users },
  { id: "activity", label: t("shared.components_admin_activity_dashboard.activity"), icon: Activity },
  { id: "khqr", label: t("shared.components_admin_activity_dashboard.member_khqr"), icon: QrCode },
] as const);
const ranges = computed(() => [
  { value: "7d", label: t("shared.components_admin_activity_dashboard.7_days") },
  { value: "30d", label: t("shared.components_admin_activity_dashboard.30_days") },
  { value: "90d", label: t("shared.components_admin_activity_dashboard.90_days") },
] as const);
// A range change can leave the previous response in useFetch until its replacement arrives.
const analytics = computed(() => props.analytics?.range === props.range ? props.analytics : null);
const sectionTitle = computed(() => ({
  overview: t("shared.components_admin_activity_dashboard.activity_dashboard"), tools: t("shared.components_admin_activity_dashboard.most_used_tools"), users: t("shared.components_admin_activity_dashboard.most_active_users"),
  activity: t("shared.components_admin_activity_dashboard.recent_activity"), khqr: t("shared.components_admin_activity_dashboard.member_khqr"),
})[section.value]);
const sectionDescription = computed(() => ({
  overview: t("shared.components_admin_activity_dashboard.a_clear_view_of_how_people_use_chlat_work"),
  tools: t("shared.components_admin_activity_dashboard.top_10_tools_by_opens_in_the_selected_period"),
  users: t("shared.components_admin_activity_dashboard.top_8_users_by_tool_activity_in_the_selected"),
  activity: t("shared.components_admin_activity_dashboard.the_latest_50_tool_events_in_the_selected_period"),
  khqr: t("shared.components_admin_activity_dashboard.manage_telegram_group_members_and_their_qr_images"),
})[section.value]);
const cards = computed(() => [
  { label: t("shared.components_admin_activity_dashboard.total_users"), value: analytics.value?.overview.totalUsers, icon: Users, tone: "sky", note: t("shared.components_admin_activity_dashboard.all_time_accounts") },
  { label: t("shared.components_admin_activity_dashboard.active_users"), value: analytics.value?.overview.activeUsers, icon: Activity, tone: "emerald", note: t("shared.components_admin_activity_dashboard.selected_period") },
  { label: t("shared.components_admin_activity_dashboard.tool_opens"), value: analytics.value?.overview.toolOpens, icon: BarChart3, tone: "cyan", note: t("shared.components_admin_activity_dashboard.selected_period") },
  { label: t("shared.components_admin_activity_dashboard.completed_actions"), value: analytics.value?.overview.completions, icon: CheckCircle2, tone: "violet", note: t("shared.components_admin_activity_dashboard.selected_period") },
  { label: t("shared.components_admin_activity_dashboard.new_users"), value: analytics.value?.overview.newUsers, icon: UserRoundPlus, tone: "amber", note: t("shared.components_admin_activity_dashboard.selected_period") },
]);
const opens = computed(() => analytics.value?.overview.toolOpens ?? 0);
const completions = computed(() => analytics.value?.overview.completions ?? 0);
const eventCount = computed(() => opens.value + completions.value);
const eventMixStyle = computed(() => ({
  background: eventCount.value
    ? `conic-gradient(var(--dashboard-opens) 0 ${(opens.value / eventCount.value) * 100}%, var(--dashboard-completions) 0 100%)`
    : "var(--dashboard-border)",
}));
const maxToolOpens = computed(() => Math.max(1, ...(analytics.value?.topTools.map((tool) => tool.opens) ?? [])));
const number = (value: number | undefined) => value === undefined ? "—" : new Intl.NumberFormat(isKhmer.value ? "km-KH" : "en-US").format(value);
const tool = (key: string) => props.toolCatalog.find((item) => item.key === key);
const toolName = (key: string) => tool(key)?.name ?? key.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const toolRoute = (key: string) => tool(key)?.route ?? "/tools";
const userLabel = (user: AdminUserSummary) => user.name || user.email || `${t("shared.common.user")} ${user.id.slice(0, 8)}`;
const initials = (user: AdminUserSummary) => userLabel(user).split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat(isKhmer.value ? "km-KH" : "en-US", {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
}).format(new Date(value)) : t("shared.components_admin_activity_dashboard.no_activity");

async function selectSection(value: Section) {
  section.value = value;
  // Keep an already-opened manager mounted so switching menus preserves upload drafts.
  if (value === "khqr") khqrVisited.value = true;
  await nextTick();
  heading.value?.focus({ preventScroll: true });
}
</script>

<template>
  <div class="admin-dashboard">
    <header class="dashboard-navigation">
      <div class="dashboard-topbar">
        <NuxtLink to="/" class="dashboard-brand" :aria-label="t(&quot;shared.components_admin_activity_dashboard.back_to_chlat_work&quot;)">
          <span class="dashboard-brand-icon"><ShieldCheck :size="20" aria-hidden="true" /></span>
          <span>ChlatWork <span class="dashboard-brand-divider">/</span> <strong>{{ t("shared.components_admin_activity_dashboard.admin") }}</strong></span>
        </NuxtLink>
        <div class="dashboard-links">
          <NuxtLink to="/admin/bots" class="dashboard-link" :aria-label="t(&quot;shared.components_admin_activity_dashboard.open_bot_admin&quot;)"><Bot :size="16" aria-hidden="true" /><span>{{ t("shared.components_layout_product_navigation.bot_admin") }}</span><ArrowUpRight :size="14" class="dashboard-link-arrow" aria-hidden="true" /></NuxtLink>
          <NuxtLink to="/admin/tools" class="dashboard-link" :aria-label="t(&quot;shared.components_admin_activity_dashboard.manage_tools_and_ads&quot;)"><Settings2 :size="16" aria-hidden="true" /><span>{{ t("shared.components_layout_product_navigation.tools_ads") }}</span><ArrowUpRight :size="14" class="dashboard-link-arrow" aria-hidden="true" /></NuxtLink>
          <NuxtLink to="/account" class="dashboard-account-link" :aria-label="t(&quot;shared.components_admin_activity_dashboard.back_to_account&quot;)"><ArrowLeft :size="16" aria-hidden="true" /><span>{{ t("shared.common.account") }}</span></NuxtLink>
        </div>
      </div>
      <nav class="dashboard-menu" :aria-label="t(&quot;shared.components_admin_activity_dashboard.admin_menu&quot;)">
        <button v-for="item in menu" :key="item.id" type="button" :aria-label="t(&quot;shared.components_admin_activity_dashboard.show&quot;, { itemLabel: item.label })" :aria-pressed="section === item.id" :aria-controls="contentId" class="dashboard-menu-item" @click="selectSection(item.id)">
          <component :is="item.icon" :size="16" aria-hidden="true" />{{ item.label }}
        </button>
      </nav>
    </header>

    <main :id="contentId" class="dashboard-main">
      <div class="dashboard-page-heading">
        <div class="dashboard-heading-copy">
          <h1 ref="heading" tabindex="-1">{{ sectionTitle }}</h1>
          <p>{{ sectionDescription }}</p>
        </div>
        <div v-if="section !== 'khqr'" class="dashboard-filters">
          <div class="dashboard-range" role="group" :aria-label="t(&quot;shared.components_admin_activity_dashboard.analytics_date_range&quot;)">
            <button v-for="range in ranges" :key="range.value" type="button" :aria-label="t(&quot;shared.components_admin_activity_dashboard.show_2&quot;, { rangeLabel: range.label })" :aria-pressed="props.range === range.value" @click="emit('rangeChange', range.value)">{{ range.label }}</button>
          </div>
          <button type="button" class="dashboard-refresh" :aria-label="t(&quot;shared.components_admin_activity_dashboard.refresh_dashboard&quot;)" :disabled="props.loading" @click="emit('refresh')"><RefreshCw :size="17" :class="{ 'animate-spin': props.loading }" aria-hidden="true" /></button>
        </div>
      </div>

      <div v-if="props.failed && section !== 'khqr'" role="alert" class="dashboard-error">{{ t("shared.components_admin_activity_dashboard.dashboard_activity_could_not_be_loaded_refresh_the_page") }}</div>

      <div v-if="section === 'overview'" class="dashboard-overview" :aria-busy="props.loading">
        <section class="dashboard-kpis" :aria-label="t(&quot;shared.components_admin_activity_dashboard.activity_overview&quot;)">
          <article v-for="card in cards" :key="card.label" class="dashboard-kpi">
            <div class="dashboard-kpi-label"><span :title="card.label">{{ card.label }}</span><component :is="card.icon" :size="16" :class="`dashboard-tone-${card.tone}`" aria-hidden="true" /></div>
            <strong>{{ number(card.value) }}</strong><span class="dashboard-kpi-note">{{ card.note }}</span>
          </article>
        </section>

        <div class="dashboard-charts">
          <section class="dashboard-panel dashboard-trend" aria-labelledby="admin-trend-title">
            <div class="dashboard-panel-heading"><h2 id="admin-trend-title">{{ t("shared.components_admin_activity_dashboard.daily_activity") }}</h2><span v-if="analytics" class="dashboard-updated">{{ dateTime(analytics.generatedAt) }}</span></div>
            <p v-if="!analytics" role="status" class="dashboard-placeholder">{{ props.loading ? t("shared.components_admin_activity_dashboard.loading_activity") : props.failed ? t("shared.components_admin_activity_dashboard.activity_unavailable") : t("shared.components_admin_activity_dashboard.no_analytics_available") }}</p>
            <ActivityTrendChart v-else :days="analytics.dailyActivity" />
          </section>
          <section class="dashboard-panel dashboard-event-mix" aria-labelledby="admin-event-mix-title">
            <div class="dashboard-panel-heading"><h2 id="admin-event-mix-title">{{ t("shared.components_admin_activity_dashboard.event_mix") }}</h2><BarChart3 :size="16" aria-hidden="true" /></div>
            <div v-if="analytics" class="dashboard-mix-content">
              <div class="dashboard-donut" :style="eventMixStyle" role="img" :aria-label="t(&quot;shared.components_admin_activity_dashboard.event_mix_tool_opens_and_completed_actions&quot;, { opens: opens, completions: completions })"><div><strong>{{ number(eventCount) }}</strong><span>{{ t("shared.components_admin_activity_dashboard.total_events") }}</span></div></div>
              <div class="dashboard-mix-legend"><p><i class="mix-opens" /><span>{{ t("shared.components_admin_activity_dashboard.tool_opens") }}</span><strong>{{ number(opens) }}</strong></p><p><i class="mix-completions" /><span>{{ t("shared.components_admin_activity_dashboard.completed") }}</span><strong>{{ number(completions) }}</strong></p></div>
            </div>
            <p v-else class="dashboard-placeholder">{{ props.loading ? t("shared.components_admin_activity_dashboard.loading_activity") : t("shared.components_admin_activity_dashboard.no_analytics_available") }}</p>
          </section>
        </div>

        <div class="dashboard-previews">
          <section class="dashboard-panel" aria-labelledby="admin-top-tools-title">
            <div class="dashboard-panel-heading"><h2 id="admin-top-tools-title">{{ t("shared.components_admin_activity_dashboard.most_used_tools") }}</h2><button type="button" class="dashboard-view-all" @click="selectSection('tools')">{{ t("shared.common.view_all") }}<ChevronRight :size="14" aria-hidden="true" /></button></div>
            <div v-if="analytics?.topTools.length" class="dashboard-preview-list">
              <div v-for="tool in analytics.topTools.slice(0, 3)" :key="tool.toolKey" class="dashboard-tool-preview"><span class="dashboard-tool-name">{{ toolName(tool.toolKey) }}</span><span class="dashboard-tool-track"><span :style="{ width: `${(tool.opens / maxToolOpens) * 100}%` }" /></span><strong>{{ number(tool.opens) }}</strong></div>
            </div>
            <p v-else class="dashboard-empty">{{ !analytics ? t("shared.components_admin_activity_dashboard.no_analytics_available") : t("shared.components_admin_activity_dashboard.no_tool_activity_in_this_period") }}</p>
          </section>
          <section class="dashboard-panel" aria-labelledby="admin-recent-title">
            <div class="dashboard-panel-heading"><h2 id="admin-recent-title">{{ t("shared.components_admin_activity_dashboard.recent_activity") }}</h2><button type="button" class="dashboard-view-all" @click="selectSection('activity')">{{ t("shared.common.view_all") }}<ChevronRight :size="14" aria-hidden="true" /></button></div>
            <div v-if="analytics?.recentActivity.length" class="dashboard-preview-list">
              <div v-for="item in analytics.recentActivity.slice(0, 3)" :key="item.id" class="dashboard-event-preview"><span class="dashboard-event-dot" :class="{ 'is-complete': item.event === 'COMPLETE' }" /><span><strong>{{ userLabel(item.user) }}</strong><span>{{ toolName(item.toolKey) }}</span></span><span class="dashboard-event-type">{{ item.event === 'COMPLETE' ? t("shared.components_admin_activity_dashboard.completed") : t("shared.components_admin_activity_dashboard.opened") }}</span></div>
            </div>
            <p v-else class="dashboard-empty">{{ !analytics ? t("shared.components_admin_activity_dashboard.no_analytics_available") : t("shared.components_admin_activity_dashboard.no_recent_activity_in_this_period") }}</p>
          </section>
        </div>
      </div>

      <section v-else-if="section === 'tools'" class="dashboard-detail dashboard-panel" :aria-label="t(&quot;shared.components_admin_activity_dashboard.most_used_tools&quot;)" tabindex="0">
        <template v-if="analytics?.topTools.length">
          <NuxtLink v-for="(tool, index) in analytics.topTools" :key="tool.toolKey" :to="toolRoute(tool.toolKey)" class="dashboard-tool-row">
            <span class="dashboard-rank">{{ index + 1 }}</span><span class="dashboard-tool-icon"><ToolIcon :name="tool.toolKey" class="size-5" /></span>
            <span class="dashboard-row-copy"><strong>{{ toolName(tool.toolKey) }}</strong><span>{{ t("shared.components_admin_activity_dashboard.users_completed", { toolUniqueUsers: number(tool.uniqueUsers), toolCompletions: number(tool.completions) }) }}</span></span>
            <span class="dashboard-row-count"><strong>{{ number(tool.opens) }}</strong><span>{{ t("shared.components_admin_activity_dashboard.opens") }}</span></span><ArrowUpRight :size="16" aria-hidden="true" />
          </NuxtLink>
        </template>
        <p v-else class="dashboard-placeholder">{{ props.loading ? t("shared.components_admin_activity_dashboard.loading_activity") : analytics ? t("shared.components_admin_activity_dashboard.no_tool_activity_in_this_period") : t("shared.components_admin_activity_dashboard.no_analytics_available") }}</p>
      </section>

      <section v-else-if="section === 'users'" class="dashboard-detail dashboard-panel" :aria-label="t(&quot;shared.components_admin_activity_dashboard.most_active_users&quot;)" tabindex="0">
        <div v-for="user in analytics?.topUsers ?? []" :key="user.id" class="dashboard-user-row">
          <span class="dashboard-avatar"><img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" referrerpolicy="no-referrer" /><span v-else>{{ initials(user) }}</span></span>
          <span class="dashboard-row-copy"><strong>{{ userLabel(user) }}</strong><span>{{ user.email || dateTime(user.lastActiveAt) }}</span></span><span class="dashboard-row-count"><strong>{{ number(user.activityCount) }}</strong><span>{{ t("shared.components_admin_activity_dashboard.events") }}</span></span>
        </div>
        <p v-if="!analytics?.topUsers.length" class="dashboard-placeholder">{{ props.loading ? t("shared.components_admin_activity_dashboard.loading_activity") : analytics ? t("shared.components_admin_activity_dashboard.no_active_users_in_this_period") : t("shared.components_admin_activity_dashboard.no_analytics_available") }}</p>
      </section>

      <section v-else-if="section === 'activity'" class="dashboard-detail dashboard-panel" :aria-label="t(&quot;shared.components_admin_activity_dashboard.recent_activity&quot;)" tabindex="0">
        <article v-for="item in analytics?.recentActivity ?? []" :key="item.id" class="dashboard-activity-row">
          <span class="dashboard-avatar"><img v-if="item.user.avatarUrl" :src="item.user.avatarUrl" alt="" referrerpolicy="no-referrer" /><span v-else>{{ initials(item.user) }}</span></span>
          <span class="dashboard-row-copy"><strong>{{ userLabel(item.user) }}</strong><span>{{ toolName(item.toolKey) }}</span></span><span class="dashboard-event-badge" :class="{ 'is-complete': item.event === 'COMPLETE' }">{{ item.event === 'COMPLETE' ? t("shared.components_admin_activity_dashboard.completed") : t("shared.components_admin_activity_dashboard.opened") }}</span><time :datetime="item.createdAt">{{ dateTime(item.createdAt) }}</time>
        </article>
        <p v-if="!analytics?.recentActivity.length" class="dashboard-placeholder">{{ props.loading ? t("shared.components_admin_activity_dashboard.loading_activity") : analytics ? t("shared.components_admin_activity_dashboard.no_recent_activity_in_this_period") : t("shared.components_admin_activity_dashboard.no_analytics_available") }}</p>
      </section>

      <div v-if="khqrVisited" v-show="section === 'khqr'" class="dashboard-detail dashboard-khqr" :aria-label="t(&quot;shared.components_admin_activity_dashboard.member_khqr_management&quot;)" tabindex="0"><AdminMemberKhqrManager /></div>

      <footer class="dashboard-footnote"><ShieldCheck :size="12" aria-hidden="true" /><span>{{ t("shared.components_admin_activity_dashboard.activity_includes_only_tool_names_and_timestamps_never_tool") }}</span></footer>
    </main>
  </div>
</template>

<style scoped>
.admin-dashboard {
  --dashboard-bg: #f3f6fb; --dashboard-panel: #fff; --dashboard-subtle: #edf2f8;
  --dashboard-text: #14273d; --dashboard-muted: #63748a; --dashboard-border: #dce4ee;
  --dashboard-opens: #0284c7; --dashboard-completions: #8b5cf6; --dashboard-active-bg: #cffafe;
  display: flex; height: 100%; min-height: 0; min-width: 0; flex-direction: column;
  background: var(--dashboard-bg); color: var(--dashboard-text); font-size: 14px;
}
html.dark .admin-dashboard {
  --dashboard-bg: #080f1b; --dashboard-panel: #101c2e; --dashboard-subtle: #17253a;
  --dashboard-text: #f1f5f9; --dashboard-muted: #9aacc3; --dashboard-border: #243248;
  --dashboard-opens: #67e8f9; --dashboard-completions: #a78bfa; --dashboard-active-bg: #a5f3fc;
}
.admin-dashboard :is(button, a, [tabindex="0"]):focus-visible { outline: 2px solid var(--dashboard-opens); outline-offset: 3px; }
.admin-dashboard button { cursor: pointer; }
.admin-dashboard button:disabled { cursor: wait; opacity: 0.5; }
.dashboard-navigation { flex: none; padding: 0 28px; background: var(--dashboard-panel); border-bottom: 1px solid var(--dashboard-border); }
.dashboard-topbar { display: flex; min-height: 62px; align-items: center; justify-content: space-between; gap: 16px; }
.dashboard-brand { display: inline-flex; flex-shrink: 0; align-items: center; gap: 10px; font-weight: 700; font-size: 15px; }
.dashboard-brand-icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 10px; background: var(--dashboard-active-bg); color: #0f172a; }
.dashboard-brand-divider { margin: 0 8px; color: var(--dashboard-muted); font-weight: 400; }
.dashboard-brand strong { font-size: 12px; font-weight: 600; color: var(--dashboard-muted); }
.dashboard-links { display: flex; align-items: center; gap: 8px; }
.dashboard-link, .dashboard-account-link { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; gap: 7px; padding: 6px 12px; border: 1px solid var(--dashboard-border); border-radius: 10px; font-size: 12px; font-weight: 600; }
.dashboard-link:hover, .dashboard-account-link:hover { background: var(--dashboard-subtle); }
.dashboard-account-link { border-color: transparent; color: var(--dashboard-muted); }
.dashboard-menu { display: flex; gap: 6px; overflow-x: auto; padding: 4px 0 10px; scrollbar-width: thin; }
.dashboard-menu-item { display: inline-flex; min-height: 38px; flex-shrink: 0; align-items: center; justify-content: center; gap: 8px; border-radius: 10px; padding: 8px 14px; color: var(--dashboard-muted); font-size: 12px; font-weight: 650; }
.dashboard-menu-item:hover { background: var(--dashboard-subtle); color: var(--dashboard-text); }
.dashboard-menu-item[aria-pressed="true"] { background: var(--dashboard-active-bg); color: #0f172a; }
.dashboard-main { display: flex; min-height: 0; flex: 1; flex-direction: column; gap: 16px; padding: 20px 28px 12px; }
.dashboard-page-heading { display: flex; flex: none; align-items: center; justify-content: space-between; gap: 16px; }
.dashboard-heading-copy { min-width: 0; }
.dashboard-heading-copy h1 { font-size: 24px; font-weight: 750; line-height: 1.25; letter-spacing: -0.04em; outline: none; }
.dashboard-heading-copy p { margin-top: 5px; color: var(--dashboard-muted); font-size: 12px; }
.dashboard-filters { display: flex; flex-shrink: 0; align-items: center; gap: 10px; }
.dashboard-range { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border: 1px solid var(--dashboard-border); border-radius: 12px; background: var(--dashboard-panel); }
.dashboard-range button { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; border-radius: 8px; padding: 8px 14px; white-space: nowrap; font-size: 12px; font-weight: 700; color: var(--dashboard-muted); }
.dashboard-range button:hover { background: var(--dashboard-subtle); color: var(--dashboard-text); }
.dashboard-range button[aria-pressed="true"] { background: #a5f3fc; color: #0f172a; box-shadow: 0 1px 3px #00000014; }
.dashboard-refresh { display: grid; width: 46px; height: 46px; flex-shrink: 0; place-items: center; border: 1px solid var(--dashboard-border); border-radius: 12px; background: var(--dashboard-panel); }
.dashboard-refresh:hover { background: var(--dashboard-subtle); }
.dashboard-error { flex: none; border: 1px solid #fb718566; border-radius: 12px; padding: 10px 14px; background: #fb718514; color: #e11d48; font-size: 12px; }
html.dark .dashboard-error { color: #fda4af; }
.dashboard-overview { display: grid; min-height: 0; flex: 1; grid-template-rows: auto minmax(0, 1fr) auto; gap: 16px; }
.dashboard-kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.dashboard-kpi { min-width: 0; border: 1px solid var(--dashboard-border); border-radius: 14px; padding: 14px 16px; background: var(--dashboard-panel); }
.dashboard-kpi-label { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--dashboard-muted); font-size: 11px; font-weight: 600; }
.dashboard-kpi-label span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.dashboard-kpi-label svg { flex-shrink: 0; }
.dashboard-kpi > strong { display: block; margin-top: 6px; font-size: 27px; line-height: 1.1; font-weight: 750; letter-spacing: -0.035em; font-variant-numeric: tabular-nums; }
.dashboard-kpi-note { display: block; margin-top: 4px; color: var(--dashboard-muted); font-size: 10px; }
.dashboard-tone-sky, .dashboard-tone-cyan { color: var(--dashboard-opens); }
.dashboard-tone-violet { color: var(--dashboard-completions); }
.dashboard-tone-emerald { color: #10b981; }
.dashboard-tone-amber { color: #f59e0b; }
.dashboard-charts { display: grid; min-height: 0; grid-template-columns: minmax(0, 1.9fr) minmax(230px, 1fr); gap: 16px; }
.dashboard-panel { min-width: 0; min-height: 0; border: 1px solid var(--dashboard-border); border-radius: 16px; padding: 16px 18px; background: var(--dashboard-panel); }
.dashboard-panel-heading { display: flex; flex: none; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.dashboard-panel-heading h2 { font-size: 13px; line-height: 1.3; font-weight: 700; }
.dashboard-panel-heading > svg { color: var(--dashboard-muted); }
.dashboard-updated { color: var(--dashboard-muted); font-size: 10px; }
.dashboard-trend { display: flex; flex-direction: column; }
.dashboard-trend > :last-child { flex: 1; min-height: 0; }
.dashboard-event-mix { display: flex; flex-direction: column; }
.dashboard-mix-content { display: flex; min-height: 0; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.dashboard-donut { display: grid; width: min(150px, 22vh); aspect-ratio: 1; flex-shrink: 1; place-items: center; border-radius: 50%; padding: 16px; }
.dashboard-donut > div { display: flex; width: 100%; height: 100%; flex-direction: column; align-items: center; justify-content: center; border-radius: 50%; background: var(--dashboard-panel); }
.dashboard-donut strong { font-size: 26px; font-weight: 750; letter-spacing: -0.04em; }
.dashboard-donut span { color: var(--dashboard-muted); font-size: 10px; }
.dashboard-mix-legend { width: 100%; max-width: 240px; font-size: 11px; }
.dashboard-mix-legend p { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
.dashboard-mix-legend i { width: 7px; height: 7px; flex-shrink: 0; border-radius: 50%; }
.dashboard-mix-legend span { flex: 1; color: var(--dashboard-muted); }
.mix-opens { background: var(--dashboard-opens); }
.mix-completions { background: var(--dashboard-completions); }
.dashboard-previews { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.dashboard-view-all { display: inline-flex; min-height: 28px; align-items: center; gap: 3px; font-size: 11px; color: var(--dashboard-opens); font-weight: 600; }
.dashboard-preview-list { display: grid; gap: 10px; }
.dashboard-tool-preview { display: flex; min-height: 24px; align-items: center; gap: 12px; font-size: 11px; }
.dashboard-tool-name { width: 40%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.dashboard-tool-track { height: 6px; flex: 1; overflow: hidden; border-radius: 6px; background: var(--dashboard-subtle); }
.dashboard-tool-track > span { display: block; height: 100%; border-radius: inherit; background: var(--dashboard-opens); }
.dashboard-tool-preview > strong { min-width: 28px; text-align: right; font-variant-numeric: tabular-nums; }
.dashboard-event-preview { display: flex; min-height: 24px; align-items: center; gap: 10px; font-size: 11px; }
.dashboard-event-dot { height: 7px; width: 7px; flex-shrink: 0; border-radius: 50%; background: var(--dashboard-opens); }
.dashboard-event-dot.is-complete { background: var(--dashboard-completions); }
.dashboard-event-preview > span:nth-child(2) { display: flex; min-width: 0; flex: 1; align-items: center; gap: 10px; }
.dashboard-event-preview strong, .dashboard-event-preview span:nth-child(2) > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dashboard-event-preview span:nth-child(2) > span, .dashboard-event-type { color: var(--dashboard-muted); }
.dashboard-event-type { margin-left: auto; font-size: 10px; }
.dashboard-placeholder { display: grid; min-height: 80px; place-items: center; padding: 20px; text-align: center; color: var(--dashboard-muted); font-size: 13px; }
.dashboard-empty { padding: 12px 0; color: var(--dashboard-muted); font-size: 12px; }
.dashboard-detail { min-height: 0; flex: 1; overflow: auto; overscroll-behavior: contain; scrollbar-width: thin; }
.dashboard-detail > .dashboard-placeholder { height: 100%; }
.dashboard-tool-row, .dashboard-user-row, .dashboard-activity-row { display: flex; min-width: 0; align-items: center; gap: 16px; border-bottom: 1px solid var(--dashboard-border); padding: 16px 4px; }
.dashboard-tool-row:last-child, .dashboard-user-row:last-child, .dashboard-activity-row:last-child { border-bottom: 0; }
.dashboard-tool-row:hover { color: var(--dashboard-opens); }
.dashboard-rank { width: 24px; color: var(--dashboard-muted); font-size: 12px; text-align: center; }
.dashboard-tool-icon, .dashboard-avatar { display: grid; height: 38px; width: 38px; flex-shrink: 0; place-items: center; overflow: hidden; border-radius: 12px; background: var(--dashboard-subtle); color: var(--dashboard-opens); font-size: 11px; font-weight: 700; }
.dashboard-avatar { border-radius: 50%; color: var(--dashboard-completions); }
.dashboard-avatar img { height: 100%; width: 100%; object-fit: cover; }
.dashboard-row-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4px; }
.dashboard-row-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.dashboard-row-copy > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--dashboard-muted); }
.dashboard-row-count { display: flex; flex-shrink: 0; flex-direction: column; gap: 2px; text-align: right; font-variant-numeric: tabular-nums; }
.dashboard-row-count > span { font-size: 10px; color: var(--dashboard-muted); }
.dashboard-activity-row time { min-width: 140px; text-align: right; font-size: 11px; color: var(--dashboard-muted); }
.dashboard-event-badge { flex-shrink: 0; border-radius: 8px; padding: 5px 8px; background: var(--dashboard-subtle); color: var(--dashboard-opens); font-size: 10px; font-weight: 600; }
.dashboard-event-badge.is-complete { color: var(--dashboard-completions); }
.dashboard-khqr { border-radius: 16px; }
.dashboard-footnote { display: flex; flex: none; align-items: center; gap: 6px; color: var(--dashboard-muted); font-size: 10px; line-height: 1.4; }
.dashboard-footnote svg { flex-shrink: 0; }
@media (min-width: 1600px) { .dashboard-main { padding-right: max(28px, calc((100vw - 1544px) / 2)); padding-left: max(28px, calc((100vw - 1544px) / 2)); } }
@media (max-height: 760px) {
  .dashboard-main, .dashboard-overview { gap: 12px; }
  .dashboard-main { padding-top: 14px; }
  .dashboard-topbar { min-height: 54px; }
  .dashboard-kpi { padding: 10px 14px; }
  .dashboard-kpi > strong { font-size: 24px; }
  .dashboard-panel { padding: 12px 16px; }
  .dashboard-previews .dashboard-panel-heading { margin-bottom: 6px; }
  .dashboard-preview-list { gap: 5px; }
  .dashboard-donut { width: min(126px, 19vh); padding: 13px; }
  .dashboard-mix-content { gap: 8px; }
}
@media (max-width: 900px) {
  .dashboard-navigation { padding: 0 18px; }
  .dashboard-main { padding-right: 18px; padding-left: 18px; }
  .dashboard-charts { grid-template-columns: minmax(0, 1.7fr) minmax(200px, 1fr); gap: 12px; }
  .dashboard-kpis { gap: 8px; }
  .dashboard-kpi { padding: 12px; }
  .dashboard-kpi-label { font-size: 10px; }
  .dashboard-kpi-label svg { display: none; }
  .dashboard-heading-copy h1 { font-size: 22px; }
  .dashboard-updated { display: none; }
  .dashboard-event-preview span:nth-child(2) > span { display: none; }
}
@media (max-width: 639px) {
  .dashboard-navigation { padding: 0 12px; }
  .dashboard-topbar { min-height: 54px; gap: 8px; }
  .dashboard-brand { gap: 7px; font-size: 13px; }
  .dashboard-brand-icon { width: 30px; height: 30px; }
  .dashboard-brand-divider { margin: 0 4px; }
  .dashboard-brand strong { font-size: 11px; }
  .dashboard-links { gap: 5px; }
  .dashboard-link, .dashboard-account-link { width: 32px; min-height: 34px; padding: 4px; }
  .dashboard-link span, .dashboard-link-arrow, .dashboard-account-link span { display: none; }
  .dashboard-menu { gap: 3px; padding-bottom: 8px; }
  .dashboard-menu-item { min-height: 36px; gap: 6px; padding: 7px 10px; font-size: 11px; }
  .dashboard-menu-item svg { width: 14px; height: 14px; }
  .dashboard-main { gap: 12px; padding: 14px 12px 8px; }
  .dashboard-page-heading { flex-wrap: wrap; gap: 10px; }
  .dashboard-heading-copy h1 { font-size: 20px; }
  .dashboard-heading-copy p { margin-top: 3px; font-size: 11px; }
  .dashboard-filters { width: 100%; gap: 8px; }
  .dashboard-range { flex: 1; }
  .dashboard-range button { min-height: 32px; padding: 6px 8px; font-size: 11px; }
  .dashboard-refresh { width: 42px; height: 42px; }
  .dashboard-kpis { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; }
  .dashboard-kpi { grid-column: span 2; padding: 9px 10px; border-radius: 12px; }
  .dashboard-kpi:nth-child(n + 4) { grid-column: span 3; }
  .dashboard-kpi > strong { margin-top: 4px; font-size: 22px; }
  .dashboard-kpi-note { display: none; }
  .dashboard-overview { grid-template-rows: auto minmax(0, 1fr); gap: 10px; }
  .dashboard-charts { grid-template-columns: minmax(0, 1fr); }
  .dashboard-event-mix, .dashboard-previews { display: none; }
  .dashboard-panel { padding: 12px; }
  .dashboard-panel-heading { margin-bottom: 8px; }
  .dashboard-footnote { font-size: 9px; }
  .dashboard-tool-row, .dashboard-user-row, .dashboard-activity-row { gap: 10px; padding: 12px 0; }
  .dashboard-activity-row { flex-wrap: wrap; }
  .dashboard-activity-row time { min-width: 0; width: 100%; padding-left: 48px; text-align: left; }
  .dashboard-rank { width: 16px; }
}
@media (max-height: 600px) {
  .dashboard-previews { display: none; }
  .dashboard-overview { grid-template-rows: auto minmax(0, 1fr); }
  .dashboard-heading-copy p, .dashboard-kpi-note, .dashboard-footnote { display: none; }
  .dashboard-charts { grid-template-columns: minmax(0, 1fr); }
  .dashboard-event-mix { display: none; }
}
@media (max-height: 480px) {
  /* Landscape phones keep the page fixed while its workspace remains reachable. */
  .dashboard-main { overflow-y: auto; }
  .dashboard-overview { min-height: 300px; flex: none; }
  .dashboard-charts { min-height: 190px; }
}
</style>
