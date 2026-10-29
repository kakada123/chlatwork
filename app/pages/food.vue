<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, watch, nextTick } from "vue";
import {
  Utensils,
  ChefHat,
  Dices,
  MapPin,
  Users,
  DollarSign,
  Compass,
  Share2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Info,
} from "lucide-vue-next";
import {
  useFoodDiscovery,
} from "~/composables/useFoodDiscovery";
import FoodDiscoveryMap from "~/components/food/FoodDiscoveryMap.vue";
import FoodDiscoveryFilters from "~/components/food/FoodDiscoveryFilters.vue";
import FoodPlaceAttribution from "~/components/food/FoodPlaceAttribution.vue";
import FoodQuickFilters from "~/components/food/FoodQuickFilters.vue";
import FoodSavedRecipes from "~/components/food/FoodSavedRecipes.vue";
import FoodMenuCatalog from "~/components/food/FoodMenuCatalog.vue";
import FoodMobileDiscovery from "~/components/food/FoodMobileDiscovery.vue";
import type { FoodMenuItem } from "~~/api/src/food/catalog/food-menu.contract";
import { useAuth } from "~/composables/useAuth";

definePageMeta({
  layout: "food",
});

const {
  activeQuickPreset, selectQuickPreset, selectCatalogFood, savedRecipesVersion, setDiscoveryAccount,
  filters, filterDefinitions, filtersError, fetchFilters, locationQuery, routeOrigin, routeDestination, allergies, minimumRating,
  isLoadingMore, hasMorePlaces, canAutoLoadMore, paginationError, loadMorePlaces, hasSuggestionHistory, clearSuggestionHistory,
  mode,
  mealTime,
  peopleCount,
  totalBudget,
  selectedDistrictId,
  searchKeyword,
  userCoords,
  isLocating,
  locationLabel,
  districts,
  places,
  recipes,
  selectedPlace,
  selectedRecipe,
  randomSuggestion,
  isLoading,
  isRecipeLoading,
  isRandomLoading,
  errorMessage,
  dataSource,
  hasSearched,
  copyNotification,
  budgetPerPerson,
  fetchDistricts,
  requestGeolocation,
  onDistrictChange,
  getRecommendations,
  fetchRandomPick,
  sharePlace,
  getDirectionsUrl,
  selectPlaceForMap,
  openRecipeDetail,
  openPickedRecipe,
  closeRecipeDetail,
  closeRandomModal,
} = useFoodDiscovery({ waitForAccount: true });
const { user: foodUser, isReady: foodAuthReady, fetchMe: resolveFoodAuth } = useAuth();
const mobilePanel = ref<"steps" | "search" | "results" | "catalog" | "saved" | "advanced">("steps");
const mobileResultView = ref<"list" | "map">("list");
let mobileLocationChosen = false;
let pageActive = true;
watch(() => foodUser.value?.id || null, (owner) => {
  setDiscoveryAccount(owner);
  mobilePanel.value = "steps";
  mobileLocationChosen = false;
}, { flush: "sync" });
const discoveryBusy = computed(() => !foodAuthReady.value || isLoading.value || isLoadingMore.value || isRandomLoading.value);
function changeMobileCriteria(patch: {
  keyword?: string; mode?: "dine-out" | "cook-at-home"; mealTime?: "breakfast" | "lunch" | "snack" | "dinner" | "any";
  peopleCount?: number; totalBudget?: number; filters?: Record<string, string | string[]>;
}) {
  if (discoveryBusy.value) return;
  if (patch.keyword !== undefined) searchKeyword.value = patch.keyword;
  if (patch.mode !== undefined) mode.value = patch.mode;
  if (patch.mealTime !== undefined) mealTime.value = patch.mealTime;
  if (patch.peopleCount !== undefined) peopleCount.value = patch.peopleCount;
  if (patch.totalBudget !== undefined) totalBudget.value = patch.totalBudget;
  if (patch.filters !== undefined) filters.value = patch.filters;
}
function clearMobileLocationFilters() {
  const { city, area, locationDiscovery, ...remaining } = filters.value;
  if (typeof locationDiscovery === "string" && /^within-(1|3|5|10)-km$/.test(locationDiscovery)) remaining.locationDiscovery = locationDiscovery;
  filters.value = remaining;
  locationQuery.value = "";
  routeOrigin.value = "";
  routeDestination.value = "";
}
function requestMobileLocation() {
  if (discoveryBusy.value) return;
  mobileLocationChosen = true;
  clearMobileLocationFilters();
  requestGeolocation({ refresh: false });
}
function chooseMobileDistrict(id: string) {
  if (discoveryBusy.value || !districts.value.some(district => district.id === id)) return;
  mobileLocationChosen = true;
  clearMobileLocationFilters();
  onDistrictChange(id);
  errorMessage.value = null;
}
async function useGrantedMobileLocation() {
  if (!isMobile.value || typeof navigator === "undefined" || !navigator.permissions) return;
  const owner = foodUser.value?.id;
  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    // Permission checks must not overwrite a later manual choice or an account change.
    if (pageActive && permission.state === "granted" && owner === foodUser.value?.id && !mobileLocationChosen && !userCoords.value && isMobile.value) requestMobileLocation();
  } catch { /* Manual location selection remains available when Permissions API is unsupported. */ }
}
async function submitDiscovery() {
  if (!foodAuthReady.value || (isMobile.value && (discoveryBusy.value || isLocating.value))) return;
  // Desktop mode/criteria changes must reach the results queue while an earlier request finishes.
  mobilePanel.value = "results";
  mobileResultView.value = "list";
  await getRecommendations();
  if (isMobile.value) await nextTick(() => document.getElementById("food-discovery-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}
function changeDiscoveryMode(next: "dine-out" | "cook-at-home") {
  if (mode.value === next) return;
  mode.value = next;
  // Opening recipes is free. Only the explicit Generate/Suggest or Pick for Me action creates a recipe.
  if (next === "dine-out") void submitDiscovery();
}

const mapCenter = computed(() => userCoords.value || districts.value.find((district) => district.id === selectedDistrictId.value));
function chooseCatalogFood(item: FoodMenuItem, target: "dine-out" | "cook-at-home") {
  mobilePanel.value = "results";
  mobileResultView.value = "list";
  void selectCatalogFood(item, target);
  void nextTick(() => document.getElementById("food-discovery-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}
const budgetRangeLabel = computed(() => filterDefinitions.value.find((field) => field.key === "budgetRange")?.groups.flatMap((group) => group.options).find((option) => option.value === filters.value.budgetRange)?.label);
const flexibleBudget = computed(() => filters.value.budgetType === "flexible-no-fixed-budget");
watch(() => filters.value.city, (city) => {
  if (city && city !== "phnom-penh" && filters.value.area) {
    const { area, ...remaining } = filters.value;
    filters.value = remaining;
  }
});
watch(() => filters.value.locationDiscovery, (discovery) => {
  if (discovery === "near-me" && !userCoords.value && !isLocating.value) requestGeolocation({ refresh: !isMobile.value });
});

const loadMoreSentinel = ref<HTMLElement | null>(null);
const isMobile = ref(false);
const supportsInfiniteScroll = ref(false);
let discoveryInitialized = false;
let observer: IntersectionObserver | undefined;
let viewport: MediaQueryList | undefined;
function updateViewport() { isMobile.value = viewport?.matches || false; }
function observeMore() {
  observer?.disconnect();
  if (isMobile.value && mobilePanel.value === "results" && mobileResultView.value === "list" && supportsInfiniteScroll.value && canAutoLoadMore.value && loadMoreSentinel.value) observer?.observe(loadMoreSentinel.value);
}
watch([loadMoreSentinel, canAutoLoadMore, isMobile, mobilePanel, mobileResultView], observeMore);
watch(isMobile, (mobile, wasMobile) => {
  // A window widened before mobile submission still needs its first desktop restaurant search.
  // Recipes remain an explicit action, and existing results must not be refreshed just by resizing.
  if (discoveryInitialized && wasMobile && !mobile && !hasSearched.value && mode.value === "dine-out") void getRecommendations();
});
onMounted(async () => {
  viewport = window.matchMedia("(max-width: 767px)");
  updateViewport();
  viewport.addEventListener("change", updateViewport);
  supportsInfiniteScroll.value = typeof window.IntersectionObserver === "function";
  if (supportsInfiniteScroll.value) observer = new IntersectionObserver((entries) => {
    if (isMobile.value && mobilePanel.value === "results" && mobileResultView.value === "list" && entries.some((entry) => entry.isIntersecting) && canAutoLoadMore.value) void loadMorePlaces();
  }, { rootMargin: "240px 0px" });
  await Promise.all([fetchDistricts(), fetchFilters(), foodAuthReady.value ? Promise.resolve() : resolveFoodAuth()]);
  setDiscoveryAccount(foodUser.value?.id || null);
  discoveryInitialized = true;
  // Mobile waits for the completed choices; mounting or switching menus must never spend on generation.
  if (isMobile.value) void useGrantedMobileLocation();
  else if (mode.value === "dine-out") void getRecommendations();
});
onBeforeUnmount(() => { pageActive = false; observer?.disconnect(); viewport?.removeEventListener("change", updateViewport); });
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-8">
    <FoodMobileDiscovery
      v-model:panel="mobilePanel" :keyword="searchKeyword" :mode="mode" :meal-time="mealTime"
      :people-count="peopleCount" :total-budget="totalBudget" :filters="filters" :budget-label="budgetRangeLabel"
      :disabled="discoveryBusy" :locating="isLocating" :has-coords="Boolean(userCoords)"
      :location-label="locationLabel" :district-id="selectedDistrictId" :districts="districts"
      @change="changeMobileCriteria" @submit="submitDiscovery" @locate="requestMobileLocation" @district="chooseMobileDistrict"
    />
    <p v-if="errorMessage && mobilePanel !== 'advanced'" role="alert" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 md:hidden">{{ errorMessage }}</p>
    <!-- Hero / Headline Section -->
    <div class="food-hero hidden rounded-3xl border border-orange-100 p-6 shadow-sm dark:border-stone-800 md:block sm:p-8">
      <div class="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div class="space-y-2 text-center sm:text-left">
          <div class="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-950/80 dark:text-orange-300">
            <Sparkles class="size-3.5 text-orange-500" />
            <span>ស្វែងរកម្ហូបឆ្លាតវៃ ដោយមិនគិតថ្លៃ</span>
          </div>
          <h2 class="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-50 sm:text-3xl">
            ញ៉ាំអី? ទៅណា? ធ្វើម្ហូបអី?
          </h2>
          <p class="max-w-xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            កំណត់ថវិកា ចំនួនមនុស្ស និងទីតាំងរបស់អ្នក ដើម្បីទទួលការណែនាំភោជនីយដ្ឋានពិតៗ ឬរូបមន្តម្ហូបខ្មែរឆ្ងាញ់ៗ ភ្លាមៗ!
          </p>
        </div>

        <!-- Quick Random Food Button -->
        <button
          type="button"
          class="flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          :disabled="isRandomLoading || isLoading || isLoadingMore"
          @click="fetchRandomPick"
        >
          <Dices class="size-5" :class="{ 'animate-spin': isRandomLoading }" />
          <span>រើសឱ្យខ្ញុំមួយ! ✨ AI</span>
        </button>
      </div>

      <!-- Discovery Mode Tabs: Dine Out vs Cook at Home -->
      <div class="mt-6 flex rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-800 dark:bg-stone-900/80">
        <button
          type="button"
          class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition"
          :class="mode === 'dine-out'
            ? 'bg-orange-500 text-white shadow'
            : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'"
          @click="changeDiscoveryMode('dine-out')"
        >
          <Utensils class="size-4" />
          <span>ញ៉ាំនៅក្រៅ (Dine Out)</span>
        </button>
        <button
          type="button"
          class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition"
          :class="mode === 'cook-at-home'
            ? 'bg-orange-500 text-white shadow'
            : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'"
          @click="changeDiscoveryMode('cook-at-home')"
        >
          <ChefHat class="size-4" />
          <span>ធ្វើម្ហូបនៅផ្ទះ (Cook at Home)</span>
        </button>
      </div>
    </div>

    <!-- Filter & Discovery Criteria Form -->
    <div class="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/70 sm:p-7" :class="{ 'hidden md:block': mobilePanel !== 'advanced' }">
      <FoodQuickFilters :active="activeQuickPreset" :disabled="!foodAuthReady || isLoading || isLoadingMore || isRandomLoading" class="mb-6 border-b border-stone-100 pb-6 dark:border-stone-800" @select="selectQuickPreset" />
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
        <!-- People & Budget Controls -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-stone-500 dark:text-stone-400">
            ចំនួនមនុស្ស និងកញ្ចប់ថវិកា
          </label>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <div class="relative">
                <Users class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-stone-400" />
                <input
                  v-model.number="peopleCount"
                  type="number"
                  min="1"
                  max="50"
                  class="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-8 pr-2 text-xs font-bold text-stone-800 dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-100"
                  placeholder="3 នាក់"
                />
              </div>
              <span class="mt-0.5 block text-[10px] text-stone-400">ចំនួនមនុស្ស</span>
            </div>
            <div>
              <div class="relative">
                <DollarSign v-if="!filters.budgetRange && !flexibleBudget" class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-stone-400" aria-hidden="true" />
                <input
                  v-if="!filters.budgetRange && !flexibleBudget"
                  v-model.number="totalBudget"
                  type="number"
                  min="0"
                  max="10000"
                  step="1"
                  class="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-8 pr-2 text-xs font-bold text-stone-800 dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-100"
                  placeholder="10"
                />
                <div v-else class="min-h-10 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-800/40">{{ flexibleBudget ? 'No fixed budget' : budgetRangeLabel }}</div>
              </div>
              <span class="mt-0.5 block text-[10px] text-stone-400">{{ filters.budgetType === 'per-person' || filters.budgetRange ? 'ថវិកាក្នុងម្នាក់ ($)' : 'ថវិកាសរុប ($)' }}</span>
            </div>
          </div>
          <div v-if="budgetPerPerson !== null && budgetPerPerson > 0" class="text-[11px] font-medium text-orange-600 dark:text-orange-400">
            {{ filters.budgetRange ? '≤' : '≈' }} ${{ budgetPerPerson }}/នាក់
          </div>
        </div>

        <!-- Location / District Selection -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-stone-500 dark:text-stone-400">
            ទីតាំងនៅភ្នំពេញ
          </label>
          <div class="flex gap-1.5">
            <select
              :value="selectedDistrictId"
              class="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-2.5 text-xs font-semibold text-stone-800 transition dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-100"
              @change="isMobile ? chooseMobileDistrict(($event.target as HTMLSelectElement).value) : onDistrictChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="">ជ្រើសរើសខណ្ឌ...</option>
              <option
                v-for="d in districts"
                :key="d.id"
                :value="d.id"
              >
                {{ d.nameKm }}
              </option>
            </select>

            <button
              type="button"
              class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700 transition hover:border-orange-400 hover:text-orange-600 dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-300"
              :class="{ 'border-orange-500 text-orange-600 animate-pulse': isLocating }"
              title="ប្រើទីតាំងបច្ចុប្បន្ន (GPS)"
              :disabled="isLocating"
              @click="isMobile ? requestMobileLocation() : requestGeolocation()"
            >
              <Compass class="size-4" />
            </button>
          </div>
          <div class="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
            <MapPin class="size-3 text-orange-500" />
            <span class="truncate">{{ locationLabel }}</span>
          </div>
        </div>
      </div>

      <details class="mt-5 min-w-0 rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
        <summary class="cursor-pointer text-sm font-bold text-stone-800 dark:text-stone-100">តម្រងអាហារ និងទីកន្លែង / Food & place filters</summary>
        <div class="mt-4 space-y-4">
          <FoodDiscoveryFilters v-if="filterDefinitions.length" v-model="filters" :definitions="filterDefinitions" />
          <p v-else class="text-sm text-stone-500">{{ filtersError ? 'មិនអាចផ្ទុកតម្រងបានទេ។' : 'កំពុងផ្ទុកតម្រង…' }} <button v-if="filtersError" type="button" class="font-semibold text-orange-600 underline" @click="fetchFilters">សាកម្ដងទៀត</button></p>
          <label v-if="['near-home', 'near-workplace', 'near-university'].includes(String(filters.locationDiscovery)) || filters.city === 'other-cambodian-provinces'" class="block space-y-1 text-sm">
            <span>អាសយដ្ឋាន ឈ្មោះទីតាំង ឬខេត្ត / Address, landmark or province</span>
            <input v-model="locationQuery" maxlength="300" type="text" class="w-full rounded-xl border border-stone-200 bg-transparent px-3 py-2 text-base dark:border-stone-700" />
          </label>
          <div v-if="filters.locationDiscovery === 'along-my-route'" class="grid gap-3 sm:grid-cols-2">
            <label class="space-y-1 text-sm"><span>ចេញពី / Route origin</span><input v-model="routeOrigin" maxlength="300" class="w-full rounded-xl border border-stone-200 bg-transparent px-3 py-2 text-base dark:border-stone-700" /></label>
            <label class="space-y-1 text-sm"><span>ទៅកាន់ / Destination</span><input v-model="routeDestination" maxlength="300" class="w-full rounded-xl border border-stone-200 bg-transparent px-3 py-2 text-base dark:border-stone-700" /></label>
          </div>
          <label v-if="Array.isArray(filters.dietary) && filters.dietary.includes('allergies')" class="block space-y-1 text-sm"><span>អាលែកហ្ស៊ីដែលត្រូវជៀសវាង / Allergies to avoid</span><input v-model="allergies" maxlength="120" class="w-full rounded-xl border border-stone-200 bg-transparent px-3 py-2 text-base dark:border-stone-700" /></label>
          <label v-if="filters.reviews === 'rating'" class="block space-y-1 text-sm"><span>ការវាយតម្លៃអប្បបរមា / Minimum rating</span><select v-model.number="minimumRating" class="rounded-xl border border-stone-200 bg-transparent px-3 py-2 text-base dark:border-stone-700"><option :value="0">Any</option><option v-for="rating in [3, 3.5, 4, 4.5]" :key="rating" :value="rating">{{ rating }}+</option></select></label>
        </div>
      </details>

      <!-- Keyword search & Action Button -->
      <div class="mt-5 flex flex-col items-center gap-3 border-t border-stone-100 pt-5 dark:border-stone-800 sm:flex-row">
        <div class="relative w-full flex-1">
          <Search class="pointer-events-none absolute left-3.5 top-3 size-4 text-stone-400" />
          <input
            v-model="searchKeyword"
            type="text"
            class="w-full rounded-2xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-xs font-medium text-stone-800 placeholder-stone-400 transition dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-100"
            placeholder="ស្វែងរកតាមមុខម្ហូប (ឧ. បាយសាច់ជ្រូក, គុយទាវ, BBQ, កាហ្វេ...)"
            @keyup.enter="submitDiscovery"
          />
        </div>

        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700 active:scale-[0.99] sm:w-auto"
          :disabled="isLoading || isLoadingMore || isRandomLoading"
          @click="submitDiscovery"
        >
          <RefreshCw v-if="isLoading" class="size-4 animate-spin" />
          <Sparkles v-else class="size-4" />
          <span>ស្នើឱ្យខ្ញុំ! (Suggest for Me)</span>
        </button>
      </div>

      <button v-if="hasSuggestionHistory" type="button" class="mt-4 text-xs font-semibold text-orange-600 underline underline-offset-4 disabled:opacity-50" :disabled="isLoading || isLoadingMore || isRandomLoading" @click="clearSuggestionHistory(); submitDiscovery()">អនុញ្ញាតឱ្យបង្ហាញជម្រើសចាស់ឡើងវិញ / Reset recent choices</button>

      <!-- Geolocation / Error Alert -->
      <div v-if="errorMessage" class="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
        <AlertCircle class="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>{{ errorMessage }}</span>
      </div>
    </div>

    <!-- Notification Toast -->
    <div
      v-if="copyNotification"
      class="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-xs font-semibold text-white shadow-xl dark:bg-stone-100 dark:text-stone-900"
    >
      <CheckCircle2 class="size-4 text-emerald-400 dark:text-emerald-600" />
      <span>{{ copyNotification }}</span>
    </div>

    <div v-if="!isMobile || mobilePanel === 'catalog'" :class="{ 'hidden md:block': mobilePanel !== 'catalog' }">
      <FoodMenuCatalog :disabled="discoveryBusy" :initially-expanded="isMobile" @choose="chooseCatalogFood" />
    </div>
    <FoodSavedRecipes v-if="isMobile && mobilePanel === 'saved'" :refresh-key="savedRecipesVersion" initially-expanded @open="openRecipeDetail" />
    <div v-if="mobilePanel === 'results' && !hasSearched && !isLoading" class="rounded-2xl border border-stone-200 bg-white p-5 text-center text-sm dark:border-stone-700 dark:bg-stone-900 md:hidden">
      ជ្រើសម្ហូប ឬស្វែងរក ដើម្បីមើលលទ្ធផល។
      <button type="button" class="mt-3 block min-h-11 w-full font-semibold text-orange-600" @click="mobilePanel = 'steps'">ចាប់ផ្ដើមជ្រើសម្ហូប →</button>
    </div>

    <!-- Dine-Out Results Section -->
    <section v-if="mode === 'dine-out'" id="food-discovery-results" class="scroll-mt-24 space-y-6" :class="{ 'hidden md:block': mobilePanel !== 'results' }">
      <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-lg font-bold text-stone-900 dark:text-stone-100 sm:text-xl">
            ភោជនីយដ្ឋាន និងហាងដែលត្រូវជាមួយអ្នក
          </h3>
          <p class="text-xs text-stone-500 dark:text-stone-400">
            ទិន្នន័យហាងពី Google Maps · តម្លៃត្រូវបញ្ជាក់ជាមួយហាងផ្ទាល់
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
          :disabled="isLoading || isLoadingMore || isRandomLoading"
          @click="submitDiscovery"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>សាកល្បងម្ដងទៀត</span>
        </button>
      </div>

      <div class="flex gap-2 md:hidden" aria-label="Result display">
        <button type="button" :aria-pressed="mobileResultView === 'list'" class="min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold" :class="mobileResultView === 'list' ? 'border-orange-500 bg-orange-600 text-white' : 'border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900'" @click="mobileResultView = 'list'">📋 បញ្ជីហាង</button>
        <button type="button" :aria-pressed="mobileResultView === 'map'" class="min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold" :class="mobileResultView === 'map' ? 'border-orange-500 bg-orange-600 text-white' : 'border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900'" @click="mobileResultView = 'map'">📍 ផែនទី</button>
      </div>

      <!-- Map & Place Grid Layout -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <!-- Ranked Place Cards (5 cols) -->
        <div class="space-y-4 lg:col-span-6" :class="{ 'hidden md:block': mobileResultView === 'map' }">
          <div v-if="isLoading" class="space-y-4">
            <div v-for="i in 3" :key="i" class="h-44 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" />
          </div>

          <div v-else-if="places.length === 0 && hasSearched" class="rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
            <Utensils class="mx-auto size-10 text-stone-400" />
            <h4 class="mt-3 text-sm font-bold text-stone-800 dark:text-stone-200">
              រកមិនឃើញទីតាំងដែលត្រូវគ្នានៅជិតនេះទេ
            </h4>
            <p class="mt-1 text-xs text-stone-500 dark:text-stone-400">
              សូមសាកល្បងពង្រីកកញ្ចប់ថវិកា ឬជ្រើសរើសខណ្ឌផ្សេងទៀតនៅភ្នំពេញ។
            </p>
          </div>

          <!-- Place Cards -->
          <article
            v-for="(place, index) in places"
            :key="place.id"
            class="group relative cursor-pointer rounded-2xl border p-4 sm:p-5 transition-all hover:shadow-md"
            :class="selectedPlace?.id === place.id
              ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500 dark:border-orange-500 dark:bg-orange-950/20'
              : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900/80 dark:hover:border-stone-700'"
            @click="selectPlaceForMap(place)"
          >
            <div class="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:justify-between">
              <div class="flex min-w-0 flex-1 items-start gap-3">
                <!-- Rank Index Badge -->
                <div
                  class="grid size-8 shrink-0 place-items-center rounded-xl text-xs font-black shadow-sm"
                  :class="index === 0
                    ? 'bg-orange-500 text-white'
                    : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'"
                >
                  #{{ index + 1 }}
                </div>

                <div class="min-w-0 flex-1">
                  <h4 class="break-words font-bold text-stone-900 dark:text-stone-100 sm:text-base">
                    {{ place.name }}
                  </h4>
                  <p v-if="place.nameEn && place.nameEn !== place.name" class="text-xs text-stone-400">
                    {{ place.nameEn }}
                  </p>
                  <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                    <span v-if="place.distanceMeters" class="inline-flex items-center gap-0.5 text-orange-600 font-semibold dark:text-orange-400">
                      <MapPin class="size-3" />
                      {{ (place.distanceMeters / 1000).toFixed(1) }} គ.ម
                    </span>
                    <span v-if="place.street" class="min-w-0 break-words">· {{ place.street }}</span>
                    <span v-else-if="place.district" class="min-w-0 break-words">· {{ place.district }}</span>
                  </div>
                  <p v-if="place.rating !== undefined" class="mt-1 text-xs text-stone-500">⭐ {{ place.rating }} <span v-if="place.userRatingCount">({{ place.userRatingCount }})</span></p>
                </div>
              </div>

              <!-- Price Verification Badge -->
              <div class="max-w-full text-left sm:shrink-0 sm:text-right">
                <span
                  class="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  :class="place.isPriceVerified
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'"
                >
                  <template v-if="place.isPriceVerified && place.estimatedPricePerPersonUsd">
                    ~${{ place.estimatedPricePerPersonUsd }}/នាក់
                  </template>
                  <template v-else>
                    តម្លៃមិនទាន់ផ្ទៀងផ្ទាត់
                  </template>
                </span>
              </div>
            </div>

            <!-- Matched Factors & Budget Fit -->
            <div class="mt-3 space-y-1.5 border-t border-stone-100 pt-3 dark:border-stone-800/80">
              <div class="flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300">
                <Info class="size-3.5 shrink-0 text-orange-500" />
                <span class="font-medium">{{ place.budgetFit }}</span>
              </div>

              <div v-if="place.matchedFactors && place.matchedFactors.length > 0" class="flex flex-wrap gap-1.5 pt-1">
                <span
                  v-for="(factor, fIndex) in place.matchedFactors"
                  :key="fIndex"
                  class="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                >
                  ✓ {{ factor }}
                </span>
              </div>

              <!-- Recommended Dishes if available -->
              <div v-if="place.recommendedDishes && place.recommendedDishes.length > 0" class="pt-1 text-[11px] text-stone-500 dark:text-stone-400">
                <span class="font-semibold text-stone-700 dark:text-stone-300">ម្ហូបពិសេស: </span>
                {{ place.recommendedDishes.join(', ') }}
              </div>
            </div>

            <!-- Actions (Directions, Share) -->
            <div class="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-2.5 text-xs dark:border-stone-800/80">
              <a
                :href="getDirectionsUrl(place)"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 font-bold text-orange-600 hover:text-orange-700 hover:underline dark:text-orange-400"
                @click.stop
              >
                <Compass class="size-3.5" />
                <span>បើកមើលទិសដៅ</span>
                <ExternalLink class="size-3" />
              </a>

              <button
                type="button"
                class="inline-flex items-center gap-1 text-stone-500 transition hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
                title="ចែករំលែក"
                @click.stop="sharePlace(place)"
              >
                <Share2 class="size-3.5" />
                <span>ចែករំលែក</span>
              </button>
            </div>
            <FoodPlaceAttribution :place="place" class="mt-3" />
          </article>
          <div v-if="hasMorePlaces" class="flex justify-center py-3" aria-live="polite">
            <button v-if="!isMobile || !supportsInfiniteScroll || paginationError" type="button" :disabled="isLoadingMore" class="rounded-xl border border-orange-300 px-5 py-2.5 text-sm font-semibold text-orange-700 disabled:opacity-50 dark:text-orange-300" @click="loadMorePlaces">{{ isLoadingMore ? 'កំពុងផ្ទុក…' : paginationError ? 'សាកផ្ទុកម្ដងទៀត / Retry' : 'ផ្ទុកហាងបន្ថែម / Load more' }}</button>
            <span v-else-if="isLoadingMore" class="text-sm text-stone-500">កំពុងផ្ទុកហាងបន្ថែម…</span>
          </div>
          <div ref="loadMoreSentinel" class="h-px" aria-hidden="true" />
        </div>

        <!-- Selected restaurant on Google Maps -->
        <div v-if="!isMobile || (mobilePanel === 'results' && mobileResultView === 'map')" class="lg:col-span-6">
          <div class="sticky top-20">
            <FoodDiscoveryMap
              :places="places"
              :selected-place="selectedPlace"
              :center-lat="mapCenter?.lat"
              :center-lng="mapCenter?.lng"
            />
            <div class="mt-2 flex items-center justify-between px-1 text-[11px] text-stone-400">
              <span>ចុចលើកាតដើម្បីមើលហាងនោះនៅលើផែនទី</span>
              <span translate="no">Google Maps</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Cook-at-Home (Khmer Recipes) Results Section -->
    <section v-if="mode === 'cook-at-home'" id="food-discovery-results" class="scroll-mt-24 space-y-6" :class="{ 'hidden md:block': mobilePanel !== 'results' }">
      <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-lg font-bold text-stone-900 dark:text-stone-100 sm:text-xl">
            រូបមន្តម្ហូបខ្មែរបែបប្រពៃណី សន្សំសំចៃ និងឆ្ងាញ់ពិសា
          </h3>
          <p class="text-xs text-stone-500 dark:text-stone-400">
            រូបមន្តថ្មីដោយ AI តាមចំនួនមនុស្ស និងថវិការបស់អ្នក · តម្លៃគ្រឿងផ្សំគ្រាន់តែជាការប៉ាន់ស្មាន
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
          :disabled="isLoading || isLoadingMore || isRandomLoading"
          @click="submitDiscovery"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>{{ recipes.length ? 'សាកល្បងម្ដងទៀត' : 'បង្កើតរូបមន្តថ្មី' }}</span>
        </button>
      </div>

      <!-- Recipes Grid -->
      <FoodSavedRecipes v-if="!isMobile" :refresh-key="savedRecipesVersion" @open="openRecipeDetail" />
      <p v-if="isRecipeLoading" role="status" class="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">កំពុងបង្កើតរូបមន្តតាមជម្រើសរបស់អ្នក…</p>
      <p v-else-if="!recipes.length" class="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">ជ្រើសលក្ខខណ្ឌរបស់អ្នក រួចចុច «ស្នើឱ្យខ្ញុំ» ឬ «រើសឱ្យខ្ញុំមួយ» ដើម្បីបង្កើតរូបមន្តថ្មី។</p>
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="recipe in recipes"
          :key="recipe.id"
          class="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-orange-300 dark:border-stone-800 dark:bg-stone-900"
        >
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-2">
              <span class="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 uppercase">
                {{ recipe.category }}
              </span>
              <span class="text-xs font-semibold text-stone-600 dark:text-stone-300">
                ≈ ${{ recipe.estimatedCostUsd }} (សម្រាប់ {{ recipe.servings }} នាក់)
              </span>
            </div>

            <h4 class="text-base font-bold text-stone-900 dark:text-stone-100">
              {{ recipe.nameKm }}
            </h4>
            <p class="text-xs text-stone-400">
              {{ recipe.nameEn }}
            </p>
            <p v-if="recipe.savedRecipeId" class="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ {{ recipe.savedToAccount ? 'បានរក្សាទុកក្នុងគណនីរបស់អ្នក' : 'បានរក្សាទុកក្នុងប្រព័ន្ធ' }}</p>
            <p class="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
              {{ recipe.descriptionKm }}
            </p>

            <div class="flex items-center gap-4 text-[11px] text-stone-500 dark:text-stone-400">
              <span class="flex items-center gap-1">
                <Clock class="size-3 text-orange-500" />
                {{ recipe.prepTimeMinutes + recipe.cookTimeMinutes }} នាទី
              </span>
              <span class="flex items-center gap-1">
                <Users class="size-3 text-orange-500" />
                {{ recipe.servings }} ចាន
              </span>
              <span>
                កម្រិត: {{ recipe.difficulty === 'easy' ? 'ងាយ' : recipe.difficulty === 'medium' ? 'មធ្យម' : 'ជំនាញ' }}
              </span>
            </div>
          </div>

          <div class="mt-4 border-t border-stone-100 pt-3 dark:border-stone-800">
            <button
              type="button"
              class="w-full rounded-xl bg-orange-50 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-900/60"
              @click="openRecipeDetail(recipe)"
            >
              មើលគ្រឿងផ្សំ និងរបៀបធ្វើ &rarr;
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- Recipe Detail Modal -->
    <div
      v-if="selectedRecipe"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      @click.self="closeRecipeDetail"
    >
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-stone-900 sm:p-8">
        <div class="flex items-start justify-between gap-4 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div>
            <div class="inline-block rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 uppercase">
              {{ selectedRecipe.category }}
            </div>
            <h3 class="mt-1 text-xl font-black text-stone-900 dark:text-stone-50">
              {{ selectedRecipe.nameKm }}
            </h3>
            <p class="text-xs text-stone-400">
              {{ selectedRecipe.nameEn }}
            </p>
          </div>
          <button
            type="button"
            class="grid size-9 place-items-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
            @click="closeRecipeDetail"
          >
            <X class="size-5" />
          </button>
        </div>

        <div class="mt-6 space-y-6">
          <!-- Recipe Metadata Summary -->
          <div class="grid grid-cols-3 gap-3 rounded-2xl bg-stone-50 p-4 text-center text-xs dark:bg-stone-800/40">
            <div>
              <span class="block text-stone-400 text-[10px]">ពេលរៀបចំ + ចម្អិន</span>
              <span class="font-bold text-stone-800 dark:text-stone-200">
                {{ selectedRecipe.prepTimeMinutes + selectedRecipe.cookTimeMinutes }} នាទី
              </span>
            </div>
            <div>
              <span class="block text-stone-400 text-[10px]">បរិមាណទទួលទាន</span>
              <span class="font-bold text-stone-800 dark:text-stone-200">
                {{ selectedRecipe.servings }} នាក់
              </span>
            </div>
            <div>
              <span class="block text-stone-400 text-[10px]">ការចំណាយប្រហែល</span>
              <span class="font-bold text-orange-600 dark:text-orange-400">
                ~${{ selectedRecipe.estimatedCostUsd }}
              </span>
            </div>
          </div>

          <!-- Ingredients List -->
          <div>
            <h4 class="text-sm font-bold text-stone-900 dark:text-stone-100">
              គ្រឿងផ្សំចាំបាច់
            </h4>
            <ul class="mt-3 space-y-2">
              <li
                v-for="(ing, idx) in selectedRecipe.ingredients"
                :key="idx"
                class="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/50 px-3.5 py-2 text-xs dark:border-stone-800 dark:bg-stone-800/20"
              >
                <span class="font-medium text-stone-800 dark:text-stone-200">
                  {{ ing.nameKm }}
                  <span class="text-[11px] text-stone-400">({{ ing.nameEn }})</span>
                </span>
                <span class="font-bold text-orange-600 dark:text-orange-400">
                  {{ ing.amount }}
                </span>
              </li>
            </ul>
          </div>

          <!-- Cooking Steps -->
          <div>
            <h4 class="text-sm font-bold text-stone-900 dark:text-stone-100">
              របៀបចម្អិនជាជំហានៗ
            </h4>
            <ol class="mt-3 space-y-3">
              <li
                v-for="st in selectedRecipe.steps"
                :key="st.step"
                class="flex items-start gap-3 rounded-2xl border border-stone-100 bg-stone-50/30 p-3.5 text-xs dark:border-stone-800 dark:bg-stone-800/20"
              >
                <div class="grid size-6 shrink-0 place-items-center rounded-full bg-orange-600 text-xs font-bold text-white">
                  {{ st.step }}
                </div>
                <div class="space-y-0.5">
                  <p class="leading-relaxed text-stone-800 dark:text-stone-200">
                    {{ st.textKm }}
                  </p>
                  <p class="text-[11px] text-stone-400">
                    {{ st.textEn }}
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <!-- Cooking Tip -->
          <div v-if="selectedRecipe.tips" class="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 text-xs text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
            <span class="font-bold">💡 គន្លឹះពិសេសពីចុងភៅ: </span>
            <span>{{ selectedRecipe.tips }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Random Picker Modal ("រើសឱ្យខ្ញុំមួយ!") -->
    <div
      v-if="randomSuggestion"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      @click.self="closeRandomModal"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-stone-900 sm:p-7">
        <div class="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/30">
          <Dices class="size-8" />
        </div>

        <h3 class="mt-4 text-lg font-black text-stone-900 dark:text-stone-50">
          AI រើសឱ្យអ្នករួចហើយ! ✨
        </h3>

        <div class="mt-4 rounded-2xl bg-orange-50/60 p-4 text-sm font-semibold text-orange-950 dark:bg-orange-950/30 dark:text-orange-200">
          {{ randomSuggestion.messageKm }}
        </div>

        <!-- If suggestion is a Dish -->
        <div v-if="randomSuggestion.type === 'dish' && randomSuggestion.dish" class="mt-4 space-y-2 text-left rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
          <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h4 class="text-base font-bold text-stone-900 dark:text-stone-100">
              {{ randomSuggestion.dish.nameKm }}
            </h4>
            <span class="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              {{ randomSuggestion.dish.suggestedCuisine }}
            </span>
          </div>
          <p class="text-xs text-stone-500 dark:text-stone-400">
            {{ randomSuggestion.dish.descriptionKm }}
          </p>
          <button v-if="randomSuggestion.recipe" type="button" class="text-xs font-bold text-orange-600 underline" @click="openPickedRecipe">មើលគ្រឿងផ្សំ និងរបៀបធ្វើ →</button>
        </div>

        <!-- If suggestion is a Place -->
        <div v-else-if="randomSuggestion.type === 'place' && randomSuggestion.place" class="mt-4 space-y-2 text-left rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
          <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h4 class="text-base font-bold text-stone-900 dark:text-stone-100">
              {{ randomSuggestion.place.name }}
            </h4>
            <span class="text-xs text-orange-600 font-semibold dark:text-orange-400">
              {{ randomSuggestion.place.city }}
            </span>
          </div>
          <p class="text-xs text-stone-500 dark:text-stone-400">
            {{ randomSuggestion.place.street || randomSuggestion.place.district }}
          </p>
          <a
            :href="getDirectionsUrl(randomSuggestion.place)"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline dark:text-orange-400"
          >
            <Compass class="size-3.5" />
            <span>បើកទិសដៅ &rarr;</span>
          </a>
          <p class="text-xs text-stone-500 dark:text-stone-400">តម្លៃមិនទាន់ផ្ទៀងផ្ទាត់។ សូមបញ្ជាក់ជាមួយហាងផ្ទាល់។</p>
          <FoodPlaceAttribution :place="randomSuggestion.place" />
        </div>

        <div class="mt-6 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-2xl border border-stone-200 py-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
            @click="closeRandomModal"
          >
            យល់ព្រម
          </button>
          <button
            type="button"
            class="flex-1 rounded-2xl bg-orange-600 py-3 text-xs font-bold text-white shadow-md shadow-orange-600/20 hover:bg-orange-700"
            :disabled="isRandomLoading || isLoading || isLoadingMore"
            @click="fetchRandomPick"
          >
            រើសម្ដងទៀត
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.food-hero {
  background-image:
    linear-gradient(100deg, rgb(255 251 245 / 98%) 0%, rgb(255 251 245 / 92%) 42%, rgb(255 251 245 / 45%) 100%),
    var(--food-background-image);
  background-size: cover;
  background-position: center right;
}

.dark .food-hero {
  background-image:
    linear-gradient(100deg, rgb(12 15 20 / 97%) 0%, rgb(12 15 20 / 90%) 42%, rgb(12 15 20 / 68%) 100%),
    var(--food-background-image);
}

@media (max-width: 639px) {
  .food-hero {
    background-position: center right;
    background-image:
      linear-gradient(100deg, rgb(255 251 245 / 95%), rgb(255 251 245 / 80%)),
      var(--food-background-image);
  }

  .dark .food-hero {
    background-image:
      linear-gradient(100deg, rgb(12 15 20 / 95%), rgb(12 15 20 / 84%)),
      var(--food-background-image);
  }
}
</style>
