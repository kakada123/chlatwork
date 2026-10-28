<script setup lang="ts">
import { onMounted, computed } from "vue";
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
  type DiscoveryMode,
  type MealTime,
  type Occasion,
} from "~/composables/useFoodDiscovery";
import FoodDiscoveryMap from "~/components/food/FoodDiscoveryMap.vue";
import FoodPlaceAttribution from "~/components/food/FoodPlaceAttribution.vue";

definePageMeta({
  layout: "food",
});

const {
  mode,
  mealTime,
  occasion,
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
  closeRecipeDetail,
  closeRandomModal,
} = useFoodDiscovery();

const mapCenter = computed(() => userCoords.value || districts.value.find((district) => district.id === selectedDistrictId.value));

const mealTimeOptions: Array<{ value: MealTime; labelKm: string; icon: string }> = [
  { value: "breakfast", labelKm: "ពេលព្រឹក", icon: "🍳" },
  { value: "lunch", labelKm: "ថ្ងៃត្រង់", icon: "🍲" },
  { value: "snack", labelKm: "អាហារសម្រន់", icon: "☕" },
  { value: "dinner", labelKm: "ពេលល្ងាច", icon: "🥘" },
];

const occasionOptions: Array<{ value: Occasion; labelKm: string; icon: string }> = [
  { value: "solo", labelKm: "ម្នាក់ឯង", icon: "🚶" },
  { value: "friends", labelKm: "មិត្តភក្តិ / ការិយាល័យ", icon: "👥" },
  { value: "first-date", labelKm: "ណាត់ជួបដំបូង", icon: "💐" },
  { value: "couple", labelKm: "គូស្នេហ៍", icon: "💑" },
  { value: "family", labelKm: "ក្រុមគ្រួសារ", icon: "👨‍👩‍👧‍👦" },
  { value: "elderly", labelKm: "មនុស្សចាស់", icon: "👴" },
];

onMounted(async () => {
  await fetchDistricts();
  // Automatically load initial suggestions for the default scenario (Lunch with 3 friends, $10 budget in Phnom Penh)
  getRecommendations();
});
</script>

<template>
  <div class="space-y-8">
    <!-- Hero / Headline Section -->
    <div class="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50/50 to-white p-6 shadow-sm dark:border-stone-800 dark:from-stone-900 dark:via-stone-900/60 dark:to-stone-950 sm:p-8">
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
          :disabled="isRandomLoading"
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
          @click="mode = 'dine-out'; getRecommendations()"
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
          @click="mode = 'cook-at-home'; getRecommendations()"
        >
          <ChefHat class="size-4" />
          <span>ធ្វើម្ហូបនៅផ្ទះ (Cook at Home)</span>
        </button>
      </div>
    </div>

    <!-- Filter & Discovery Criteria Form -->
    <div class="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/70 sm:p-7">
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <!-- Meal Time Selection -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-stone-500 dark:text-stone-400">
            ពេលវេលាទទួលទាន
          </label>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="time in mealTimeOptions"
              :key="time.value"
              type="button"
              class="flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition"
              :class="mealTime === time.value
                ? 'border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-500 dark:bg-orange-950/40 dark:text-orange-300'
                : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-300'"
              @click="mealTime = time.value"
            >
              <span>{{ time.icon }}</span>
              <span>{{ time.labelKm }}</span>
            </button>
          </div>
        </div>

        <!-- Occasion Selection -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-stone-500 dark:text-stone-400">
            ឱកាសជួបជុំ
          </label>
          <select
            v-model="occasion"
            class="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-semibold text-stone-800 transition dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-100"
          >
            <option
              v-for="occ in occasionOptions"
              :key="occ.value"
              :value="occ.value"
            >
              {{ occ.icon }} {{ occ.labelKm }}
            </option>
          </select>
          <p class="text-[11px] text-stone-400">
            {{ occasion === 'friends' ? 'ស័ក្តិសមជួបជុំគ្នា កន្លែងទូលាយ' : occasion === 'first-date' ? 'បរិយាកាសរ៉ូមែនទិក ស្ងប់ស្ងាត់' : 'ជម្រើសផាសុកភាព' }}
          </p>
        </div>

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
                <DollarSign class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-stone-400" />
                <input
                  v-model.number="totalBudget"
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  class="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-8 pr-2 text-xs font-bold text-stone-800 dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-100"
                  placeholder="10"
                />
              </div>
              <span class="mt-0.5 block text-[10px] text-stone-400">ថវិកាសរុប ($)</span>
            </div>
          </div>
          <div v-if="budgetPerPerson > 0" class="text-[11px] font-medium text-orange-600 dark:text-orange-400">
            ≈ ${{ budgetPerPerson }}/នាក់
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
              @change="onDistrictChange(($event.target as HTMLSelectElement).value)"
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
              @click="requestGeolocation"
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

      <!-- Keyword search & Action Button -->
      <div class="mt-5 flex flex-col items-center gap-3 border-t border-stone-100 pt-5 dark:border-stone-800 sm:flex-row">
        <div class="relative w-full flex-1">
          <Search class="pointer-events-none absolute left-3.5 top-3 size-4 text-stone-400" />
          <input
            v-model="searchKeyword"
            type="text"
            class="w-full rounded-2xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-xs font-medium text-stone-800 placeholder-stone-400 transition dark:border-stone-800 dark:bg-stone-800/40 dark:text-stone-100"
            placeholder="ស្វែងរកតាមមុខម្ហូប (ឧ. បាយសាច់ជ្រូក, គុយទាវ, BBQ, កាហ្វេ...)"
            @keyup.enter="getRecommendations"
          />
        </div>

        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition hover:bg-orange-700 active:scale-[0.99] sm:w-auto"
          :disabled="isLoading"
          @click="getRecommendations"
        >
          <RefreshCw v-if="isLoading" class="size-4 animate-spin" />
          <Sparkles v-else class="size-4" />
          <span>ស្នើឱ្យខ្ញុំ! (Suggest for Me)</span>
        </button>
      </div>

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

    <!-- Dine-Out Results Section -->
    <section v-if="mode === 'dine-out'" class="space-y-6">
      <div class="flex items-center justify-between">
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
          :disabled="isLoading"
          @click="getRecommendations"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>សាកល្បងម្ដងទៀត</span>
        </button>
      </div>

      <!-- Map & Place Grid Layout -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <!-- Ranked Place Cards (5 cols) -->
        <div class="space-y-4 lg:col-span-6">
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
            class="group relative cursor-pointer rounded-2xl border p-4.5 transition-all hover:shadow-md"
            :class="selectedPlace?.id === place.id
              ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500 dark:border-orange-500 dark:bg-orange-950/20'
              : 'border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900/80 dark:hover:border-stone-700'"
            @click="selectPlaceForMap(place)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3">
                <!-- Rank Index Badge -->
                <div
                  class="grid size-8 shrink-0 place-items-center rounded-xl text-xs font-black shadow-sm"
                  :class="index === 0
                    ? 'bg-orange-500 text-white'
                    : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'"
                >
                  #{{ index + 1 }}
                </div>

                <div>
                  <h4 class="font-bold text-stone-900 dark:text-stone-100 sm:text-base">
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
                    <span v-if="place.street">· {{ place.street }}</span>
                    <span v-else-if="place.district">· {{ place.district }}</span>
                  </div>
                </div>
              </div>

              <!-- Price Verification Badge -->
              <div class="shrink-0 text-right">
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
            <div class="mt-3.5 flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs dark:border-stone-800/80">
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
        </div>

        <!-- Selected restaurant on Google Maps -->
        <div class="lg:col-span-6">
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
    <section v-if="mode === 'cook-at-home'" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-stone-900 dark:text-stone-100 sm:text-xl">
            រូបមន្តម្ហូបខ្មែរបែបប្រពៃណី សន្សំសំចៃ និងឆ្ងាញ់ពិសា
          </h3>
          <p class="text-xs text-stone-500 dark:text-stone-400">
            មុខម្ហូបខ្មែរពិតៗ ងាយស្រួលធ្វើនៅផ្ទះ ផ្សំតាមចំនួនមនុស្ស និងថវិការបស់អ្នក
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
          :disabled="isLoading"
          @click="getRecommendations"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>សាកល្បងម្ដងទៀត</span>
        </button>
      </div>

      <!-- Recipes Grid -->
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
          <div class="flex items-center justify-between">
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
        </div>

        <!-- If suggestion is a Place -->
        <div v-else-if="randomSuggestion.type === 'place' && randomSuggestion.place" class="mt-4 space-y-2 text-left rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
          <div class="flex items-center justify-between">
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
            :disabled="isRandomLoading"
            @click="fetchRandomPick"
          >
            រើសម្ដងទៀត
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
