<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import {
  BarChart3,
  BellRing,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Cookie,
  FileText,
  Heart,
  History,
  Info,
  Link2,
  LogOut,
  Mail,
  Map,
  Moon,
  Newspaper,
  Plus,
  ReceiptText,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from "lucide-vue-next";
import CommandQuickCard from "~/components/developer-commands/CommandQuickCard.vue";
import TelegramPhoneSetting from "~/components/account/TelegramPhoneSetting.vue";
import AccountDesktopNavigation from "~/components/account/AccountDesktopNavigation.vue";
import { DESKTOP_ACCOUNT_SECTIONS, type DesktopAccountSection } from "~/lib/account-navigation";
import ToolIcon from "~/components/icons/ToolIcon.vue";
import HomeToolCard from "~/components/landing/HomeToolCard.vue";
import MoneyAmount from "~/components/MoneyAmount.vue";
import MomentSummaryCard from "~/components/moments/MomentSummaryCard.vue";
import ConfirmDialog from "~/components/ui/ConfirmDialog.vue";
import type { PaybackHistoryItem } from "~/components/payback-calculator/PaybackCalculatorHistory.vue";
import { openQuickExpense } from "~/composables/useQuickExpense";
import { DEVELOPER_COMMANDS } from "~/data/developer-commands";
import { LANDING_TOOLS } from "~/data/tools";
import {
  collectExpenseItems,
  getBudgetPercent,
  getBudgetRemaining,
  getBudgetValue,
  getExpenseRangeLabel,
  getTotalSpent,
  hasCompleteExpenseStoredRows,
  normalizeExpenseStoredState,
  type ExpenseStoredState,
} from "~/lib/expense-tracker";
import { buildPaybackRawFromRows, buildPaybackSharePayload } from "~/lib/payback-calculator";
import { openPrivacyCookieSettings } from "~/lib/cookie-notice";
import { getToolIconTone } from "~/lib/tool-icon-tones";
import type { ToolUsageSummaryItem } from "~/composables/useToolUsage";
import type { MomentSummary } from "~/types/moment";

const { t } = useAppI18n();

type MobileAccountSection =
  | "expenses"
  | "moments"
  | "payback"
  | "activity"
  | "favorite-tools"
  | "favorite-commands";

const MOBILE_ACCOUNT_SECTION_KEYS: Record<MobileAccountSection, string> = {
  "expenses": "shared.pages_account.expense_tracker",
  "moments": "shared.pages_account.your_moments",
  "payback": "shared.pages_account.pay_back_history",
  "activity": "shared.pages_account.tool_activity",
  "favorite-tools": "shared.pages_account.favorite_tools",
  "favorite-commands": "shared.pages_account.favorite_commands"
};



type AccountInformationItem = {
  label: string;
    icon: LucideIcon;
  to?: string;
  href?: string;
  action?: "cookie-settings";
};

function accountInformationRoute(path?: string) {
  return {
    path: path ?? "/account",
    query: { from: "account" },
  };
}

const accountInformationGroups: Array<{
  key: string;
  title: string;
    iconTone: string;
  items: AccountInformationItem[];
}> = [
  {
    key: "site",
    title: "shared.layouts_default.site",
    iconTone: "bg-sky-100 text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200",
    items: [
      { label: "shared.common.about", to: "/about", icon: Info },
      { label: "shared.common.contact", to: "/contact", icon: Mail },
      { label: "shared.layouts_default.guides", to: "/guides", icon: BookOpen },
      { label: "shared.pages_posts_index.posts", to: "/posts", icon: Newspaper },
      { label: "shared.account_information.sitemap", href: "/sitemap.xml", icon: Map },
    ],
  },
  {
    key: "policies",
    title: "shared.layouts_default.policies",
    iconTone: "bg-violet-100 text-violet-700 dark:bg-violet-300/10 dark:text-violet-200",
    items: [
      { label: "shared.components_tools_tool_content_layout.editorial_policy", to: "/editorial-policy", icon: FileText },
      { label: "shared.layouts_default.privacy_policy", to: "/privacy-policy", icon: ShieldCheck },
      { label: "shared.account_information.terms_of_use", to: "/terms", icon: Scale },
      { label: "shared.account_information.cookie_policy", to: "/cookies", icon: Cookie },
      { label: "shared.components_tools_tool_content_layout.disclaimer", to: "/disclaimer", icon: TriangleAlert },
    ],
  },
  {
    key: "support",
    title: "shared.layouts_default.support",
    iconTone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-200",
    items: [
      { label: "shared.pages_privacy_policy.privacy_cookie_settings", action: "cookie-settings", icon: SlidersHorizontal },
      { label: "shared.account_information.support_chlat_work", to: "/buy-me-coffee", icon: Coffee },
    ],
  },
];

definePageMeta({ middleware: "auth", layout: "account" });

const { user, logout } = useAuth();
const route = useRoute();
const { isDark, nextColorModeLabel, toggleColorMode } = useColorMode();
const languageState = typeof useLanguage === "function" ? useLanguage() : null;
const isKhmer = languageState?.isKhmer ?? ref(false);
useSeoMeta({ title: () => t("shared.pages_account.profile_chlat_work"), robots: "noindex, nofollow" });
const localizeTool = languageState?.localizeTool ?? ((tool: any) => tool);
const { localizeMomentPath } = useMomentLanguage();
const { favoriteToolKeys, favoritesReady, favoriteError } = useToolFavorites();
const { favoriteCommandIds, toggleCommandFavorite, isFavoriteSaving: isCommandFavoriteSaving } = useCommandFavorites();
const { clearToolUsage, getToolUsageSummary } = useToolUsage();
const {
  enabled: quickExpenseEnabled,
  isLoading: quickExpenseSettingLoading,
  updateEnabled: updateQuickExpenseEnabled,
} = useQuickExpense();
const {
  settings: telegramNotificationSettings,
  isLoading: telegramNotificationLoading,
  load: loadTelegramNotificationSettings,
  update: updateTelegramNotificationSettings,
} = useTelegramNotifications();
const {
  enabled: telegramPhoneEnabled,
  disabled: telegramPhoneDisabled,
  description: telegramPhoneDescription,
  error: telegramPhoneError,
  status: telegramPhoneStatus,
  toggle: toggleTelegramPhone,
} = useTelegramPhone();

const isLoggingOut = ref(false);
const signOutDialogOpen = ref(false);
const mobileAccountSection = ref<MobileAccountSection | null>(null);
const desktopAccountSection = ref<DesktopAccountSection>("overview");
const accountContent = ref<HTMLElement | null>(null);
const desktopAccountSectionTitle = computed(() => {
  const section = DESKTOP_ACCOUNT_SECTIONS.find(
    (item) => item.key === desktopAccountSection.value,
  );
  if (!section) return t("shared.components_admin_activity_dashboard.overview");
  return t(section.titleKey);
});

function desktopPanelClass(section: DesktopAccountSection) {
  return { "account-panel-hidden": desktopAccountSection.value !== section };
}

async function openDesktopAccountSection(section: DesktopAccountSection) {
  desktopAccountSection.value = section;
  await nextTick();
  // Reset only this pane so the shared header and navigation stay in place.
  accountContent.value?.scrollTo({ top: 0, behavior: "auto" });
  accountContent.value?.focus({ preventScroll: true });
}
const mobileAccountSectionTitle = computed(() => {
  if (!mobileAccountSection.value) return "";
  return t(MOBILE_ACCOUNT_SECTION_KEYS[mobileAccountSection.value]);
});
const historyItems = ref<PaybackHistoryItem[]>([]);
const historyCount = ref(0);
const historyLoading = ref(true);
const historyDeletingId = ref("");
const usageItems = ref<ToolUsageSummaryItem[]>([]);
const usageLoading = ref(true);
const usageClearing = ref(false);
const quickExpenseSettingSaving = ref(false);
const quickExpenseSettingError = ref("");
const expenseState = ref<ExpenseStoredState | null>(null);
const expenseLoading = ref(true);
const expenseLoadFailed = ref(false);
const isTelegramMiniApp = ref(false);
const googleLinkUrl = ref("");
const googleLinkError = ref("");
const telegramNotificationSaving = ref(false);
const telegramNotificationError = ref("");
const telegramNotificationStatus = ref("");
let googleLinkRefreshTimer: ReturnType<typeof setInterval> | undefined;
// Saved Moments load independently so the account profile can render first.
const {
  data: momentData,
  status: momentsStatus,
  error: momentsError,
} = await useFetch<MomentSummary[]>("/api/moments/mine", {
  key: "profile-moments",
  server: false,
  lazy: true,
});
const moments = computed(() => momentData.value ?? []);
const momentsInitialLoading = computed(() => ["idle", "pending"].includes(momentsStatus.value) && !momentData.value);
const momentsUnavailable = computed(() => Boolean(momentsError.value) && !momentData.value);
const savedExpenseCount = computed(() =>
  (expenseState.value?.rows ?? []).filter((row) => (row.type ?? "expense") === "expense").length,
);
const expenseSummary = computed(() => {
  const state = expenseState.value;
  if (!state) return null;

  const { items } = collectExpenseItems(state.rows, state.rangeMode);
  const totalSpent = getTotalSpent(items);
  const budgetValue = getBudgetValue(state.budget);
  const budgetRemaining = getBudgetRemaining(budgetValue, totalSpent);

  return {
    totalSpent,
    budgetValue,
    budgetRemaining,
    budgetPercent: getBudgetPercent(totalSpent, budgetValue),
    rangeLabel: getExpenseRangeLabel(state.rangeMode),
  };
});

const { websiteEnabled } = useFeatureAvailability();
watch(() => websiteEnabled("developer-commands"), (enabled) => {
  if (!enabled && desktopAccountSection.value === "favorite-commands") {
    void openDesktopAccountSection("overview");
  }
});
const favoriteTools = computed(() => favoriteToolKeys.value
  .map((key) => LANDING_TOOLS.find((tool) => tool.key === key))
  .filter((tool): tool is (typeof LANDING_TOOLS)[number] => Boolean(tool) && websiteEnabled(tool.key))
  .map(localizeTool));

const favoriteCommands = computed(() => (websiteEnabled('developer-commands') ? favoriteCommandIds.value : [])
  .map((id) => DEVELOPER_COMMANDS.find((command) => command.id === id))
  .filter((command): command is (typeof DEVELOPER_COMMANDS)[number] => Boolean(command)));

const mostUsedTools = computed(() => usageItems.value
  .map((usage) => {
    const tool = LANDING_TOOLS.find((item) => item.key === usage.toolKey);
    return tool && websiteEnabled(tool.key) ? { ...usage, tool: localizeTool(tool) } : null;
  })
  .filter((item): item is NonNullable<typeof item> => Boolean(item))
  .slice(0, 6));

const initials = computed(() => {
  const source = user.value?.name || user.value?.email || user.value?.phone || "U";
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
});
const needsGoogleLink = computed(() =>
  isTelegramMiniApp.value && !user.value?.providers?.includes("GOOGLE"),
);
const telegramNotificationsEnabled = computed(() => telegramNotificationSettings.value?.enabled === true);
const telegramNotificationsAvailable = computed(() => telegramNotificationSettings.value?.available === true);
const telegramNotificationDescription = computed(() => {
  if (telegramNotificationLoading.value) {
    return t("shared.pages_account.loading_notification_settings");
  }
  if (!telegramNotificationSettings.value) {
    return t("shared.pages_account.notification_settings_are_temporarily_unavailable");
  }
  const schedule = t("shared.pages_account.daily_spending_overview_at_10_00_pm", { telegramNotificationSettingsTimeZone: telegramNotificationSettings.value.timeZone });
  if (telegramNotificationsEnabled.value) {
    return t("shared.pages_account.enabled", { schedule: schedule });
  }
  if (!telegramNotificationsAvailable.value) {
    return t("shared.pages_account.connect_a_telegram_account_to_use_notifications");
  }
  if (!isTelegramMiniApp.value) {
    return t("shared.pages_account.open_chlat_work_in_telegram_to_enable_notifications");
  }
  return schedule;
});
const telegramNotificationDisabled = computed(() =>
  telegramNotificationLoading.value
  || telegramNotificationSaving.value
  || !telegramNotificationSettings.value
  || (!telegramNotificationsEnabled.value && (!telegramNotificationsAvailable.value || !isTelegramMiniApp.value)),
);

async function prepareGoogleLink() {
  if (!needsGoogleLink.value) return;
  try {
    const response = await $fetch<{ url: string }>("/api/auth/google/link/start", { method: "POST" });
    googleLinkUrl.value = response.url;
    googleLinkError.value = "";
  } catch {
    googleLinkUrl.value = "";
    googleLinkError.value = "Google linking is temporarily unavailable.";
  }
}

function openGoogleLink() {
  const telegram = getTelegramMiniApp();
  if (!telegram || !googleLinkUrl.value) return;
  // Telegram permits external navigation only while handling the user's click.
  telegram.openLink(googleLinkUrl.value);
  googleLinkUrl.value = "";
  window.setTimeout(() => void prepareGoogleLink(), 1_000);
}

async function loadHistory() {
  historyLoading.value = true;
  try {
    const [items, countResult] = await Promise.all([
      $fetch<PaybackHistoryItem[]>("/api/payback/history"),
      $fetch<{ count: number }>("/api/payback/history/count"),
    ]);
    historyItems.value = items;
    historyCount.value = countResult.count;
  } catch {
    historyItems.value = [];
    historyCount.value = 0;
  } finally {
    historyLoading.value = false;
  }
}

async function loadToolUsage() {
  usageLoading.value = true;
  try {
    usageItems.value = await getToolUsageSummary();
  } catch {
    usageItems.value = [];
  } finally {
    usageLoading.value = false;
  }
}

async function loadExpenseState(preserveSnapshot = false) {
  if (!preserveSnapshot) {
    expenseLoading.value = true;
    expenseLoadFailed.value = false;
  }
  try {
    const response = await $fetch<unknown>("/api/expenses/state");
    if (!hasCompleteExpenseStoredRows(response)) {
      throw new Error("Expense state response is missing saved rows");
    }
    expenseState.value = normalizeExpenseStoredState(response);
    expenseLoadFailed.value = false;
  } catch {
    if (!preserveSnapshot) {
      expenseState.value = null;
      expenseLoadFailed.value = true;
    }
  } finally {
    if (!preserveSnapshot) expenseLoading.value = false;
  }
}

async function clearUsageHistory() {
  if (!window.confirm("Clear your tool usage history? This cannot be undone.")) return;
  usageClearing.value = true;
  try {
    await clearToolUsage();
    usageItems.value = [];
  } finally {
    usageClearing.value = false;
  }
}

async function reopenHistory(item: PaybackHistoryItem) {
  const payload = buildPaybackSharePayload({
    c: item.currency,
    t: buildPaybackRawFromRows(item.rows),
    krm: item.remainderMode,
    krp: item.remainderPayer,
  });
  await navigateTo({ path: "/tools/payback-calculator", query: { p: payload } });
}

async function removeHistory(item: PaybackHistoryItem) {
  if (!window.confirm("Delete this saved calculation? This cannot be undone.")) return;
  historyDeletingId.value = item.id;
  try {
    await $fetch(`/api/payback/history/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    historyItems.value = historyItems.value.filter((entry) => entry.id !== item.id);
    historyCount.value = Math.max(0, historyCount.value - 1);
  } finally {
    historyDeletingId.value = "";
  }
}

async function signOut() {
  isLoggingOut.value = true;
  try {
    await logout();
    signOutDialogOpen.value = false;
    await navigateTo("/");
  } finally {
    isLoggingOut.value = false;
  }
}

async function handleQuickExpenseSettingChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const nextEnabled = input.checked;
  quickExpenseSettingSaving.value = true;
  quickExpenseSettingError.value = "";

  try {
    const settings = await updateQuickExpenseEnabled(nextEnabled);
    if (expenseState.value) {
      expenseState.value = {
        ...expenseState.value,
        quickExpenseEnabled: settings.enabled,
      };
    }
  } catch {
    // Keep both the switch and floating action aligned with the last saved preference.
    input.checked = quickExpenseEnabled.value === true;
    quickExpenseSettingError.value = "Could not update the Quick Expense button. Please try again.";
  } finally {
    quickExpenseSettingSaving.value = false;
  }
}

async function toggleTelegramNotifications() {
  if (telegramNotificationDisabled.value) return;
  telegramNotificationSaving.value = true;
  telegramNotificationError.value = "";
  telegramNotificationStatus.value = "";

  try {
    if (telegramNotificationsEnabled.value) {
      await updateTelegramNotificationSettings(false);
      telegramNotificationStatus.value = "Telegram notifications are off.";
      return;
    }

    const telegram = getTelegramMiniApp();
    if (!telegram?.initData || typeof telegram.requestWriteAccess !== "function") {
      throw new Error("Telegram write access is unavailable");
    }

    // Telegram requires this native permission prompt to originate from the user's click.
    const allowed = await new Promise<boolean>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Telegram permission request timed out")), 15_000);
      telegram.requestWriteAccess?.((granted) => {
        window.clearTimeout(timeout);
        resolve(granted);
      });
    });
    if (!allowed) {
      telegramNotificationError.value = "Telegram notification permission was not granted.";
      return;
    }

    let timeZone = "Asia/Phnom_Penh";
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || timeZone;
    } catch {
      // Cambodia time is the safe product default when a WebView cannot expose its timezone.
    }
    await updateTelegramNotificationSettings(true, telegram.initData, timeZone);
    telegramNotificationStatus.value = "Daily 10:00 PM spending overview enabled. Check Telegram for confirmation.";
  } catch {
    telegramNotificationError.value = telegramNotificationsEnabled.value
      ? "Could not turn off Telegram notifications. Please try again."
      : "Could not enable Telegram notifications. Please try again.";
  } finally {
    telegramNotificationSaving.value = false;
  }
}

async function openMobileAccountSection(section: MobileAccountSection) {
  mobileAccountSection.value = section;
  await nextTick();
  scrollMobileAccountToTop();
}

async function closeMobileAccountSection() {
  mobileAccountSection.value = null;
  await nextTick();
  scrollMobileAccountToTop();
}

function scrollMobileAccountToTop() {
  // Each menu choice starts at the page heading while honoring motion preferences.
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
  window.scrollTo({ top: 0, behavior });
}

async function loadProfileData() {
  await Promise.allSettled([
    loadHistory(),
    loadToolUsage(),
    loadExpenseState(),
    loadTelegramNotificationSettings(),
  ]);
}

function refreshExpensesAfterQuickSave() {
  // The global quick form can save while the profile remains open, so refresh its account summary in place.
  void loadExpenseState(true);
}

onMounted(() => {
  const telegram = getTelegramMiniApp();
  isTelegramMiniApp.value = Boolean(telegram?.initData);
  if (route.query.google === "failed") {
    googleLinkError.value = "Google account linking was not completed. Please try again.";
  }
  if (needsGoogleLink.value) {
    void prepareGoogleLink();
    googleLinkRefreshTimer = window.setInterval(() => void prepareGoogleLink(), 4 * 60 * 1000);
  }
  void loadProfileData();
  window.addEventListener("chlatwork:quick-expense-saved", refreshExpensesAfterQuickSave);
});

onBeforeUnmount(() => {
  if (googleLinkRefreshTimer) window.clearInterval(googleLinkRefreshTimer);
  window.removeEventListener("chlatwork:quick-expense-saved", refreshExpensesAfterQuickSave);
});
</script>

<template>
  <main
    class="account-page pb-24 text-slate-950 sm:pb-0 dark:text-white"
    :class="mobileAccountSection ? 'space-y-4 sm:space-y-8' : 'space-y-8'"
  >
    <header class="account-heading border-b border-slate-200 dark:border-white/10" :class="mobileAccountSection ? 'pb-3 sm:pb-6' : 'pb-5 sm:pb-6'">
      <!-- Mobile sub-sections use a focused back header; desktop keeps the account context visible. -->
      <div v-if="mobileAccountSection" class="flex min-h-12 items-center gap-3 sm:hidden">
        <button
          type="button"
          class="grid size-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-[#082552] shadow-sm transition active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
          :aria-label="t(&quot;shared.pages_account.back_to_account_from&quot;, { mobileAccountSectionTitle: mobileAccountSectionTitle })"
          @click="closeMobileAccountSection"
        >
          <ChevronLeft class="size-5" aria-hidden="true" />
        </button>
        <h1 class="min-w-0 truncate text-lg font-semibold">{{ mobileAccountSectionTitle }}</h1>
      </div>
      <div :class="mobileAccountSection ? 'hidden sm:flex' : 'flex'" class="items-start justify-between gap-4">
        <div>
          <p class="hidden text-sm font-semibold text-sky-700 dark:text-cyan-300 sm:block">
            {{ t("shared.pages_account.your_chlat_work") }}
          </p>
          <h1 class="text-3xl font-semibold tracking-tight sm:mt-2">
            {{ t("shared.common.account") }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-white/50">
            {{ t("shared.pages_account.manage_your_profile_saved_work_and_tool_activity") }}
          </p>
        </div>
      </div>
    </header>

    <div class="account-workspace">
      <AccountDesktopNavigation
        :active-section="desktopAccountSection"
        :commands-enabled="websiteEnabled('developer-commands')"
        @select="openDesktopAccountSection"
      />
      <div
        id="account-desktop-content"
        ref="accountContent"
        class="account-content"
        :class="mobileAccountSection ? 'space-y-4 sm:space-y-8' : 'space-y-8'"
        tabindex="-1"
        role="region"
        :aria-label="t(&quot;shared.pages_account.account_content&quot;)"
      >
        <!-- These panels already provide their own heading beside their actions. -->
        <h2 v-if="!['moments', 'favorite-tools', 'favorite-commands'].includes(desktopAccountSection)" class="hidden text-xl font-semibold lg:block">{{ desktopAccountSectionTitle }}</h2>

    <section
      class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#101214] sm:rounded-2xl"
      :class="[{ 'hidden sm:block': mobileAccountSection }, desktopPanelClass('overview')]"
    >
      <div class="p-5 sm:p-6">
        <div class="flex items-center gap-4 sm:gap-5">
          <div class="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-xl font-semibold text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200 sm:size-20 sm:rounded-2xl sm:text-2xl">
            <img v-if="user?.avatarUrl" :src="user.avatarUrl" alt="" class="h-full w-full object-cover" referrerpolicy="no-referrer" />
            <span v-else lang="en">{{ initials }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-xl font-semibold">{{ user?.name || (t("shared.pages_account.chlat_work_user")) }}</h2>
            <p class="mt-1 truncate text-sm text-slate-500 dark:text-white/50">{{ user?.email || user?.phone || (t("shared.pages_account.signed_in_account")) }}</p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span class="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-200">
                {{ t("shared.pages_account.active_account") }}
              </span>
              <span v-if="user?.providers?.includes('GOOGLE')" class="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-300/10 dark:text-blue-200">
                {{ t("shared.pages_account.google_connected") }}
              </span>
              <button
                v-else-if="needsGoogleLink"
                type="button"
                :disabled="!googleLinkUrl"
                class="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60 dark:border-blue-300/25 dark:text-blue-200 dark:hover:bg-blue-300/10"
                @click="openGoogleLink"
              >
                <Link2 class="size-3.5" aria-hidden="true" /> {{ googleLinkUrl ? (t("shared.pages_account.link_google")) : (t("shared.pages_account.preparing_google")) }}
              </button>
            </div>
            <p v-if="googleLinkError" role="alert" class="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">{{ googleLinkError }}</p>
          </div>
          <button type="button" :disabled="isLoggingOut" class="hidden h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-400/25 dark:text-red-300 dark:hover:bg-red-400/10 sm:inline-flex" @click="signOutDialogOpen = true">
            <LogOut class="h-4 w-4" aria-hidden="true" /> {{ isLoggingOut ? (t("shared.pages_account.signing_out")) : (t("shared.pages_account.sign_out")) }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 border-t border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
        <div class="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-white/10 sm:border-r sm:p-5 lg:border-b-0">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200"><History class="h-5 w-5" aria-hidden="true" /></span>
          <div class="flex min-w-0 flex-col gap-1.5"><strong class="block text-xl leading-none">{{ historyLoading ? '—' : historyCount }}</strong><span class="block text-xs leading-4 text-slate-500 dark:text-white/45">{{ historyCount === 1 ? t("shared.counts.saved_calculation") : t("shared.counts.saved_calculations") }}</span></div>
        </div>
        <div class="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-white/10 sm:p-5 lg:border-b-0 lg:border-r">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300"><Heart class="h-5 w-5" aria-hidden="true" /></span>
          <div class="flex min-w-0 flex-col gap-1.5"><strong class="block text-xl leading-none">{{ favoriteTools.length }}</strong><span class="block text-xs leading-4 text-slate-500 dark:text-white/45">{{ favoriteTools.length === 1 ? t("shared.counts.favorite_tool") : t("shared.pages_account.favorite_tools") }}</span></div>
        </div>
        <div class="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-white/10 sm:border-b-0 sm:border-r sm:p-5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300"><UserRound class="h-5 w-5" aria-hidden="true" /></span>
          <div class="flex min-w-0 flex-col gap-1.5"><strong class="block text-xl leading-none">{{ favoriteCommands.length }}</strong><span class="block text-xs leading-4 text-slate-500 dark:text-white/45">{{ favoriteCommands.length === 1 ? t("shared.counts.saved_command") : t("shared.counts.saved_commands") }}</span></div>
        </div>
        <div class="flex items-center gap-3 p-4 sm:p-5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300"><Sparkles class="h-5 w-5" aria-hidden="true" /></span>
          <div class="flex min-w-0 flex-col gap-1.5"><strong class="block text-xl leading-none">{{ momentsInitialLoading || momentsUnavailable ? '—' : moments.length }}</strong><span class="block text-xs leading-4 text-slate-500 dark:text-white/45">{{ moments.length === 1 ? t("shared.counts.moment") : t("shared.layouts_default.moments") }}</span></div>
        </div>
      </div>
    </section>

    <section v-if="!mobileAccountSection" class="sm:hidden" aria-labelledby="account-menu-title">
      <h2 id="account-menu-title" class="text-lg font-semibold">{{ t("shared.pages_account.your_account") }}</h2>
      <div class="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
        <button type="button" class="flex min-h-[72px] w-full items-center gap-3 border-b border-slate-200 px-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 dark:border-white/10" aria-controls="profile-expense-section" @click="openMobileAccountSection('expenses')">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-300/10 dark:text-cyan-200"><ReceiptText class="size-5" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1">
            <strong class="block text-sm">{{ t("shared.pages_account.expense_tracker") }}</strong>
            <span v-if="expenseLoading" class="mt-1 block text-xs text-slate-500 dark:text-white/50">{{ t("shared.pages_account.loading_saved_expenses") }}</span>
            <span v-else-if="expenseSummary && expenseState" class="mt-1 flex min-w-0 flex-wrap gap-x-1 text-xs text-slate-500 dark:text-white/50">
              <span>{{ t("shared.pages_account.spent") }} <MoneyAmount :value="expenseSummary.totalSpent" :currency="expenseState.currency" /></span>
              <span aria-hidden="true">·</span>
              <span v-if="expenseSummary.budgetValue">{{ t("shared.pages_account.budget") }} <MoneyAmount :value="expenseSummary.budgetValue" :currency="expenseState.currency" /></span>
              <span v-else lang="en">{{ t("shared.pages_account.no_budget_set") }}</span>
            </span>
            <span v-else class="mt-1 block text-xs text-slate-500 dark:text-white/50">{{ t("shared.pages_account.expense_summary_unavailable") }}</span>
          </span>
          <ChevronRight class="size-5 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
        <label v-if="websiteEnabled('expense-tracker')" class="flex min-h-[72px] cursor-pointer items-center gap-3 border-b border-slate-200 px-4 dark:border-white/10">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-300"><ReceiptText class="size-5" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1"><strong class="block text-sm">{{ t("shared.pages_account.quick_expense_button") }}</strong><span class="mt-1 block text-xs text-slate-500 dark:text-white/50">{{ t("shared.pages_account.show_the_center_add_expense_action") }}</span></span>
          <span class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition" :class="quickExpenseEnabled ? 'bg-sky-600 dark:bg-cyan-200' : 'bg-slate-300 dark:bg-white/20'">
            <input :checked="quickExpenseEnabled === true" type="checkbox" class="peer sr-only" :disabled="quickExpenseSettingLoading || quickExpenseSettingSaving" :aria-label="t(&quot;shared.pages_account.show_quick_expense_button&quot;)" @change="handleQuickExpenseSettingChange" />
            <span class="ml-1 size-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5 dark:peer-checked:bg-slate-950" aria-hidden="true" />
          </span>
        </label>
        <button
          type="button"
          role="switch"
          :aria-checked="telegramNotificationsEnabled"
          :disabled="telegramNotificationDisabled"
          class="flex min-h-[72px] w-full items-center gap-3 border-b border-slate-200 px-4 text-left disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10"
          @click="toggleTelegramNotifications"
        >
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-300/10 dark:text-blue-200"><BellRing class="size-5" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1"><strong class="block text-sm">{{ t("shared.pages_account.telegram_notifications") }}</strong><span class="mt-1 block text-xs text-slate-500 dark:text-white/50">{{ telegramNotificationDescription }}</span></span>
          <span class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition" :class="telegramNotificationsEnabled ? 'bg-sky-600 dark:bg-cyan-200' : 'bg-slate-300 dark:bg-white/20'">
            <span class="ml-1 size-5 rounded-full bg-white shadow-sm transition" :class="telegramNotificationsEnabled ? 'translate-x-5 dark:bg-slate-950' : ''" aria-hidden="true" />
          </span>
        </button>
        <TelegramPhoneSetting
          mobile
          :enabled="telegramPhoneEnabled"
          :disabled="telegramPhoneDisabled"
          :description="telegramPhoneDescription"
          :error="telegramPhoneError"
          :status="telegramPhoneStatus"
          @toggle="toggleTelegramPhone"
        />
        <button
          type="button"
          class="flex min-h-[72px] w-full items-center gap-3 border-b border-slate-200 px-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 dark:border-white/10"
          :aria-label="nextColorModeLabel"
          :title="nextColorModeLabel"
          @click="toggleColorMode"
        >
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-indigo-300/10 dark:text-indigo-200">
            <Moon v-if="isDark" class="size-5" aria-hidden="true" />
            <Sun v-else class="size-5" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <strong class="block text-sm">{{ t("shared.pages_account.appearance") }}</strong>
            <span class="mt-1 block text-xs text-slate-500 dark:text-white/50">{{ t("shared.pages_account.choose_how_chlat_work_looks") }}</span>
          </span>
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-white/65"><span v-if="isKhmer">{{ isDark ? t("shared.appearance.dark") : t("shared.appearance.light") }}</span><span v-else lang="en">{{ isDark ? t("shared.appearance.dark") : t("shared.appearance.light") }}</span></span>
        </button>
        <button type="button" class="flex min-h-[72px] w-full items-center gap-3 border-b border-slate-200 px-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 dark:border-white/10" aria-controls="profile-moments" @click="openMobileAccountSection('moments')">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300"><Sparkles class="size-5" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1"><strong class="block text-sm">{{ t("shared.pages_account.your_moments") }}</strong><span class="mt-1 block text-xs text-slate-500 dark:text-white/50">{{ momentsInitialLoading ? (t("shared.pages_account.loading_moments")) : momentsUnavailable ? (t("shared.pages_account.moments_unavailable")) : (t("shared.pages_account.message", { momentsLength: moments.length, MomentMoments: moments.length === 1 ? "Moment" : "Moments" })) }}</span></span>
          <ChevronRight class="size-5 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
        <button type="button" class="flex min-h-[72px] w-full items-center gap-3 border-b border-slate-200 px-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 dark:border-white/10" aria-controls="profile-payback-history" @click="openMobileAccountSection('payback')">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200"><History class="size-5" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1"><strong class="block text-sm">{{ t("shared.pages_account.pay_back_history") }}</strong><span class="mt-1 block text-xs text-slate-500 dark:text-white/50">{{ historyLoading ? (t("shared.pages_account.loading_calculations")) : (t("shared.pages_account.saved", { historyCount: historyCount, historyCountCalculationCalculations: historyCount === 1 ? "calculation" : "calculations" })) }}</span></span>
          <ChevronRight class="size-5 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
        <button type="button" class="flex min-h-[72px] w-full items-center gap-3 border-b border-slate-200 px-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 dark:border-white/10" aria-controls="profile-most-used-tools" @click="openMobileAccountSection('activity')">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-300/10 dark:text-amber-300"><BarChart3 class="size-5" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1"><strong class="block text-sm">{{ t("shared.pages_account.tool_activity") }}</strong><span class="mt-1 block text-xs text-slate-500 dark:text-white/50">{{ t("shared.pages_account.your_most_used_chlat_work_tools") }}</span></span>
          <ChevronRight class="size-5 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
        <button type="button" class="flex min-h-[72px] w-full items-center gap-3 border-b border-slate-200 px-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 dark:border-white/10" aria-controls="favorite-tools" @click="openMobileAccountSection('favorite-tools')">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300"><Heart class="size-5" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1"><strong class="block text-sm">{{ t("shared.pages_account.favorite_tools") }}</strong><span class="mt-1 block text-xs text-slate-500 dark:text-white/50">{{ t("shared.pages_account.saved_2", { favoriteToolsLength: favoriteTools.length, toolTools: favoriteTools.length === 1 ? "tool" : "tools" }) }}</span></span>
          <ChevronRight class="size-5 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
        <button v-if="websiteEnabled('developer-commands')" type="button" class="flex min-h-[72px] w-full items-center gap-3 px-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500" aria-controls="favorite-commands" @click="openMobileAccountSection('favorite-commands')">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300"><UserRound class="size-5" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1"><strong class="block text-sm">{{ t("shared.pages_account.favorite_commands") }}</strong><span class="mt-1 block text-xs text-slate-500 dark:text-white/50">{{ t("shared.pages_account.saved_3", { favoriteCommandsLength: favoriteCommands.length, commandCommands: favoriteCommands.length === 1 ? "command" : "commands" }) }}</span></span>
          <ChevronRight class="size-5 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
      </div>
      <p v-if="quickExpenseSettingError" role="alert" class="mt-2 px-1 text-xs font-semibold text-red-600 dark:text-red-300">{{ quickExpenseSettingError }}</p>
      <p v-if="telegramNotificationError" role="alert" class="mt-2 px-1 text-xs font-semibold text-red-600 dark:text-red-300">{{ telegramNotificationError }}</p>
      <p v-else-if="telegramNotificationStatus" role="status" class="mt-2 px-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{{ telegramNotificationStatus }}</p>
    </section>

    <section :class="desktopPanelClass('settings')" v-if="websiteEnabled('expense-tracker')" class="hidden items-center justify-between gap-4 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-cyan-300/20 dark:bg-cyan-300/[0.06] sm:flex">
      <span>
        <strong class="block text-sm">{{ t("shared.pages_account.quick_expense_button") }}</strong>
        <span class="mt-1 block text-xs text-slate-600 dark:text-white/55">{{ t("shared.pages_account.show_the_floating_add_expense_action_while_you_are") }}</span>
        <span v-if="quickExpenseSettingError" class="mt-1 block text-xs font-semibold text-red-600 dark:text-red-300">{{ quickExpenseSettingError }}</span>
      </span>
      <label class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition" :class="quickExpenseEnabled ? 'bg-sky-600 dark:bg-cyan-200' : 'bg-slate-300 dark:bg-white/20'">
        <input :checked="quickExpenseEnabled === true" type="checkbox" class="peer sr-only" :disabled="quickExpenseSettingLoading || quickExpenseSettingSaving" :aria-label="t(&quot;shared.pages_account.show_quick_expense_button&quot;)" @change="handleQuickExpenseSettingChange" />
        <span class="ml-1 size-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5 dark:peer-checked:bg-slate-950" aria-hidden="true" />
      </label>
    </section>

    <section :class="desktopPanelClass('settings')" class="hidden items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-300/20 dark:bg-blue-300/[0.06] sm:flex">
      <span class="flex min-w-0 items-center gap-3">
        <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-300/10 dark:text-blue-200"><BellRing class="size-5" aria-hidden="true" /></span>
        <span class="min-w-0">
          <strong class="block text-sm">{{ t("shared.pages_account.telegram_notifications") }}</strong>
          <span class="mt-1 block text-xs text-slate-600 dark:text-white/55">{{ telegramNotificationDescription }}</span>
          <span v-if="telegramNotificationError" role="alert" class="mt-1 block text-xs font-semibold text-red-600 dark:text-red-300">{{ telegramNotificationError }}</span>
          <span v-else-if="telegramNotificationStatus" role="status" class="mt-1 block text-xs font-semibold text-emerald-700 dark:text-emerald-300">{{ telegramNotificationStatus }}</span>
        </span>
      </span>
      <button
        type="button"
        role="switch"
        :aria-checked="telegramNotificationsEnabled"
        :disabled="telegramNotificationDisabled"
        class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60"
        :class="telegramNotificationsEnabled ? 'bg-sky-600 dark:bg-cyan-200' : 'bg-slate-300 dark:bg-white/20'"
        :aria-label="t(&quot;shared.pages_account.telegram_notifications&quot;)"
        @click="toggleTelegramNotifications"
      >
        <span class="ml-1 size-5 rounded-full bg-white shadow-sm transition" :class="telegramNotificationsEnabled ? 'translate-x-5 dark:bg-slate-950' : ''" aria-hidden="true" />
      </button>
    </section>

    <TelegramPhoneSetting
      :class="[desktopPanelClass('settings'), { 'hidden sm:block': mobileAccountSection }]"
      :enabled="telegramPhoneEnabled"
      :disabled="telegramPhoneDisabled"
      :description="telegramPhoneDescription"
      :error="telegramPhoneError"
      :status="telegramPhoneStatus"
      @toggle="toggleTelegramPhone"
    />

    <NuxtLink :class="[desktopPanelClass('overview'), { 'hidden sm:flex': mobileAccountSection }]" v-if="websiteEnabled('chlatwork-link')" to="/account/link" class="flex items-center gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-cyan-300/20 dark:bg-cyan-300/5">
      <Link2 class="size-6 shrink-0 text-sky-600 dark:text-cyan-300" aria-hidden="true" />
      <span class="flex-1"><strong class="block text-sm">{{ t("shared.pages_account.chlat_work_link") }}</strong><span class="mt-1 block text-xs text-slate-500 dark:text-white/60">{{ t("shared.pages_account.create_your_public_page_add_your_links_share_anywhere") }}</span></span>
      <ChevronRight class="size-5 text-sky-600 dark:text-cyan-300" aria-hidden="true" />
    </NuxtLink>

    <section
      id="profile-expense-section"
      class="sm:rounded-2xl sm:border sm:border-cyan-200 sm:bg-cyan-50/60 sm:p-6 dark:sm:border-cyan-300/20 dark:sm:bg-cyan-300/[0.06]"
      :class="[mobileAccountSection === 'expenses' ? 'block' : 'hidden sm:block', desktopPanelClass('expenses')]"
      :aria-label="t(&quot;shared.pages_account.expense_tracker&quot;)"
    >
      <div class="space-y-3 sm:hidden">
        <div v-if="expenseLoading" class="space-y-3" :aria-label="t(&quot;shared.pages_account.loading_expense_summary&quot;)">
          <div class="h-44 animate-pulse rounded-3xl bg-slate-100 dark:bg-white/[0.06]" />
          <div class="grid grid-cols-2 gap-2"><div class="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.06]" /><div class="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.06]" /></div>
        </div>

        <div v-else-if="expenseLoadFailed" class="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-200" role="alert">
          {{ t("shared.pages_account.your_expense_summary_is_temporarily_unavailable_you_can_still") }}
        </div>

        <div v-else-if="expenseSummary && expenseState" class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.05]" :aria-label="t(&quot;shared.pages_account.saved_expense_summary&quot;)">
          <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
            <span class="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-white/45">{{ expenseSummary.rangeLabel }}</span>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-white/60">{{ t("shared.pages_account.saved_4", { savedExpenseCount: savedExpenseCount }) }}</span>
          </div>

          <div class="p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <span class="text-xs font-semibold text-slate-500 dark:text-white/45">{{ t("shared.pages_account.total_spent") }}</span>
                <strong class="mt-1 block text-3xl tracking-tight text-slate-950 dark:text-white"><MoneyAmount :value="expenseSummary.totalSpent" :currency="expenseState.currency" wrap /></strong>
              </div>
              <span class="rounded-xl bg-cyan-100 px-2.5 py-1.5 text-xs font-bold text-cyan-800 dark:bg-cyan-300/10 dark:text-cyan-200">{{ expenseState.currency }}</span>
            </div>

            <div v-if="expenseSummary.budgetValue" class="mt-5">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="block text-xs text-slate-500 dark:text-white/45"><template v-if="isKhmer">{{ t("shared.markup_app_pages_account_vue.budget_period_budget", { budget_period: t(expenseState.budget.period === 'weekly' ? "shared.budget.weekly" : "shared.budget.monthly") }) }}</template><template v-else lang="en">{{ t("shared.markup_app_pages_account_vue.budget_period_budget", { budget_period: t(expenseState.budget.period === 'weekly' ? "shared.budget.weekly" : "shared.budget.monthly") }) }}</template></span>
                  <strong class="mt-1 block text-base"><MoneyAmount :value="expenseSummary.budgetValue" :currency="expenseState.currency" wrap /></strong>
                </div>
                <div class="text-right">
                  <span class="block text-xs" :class="expenseSummary.budgetRemaining < 0 ? 'text-red-600 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'">
                    <template v-if="isKhmer">{{ expenseSummary.budgetRemaining < 0 ? t("shared.budget.over_budget") : t("shared.budget.remaining") }}</template>
                    <template v-else lang="en">{{ expenseSummary.budgetRemaining < 0 ? t("shared.budget.over_budget") : t("shared.budget.remaining") }}</template>
                  </span>
                  <strong class="mt-1 block text-base"><MoneyAmount :value="Math.abs(expenseSummary.budgetRemaining)" :currency="expenseState.currency" wrap /></strong>
                </div>
              </div>
              <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" aria-hidden="true">
                <div class="h-full rounded-full transition-[width]" :class="expenseSummary.budgetRemaining < 0 ? 'bg-red-500' : 'bg-cyan-500'" :style="{ width: `${Math.min(100, Math.max(0, expenseSummary.budgetPercent))}%` }" />
              </div>
              <p class="mt-1.5 text-right text-[11px] text-slate-500 dark:text-white/45">{{ t("shared.pages_account.used", { expenseSummaryBudgetPercent: expenseSummary.budgetPercent }) }}</p>
            </div>

            <div v-else class="mt-5 rounded-2xl bg-slate-50 px-3.5 py-3 text-sm text-slate-600 dark:bg-white/[0.05] dark:text-white/55">
              {{ t("shared.pages_account.no_budget_set_yet_open_the_tracker_to_add") }}
            </div>
          </div>
        </div>

        <div v-if="websiteEnabled('expense-tracker')" class="grid gap-2" :class="quickExpenseEnabled ? 'grid-cols-2' : 'grid-cols-1'">
          <button
            v-if="quickExpenseEnabled"
            type="button"
            class="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-cyan-200 dark:text-slate-950"
            @click="openQuickExpense"
          >
            <Plus class="size-4" aria-hidden="true" /><span v-if="isKhmer">{{ t("shared.components_layout_product_navigation.add_expense") }}</span><span v-else lang="en">{{ t("shared.components_layout_product_navigation.add_expense") }}</span> <!-- > Add expense -->
          </button>
          <NuxtLink to="/tools/expense-tracker" class="inline-flex min-h-12 items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-[#082552] shadow-sm transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
            {{ t("shared.pages_account.open_tracker") }} <ChevronRight class="size-4" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>

      <div class="hidden gap-4 sm:flex sm:flex-row sm:items-center">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-300/10 dark:text-cyan-200" aria-hidden="true">
          <ReceiptText class="h-6 w-6" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 id="profile-expense-tracker" class="text-xl font-semibold">{{ t("shared.pages_account.expense_tracker") }}</h2>
            <span v-if="expenseState" class="rounded-lg bg-white/80 px-2 py-1 text-xs font-bold text-cyan-800 dark:bg-white/10 dark:text-cyan-200">
              {{ expenseState.currency }}
            </span>
            <span v-if="expenseState?.quickExpenseEnabled" class="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-200">
              <template v-if="isKhmer">{{ t("shared.markup_app_pages_account_vue.quick_add_on") }}</template><template v-else lang="en">{{ t("shared.markup_app_pages_account_vue.quick_add_on") }}</template>
            </span>
          </div>
          <p v-if="expenseLoading" class="mt-2 text-sm text-slate-500 dark:text-white/50">{{ t("shared.pages_account.loading_your_saved_expenses") }}</p>
          <p v-else-if="expenseLoadFailed" class="mt-2 text-sm text-red-600 dark:text-red-300">{{ t("shared.pages_account.your_saved_expense_summary_is_temporarily_unavailable") }}</p>
          <p v-else class="mt-2 text-sm text-slate-600 dark:text-white/55">
            <template v-if="isKhmer">{{ t("shared.markup_app_pages_account_vue.saved_expense_count_expense_expenses_saved_to_your_account", { savedExpenseCount: savedExpenseCount, expense_expenses: savedExpenseCount === 1 ? "expense" : "expenses" }) }}</template>
            <template v-else lang="en">{{ t("shared.markup_app_pages_account_vue.saved_expense_count_expense_expenses_saved_to_your_account", { savedExpenseCount: savedExpenseCount, expense_expenses: savedExpenseCount === 1 ? "expense" : "expenses" }) }}</template>
          </p>

          <div v-if="expenseSummary && expenseState" class="mt-4 grid grid-cols-2 gap-2" :aria-label="t(&quot;shared.pages_account.saved_expense_summary&quot;)">
            <div class="min-w-0 rounded-xl bg-white/80 p-3 dark:bg-white/[0.06]">
              <span class="block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-white/45">
                <template v-if="isKhmer">{{ t("shared.markup_app_pages_account_vue.spent_expense_summary_range_label", { expenseSummary_rangeLabel: expenseSummary.rangeLabel }) }}</template>
                <template v-else lang="en">{{ t("shared.markup_app_pages_account_vue.spent_expense_summary_range_label", { expenseSummary_rangeLabel: expenseSummary.rangeLabel }) }}</template>
              </span>
              <strong class="mt-1 block min-w-0 text-lg text-slate-950 dark:text-white"><MoneyAmount :value="expenseSummary.totalSpent" :currency="expenseState.currency" wrap /></strong>
            </div>
            <div class="min-w-0 rounded-xl bg-white/80 p-3 dark:bg-white/[0.06]">
              <span class="block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-white/45">
                <template v-if="isKhmer">{{ t("shared.markup_app_pages_account_vue.budget_period_budget", { budget_period: t(expenseState.budget.period === 'weekly' ? "shared.budget.weekly" : "shared.budget.monthly") }) }}</template>
                <template v-else lang="en">{{ t("shared.markup_app_pages_account_vue.budget_period_budget", { budget_period: t(expenseState.budget.period === 'weekly' ? "shared.budget.weekly" : "shared.budget.monthly") }) }}</template>
              </span>
              <strong v-if="expenseSummary.budgetValue" class="mt-1 block min-w-0 text-lg text-slate-950 dark:text-white"><MoneyAmount :value="expenseSummary.budgetValue" :currency="expenseState.currency" wrap /></strong>
              <strong v-else class="mt-1 block text-sm text-slate-500 dark:text-white/45">{{ t("shared.pages_account.not_set") }}</strong>
            </div>
            <div v-if="expenseSummary.budgetValue" class="col-span-2 rounded-xl bg-white/80 p-3 dark:bg-white/[0.06]">
              <div class="flex items-center justify-between gap-3 text-xs font-semibold">
                <span :class="expenseSummary.budgetRemaining < 0 ? 'text-red-600 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'">
                  <template v-if="isKhmer">{{ expenseSummary.budgetRemaining < 0 ? t("shared.budget.over_budget") : t("shared.budget.remaining") }}</template>
                  <template v-else lang="en">{{ expenseSummary.budgetRemaining < 0 ? t("shared.budget.over_budget") : t("shared.budget.remaining") }}</template>
                </span>
                <MoneyAmount :value="Math.abs(expenseSummary.budgetRemaining)" :currency="expenseState.currency" />
              </div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" aria-hidden="true">
                <div
                  class="h-full rounded-full transition-[width]"
                  :class="expenseSummary.budgetRemaining < 0 ? 'bg-red-500' : 'bg-cyan-500'"
                  :style="{ width: `${Math.min(100, Math.max(0, expenseSummary.budgetPercent))}%` }"
                />
              </div>
              <p class="mt-1 text-right text-[10px] text-slate-500 dark:text-white/45">{{ t("shared.pages_account.used", { expenseSummaryBudgetPercent: expenseSummary.budgetPercent }) }}</p>
            </div>
          </div>
        </div>
        <NuxtLink v-if="websiteEnabled('expense-tracker')" to="/tools/expense-tracker" class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100">
          {{ t("shared.pages_account.open_tracker") }}
        </NuxtLink>
      </div>
    </section>

    <section class="space-y-4" :class="[mobileAccountSection === 'moments' ? 'block' : 'hidden sm:block', desktopPanelClass('moments')]" aria-labelledby="profile-moments">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300"><Sparkles class="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <h2 id="profile-moments" class="sr-only sm:not-sr-only sm:text-xl sm:font-semibold">{{ t("shared.pages_account.your_moments") }}</h2>
            <p class="text-sm text-slate-500 dark:text-white/50 sm:mt-1">{{ t("shared.pages_account.celebration_pages_you_created_for_someone_special") }}</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <NuxtLink :to="localizeMomentPath('/moments/create')" class="inline-flex rounded-xl bg-rose-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">{{ t("shared.pages_account.create_moment") }}</NuxtLink>
          <NuxtLink :to="localizeMomentPath('/moments')" class="text-sm font-semibold text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-200">{{ t("shared.pages_account.manage_all") }}</NuxtLink>
        </div>
      </div>

      <div v-if="momentsInitialLoading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" :aria-label="t(&quot;shared.pages_account.loading_moments_2&quot;)">
        <div v-for="index in 3" :key="index" class="h-52 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.06]" />
      </div>
      <div v-else-if="momentsUnavailable" class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-200" role="alert">
        {{ t("shared.pages_account.your_moments_could_not_be_loaded_refresh_the_page") }}
      </div>
      <ul v-else-if="moments.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="moment in moments" :key="moment.id" class="min-w-0">
          <MomentSummaryCard :moment="moment" />
        </li>
      </ul>
      <div v-else class="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-6 text-center dark:border-rose-300/20 dark:bg-rose-300/5">
        <p class="text-sm text-slate-600 dark:text-white/55">{{ t("shared.pages_account.you_have_not_created_a_moment_yet") }}</p>
        <NuxtLink :to="localizeMomentPath('/moments/create')" class="mt-2 inline-flex text-sm font-semibold text-rose-700 dark:text-rose-300">{{ t("shared.pages_account.create_your_first_moment") }}</NuxtLink>
      </div>
    </section>

    <ConfirmDialog
      :open="signOutDialogOpen"
      :title="t(&quot;shared.pages_account.sign_out_of_chlat_work&quot;)"
      :description="t(&quot;shared.pages_account.you_ll_need_to_sign_in_again_to_access&quot;)"
      :confirm-label="t(&quot;shared.pages_account.sign_out&quot;)"
      :cancel-label="t(&quot;shared.pages_account.stay_signed_in&quot;)"
      :busy="isLoggingOut"
      :busy-label="t(&quot;shared.pages_account.signing_out&quot;)"
      @close="signOutDialogOpen = false"
      @confirm="signOut"
    />

    <section id="profile-payback-history" class="scroll-mt-24" :class="[mobileAccountSection === 'payback' ? 'block' : 'hidden sm:block', desktopPanelClass('payback')]">
      <PaybackCalculatorHistory :items="historyItems" :loading="historyLoading" :deleting-id="historyDeletingId" @load="reopenHistory" @remove="removeHistory" />
    </section>

    <section id="profile-most-used-tools" class="scroll-mt-24 space-y-4" :class="[mobileAccountSection === 'activity' ? 'block' : 'hidden sm:block', desktopPanelClass('activity')]" aria-labelledby="profile-most-used-tools-title">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-300/10 dark:text-amber-300"><BarChart3 class="h-5 w-5" aria-hidden="true" /></span>
          <div><h2 id="profile-most-used-tools-title" class="text-xl font-semibold">{{ t("shared.pages_account.most_used_tools") }}</h2><p class="mt-1 text-sm text-slate-500 dark:text-white/50">{{ t("shared.pages_account.based_only_on_tool_pages_opened_while_signed_in") }}</p></div>
        </div>
        <button v-if="mostUsedTools.length" type="button" :disabled="usageClearing" class="text-sm font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-300 dark:hover:text-red-200" @click="clearUsageHistory">{{ usageClearing ? (t("shared.pages_account.clearing")) : (t("shared.pages_account.clear_history")) }}</button>
      </div>
      <div v-if="usageLoading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" :aria-label="t(&quot;shared.pages_account.loading_tool_usage&quot;)">
        <div v-for="index in 3" :key="index" class="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.06]" />
      </div>
      <ul v-else-if="mostUsedTools.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="item in mostUsedTools" :key="item.toolKey">
          <NuxtLink :to="item.tool.route" class="flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-400 hover:bg-sky-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/40 dark:hover:bg-white/[0.08]">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl" :class="getToolIconTone(item.toolKey)" aria-hidden="true"><ToolIcon :name="item.toolKey" class="size-6" /></span>
            <span class="min-w-0 flex-1"><strong class="block truncate text-sm">{{ item.tool.name }}</strong><span class="mt-1 block text-xs text-slate-500 dark:text-white/50">{{ t("shared.pages_account.opened", { itemUsageCount: item.usageCount, timeTimes: item.usageCount === 1 ? 'time' : 'times' }) }}</span></span>
          </NuxtLink>
        </li>
      </ul>
      <div v-else class="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-white/15"><p class="text-sm text-slate-500 dark:text-white/50">{{ t("shared.pages_account.use_a_tool_while_signed_in_and_it_will") }}</p><NuxtLink to="/tools" class="mt-2 inline-flex text-sm font-semibold text-sky-700 dark:text-cyan-300">{{ t("shared.pages_account.browse_tools") }}</NuxtLink></div>
    </section>

    <section id="favorite-tools" class="scroll-mt-24 space-y-4" :class="[mobileAccountSection === 'favorite-tools' ? 'block' : 'hidden sm:block', desktopPanelClass('favorite-tools')]" aria-labelledby="profile-favorite-tools">
      <div class="flex items-center justify-between gap-4">
        <div><h2 id="profile-favorite-tools" class="sr-only sm:not-sr-only sm:text-xl sm:font-semibold">{{ t("shared.pages_account.favorite_tools") }}</h2><p class="text-sm text-slate-500 dark:text-white/50 sm:mt-1">{{ t("shared.pages_account.synced_securely_to_your_signed_in_account") }}</p></div>
        <NuxtLink to="/tools" class="text-sm font-semibold text-sky-700 dark:text-cyan-300">{{ t("shared.pages_account.browse_tools_2") }}</NuxtLink>
      </div>
      <div v-if="!favoritesReady" class="h-28 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none dark:bg-white/[0.06]" :aria-label="t(&quot;shared.pages_account.loading_favorite_tools&quot;)" />
      <div v-else-if="favoriteError" role="alert" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">{{ favoriteError }}</div>
      <ul v-else-if="favoriteTools.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="tool in favoriteTools" :key="tool.key"><HomeToolCard :tool="tool" /></li>
      </ul>
      <div v-else class="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-white/15"><p class="text-sm text-slate-500 dark:text-white/50">{{ t("shared.pages_account.you_have_no_favorite_tools_yet") }}</p><NuxtLink to="/tools" class="mt-2 inline-flex text-sm font-semibold text-sky-700 dark:text-cyan-300">{{ t("shared.pages_account.browse_tools") }}</NuxtLink></div>
    </section>

    <section v-if="websiteEnabled('developer-commands')" id="favorite-commands" class="scroll-mt-24 space-y-4" :class="[mobileAccountSection === 'favorite-commands' ? 'block' : 'hidden sm:block', desktopPanelClass('favorite-commands')]" aria-labelledby="profile-favorite-commands">
      <div class="flex items-center justify-between gap-4"><h2 id="profile-favorite-commands" class="sr-only sm:not-sr-only sm:text-xl sm:font-semibold">{{ t("shared.pages_account.favorite_commands") }}</h2><NuxtLink to="/developer-commands" class="text-sm font-semibold text-sky-700 dark:text-cyan-300">{{ t("shared.pages_account.command_hub") }}</NuxtLink></div>
      <div v-if="!favoritesReady" class="h-24 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none dark:bg-white/[0.06]" :aria-label="t(&quot;shared.pages_account.loading_favorite_commands&quot;)" />
      <div v-else-if="favoriteError" role="alert" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">{{ favoriteError }}</div>
      <div v-else-if="favoriteCommands.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"><CommandQuickCard v-for="command in favoriteCommands" :key="command.id" :item="command" favorite :saving="isCommandFavoriteSaving(command.id)" @favorite="toggleCommandFavorite(command.id)" @copied="() => undefined" /></div>
      <div v-else class="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-white/15"><p class="text-sm text-slate-500 dark:text-white/50">{{ t("shared.pages_account.you_have_no_favorite_commands_yet") }}</p><NuxtLink to="/developer-commands" class="mt-2 inline-flex text-sm font-semibold text-sky-700 dark:text-cyan-300">{{ t("shared.pages_account.browse_commands") }}</NuxtLink></div>
    </section>

    <section :class="[desktopPanelClass('information'), mobileAccountSection ? 'hidden lg:block' : 'sm:hidden lg:block']" class="space-y-6" :aria-label="t(&quot;shared.pages_account.chlat_work_information&quot;)">
      <section v-for="group in accountInformationGroups" :key="group.key" :aria-labelledby="`account-${group.key}-title`">
        <h2 :id="`account-${group.key}-title`" class="px-1 text-lg font-semibold">{{ t(group.title) }}</h2>
        <div class="mt-3 divide-y divide-slate-200 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.05]">
          <template v-for="item in group.items" :key="item.label">
            <button
              v-if="item.action"
              type="button"
              class="flex min-h-[68px] w-full items-center gap-3 px-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
              @click="openPrivacyCookieSettings"
            >
              <span class="grid size-10 shrink-0 place-items-center rounded-xl" :class="group.iconTone"><component :is="item.icon" class="size-5" aria-hidden="true" /></span>
              <span class="min-w-0 flex-1 text-sm font-semibold">{{ t(item.label) }}</span>
              <ChevronRight class="size-5 shrink-0 text-slate-400 dark:text-white/35" aria-hidden="true" />
            </button>
            <a
              v-else-if="item.href"
              :href="item.href"
              class="flex min-h-[68px] w-full items-center gap-3 px-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
            >
              <span class="grid size-10 shrink-0 place-items-center rounded-xl" :class="group.iconTone"><component :is="item.icon" class="size-5" aria-hidden="true" /></span>
              <span class="min-w-0 flex-1 text-sm font-semibold">{{ t(item.label) }}</span>
              <ChevronRight class="size-5 shrink-0 text-slate-400 dark:text-white/35" aria-hidden="true" />
            </a>
            <NuxtLink
              v-else
              :to="accountInformationRoute(item.to)"
              class="flex min-h-[68px] w-full items-center gap-3 px-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
            >
              <span class="grid size-10 shrink-0 place-items-center rounded-xl" :class="group.iconTone"><component :is="item.icon" class="size-5" aria-hidden="true" /></span>
              <span class="min-w-0 flex-1 text-sm font-semibold">{{ t(item.label) }}</span>
              <ChevronRight class="size-5 shrink-0 text-slate-400 dark:text-white/35" aria-hidden="true" />
            </NuxtLink>
          </template>
        </div>
      </section>
    </section>

    <section :class="desktopPanelClass('settings')" class="hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#101214] lg:block" :aria-label="t(&quot;shared.pages_account.appearance_settings&quot;)">
      <div class="flex items-center justify-between gap-4">
        <div><h3 class="text-sm font-semibold"><span v-if="isKhmer">{{ t("shared.markup_app_pages_account_vue.appearance") }}</span><span v-else lang="en">{{ t("shared.markup_app_pages_account_vue.appearance") }}</span> <!-- >Appearance< --></h3><p class="mt-1 text-xs text-slate-500 dark:text-white/50"><template v-if="isKhmer">{{ t("shared.markup_app_pages_account_vue.choose_how_chlat_work_looks") }}</template><template v-else lang="en">{{ t("shared.markup_app_pages_account_vue.choose_how_chlat_work_looks") }}</template></p></div>
        <button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:border-white/15" :aria-label="nextColorModeLabel" @click="toggleColorMode()">
          <Moon v-if="isDark" class="size-4" aria-hidden="true" /><Sun v-else class="size-4" aria-hidden="true" />
          <span v-if="isKhmer">{{ isDark ? t("shared.appearance.dark") : t("shared.appearance.light") }}</span><span v-else lang="en">{{ isDark ? t("shared.appearance.dark") : t("shared.appearance.light") }}</span>
        </button>
      </div>
    </section>

    <button
      v-if="!mobileAccountSection"
      type="button"
      :disabled="isLoggingOut"
      class="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50/70 px-4 text-left text-red-700 disabled:opacity-50 dark:border-red-400/20 dark:bg-red-400/[0.08] dark:text-red-300 sm:hidden"
      @click="signOutDialogOpen = true"
    >
      <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-red-100 dark:bg-red-400/10"><LogOut class="size-5" aria-hidden="true" /></span>
      <span><strong class="block text-sm">{{ isLoggingOut ? (t("shared.pages_account.signing_out")) : (t("shared.pages_account.sign_out")) }}</strong><span class="mt-1 block text-xs font-medium opacity-70"><template v-if="isKhmer">{{ t("shared.markup_app_pages_account_vue.sign_out_from_your_chlat_work_account") }}</template><template v-else lang="en">{{ t("shared.markup_app_pages_account_vue.sign_out_from_your_chlat_work_account") }}</template></span></span>
    </button>

      </div>
    </div>
  </main>
</template>

<style scoped>
@media (min-width: 1024px) {
  .account-page {
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    gap: 1.25rem;
  }

  .account-page > * + * {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }

  .account-heading {
    flex-shrink: 0;
    padding-bottom: 1rem;
  }

  .account-workspace {
    display: grid;
    min-height: 0;
    flex: 1;
    grid-template-columns: clamp(10rem, 22%, 15rem) minmax(0, 1fr);
    gap: 1.25rem;
  }

  .account-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    border: 1px solid rgb(148 163 184 / 25%);
    border-radius: 1rem;
    padding: 1.5rem 1.5rem 5rem;
    scrollbar-gutter: stable;
  }

  .account-content > * {
    flex-shrink: 0;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }

  .account-panel-hidden {
    display: none !important;
  }
}
</style>
