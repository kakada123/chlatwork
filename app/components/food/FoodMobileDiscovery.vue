<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { computed, nextTick, ref, watch } from "vue";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Menu,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-vue-next";

const { t } = useAppI18n();


type Panel = "steps" | "search" | "results" | "catalog" | "saved" | "advanced";
type Filters = Record<string, string | string[]>;
interface Criteria {
  keyword: string;
  mode: "dine-out" | "cook-at-home";
  mealTime: "breakfast" | "lunch" | "snack" | "dinner" | "any";
  peopleCount: number;
  totalBudget: number;
  filters: Filters;
}
const props = defineProps<
  Criteria & {
    panel: Panel;
    disabled: boolean;
    locating: boolean;
    locationLabel: string;
    hasCoords: boolean;
    districtId: string;
    districts: Array<{ id: string; nameKm: string }>;
    budgetLabel?: string;
  locationError?: boolean;
  }
>();
const emit = defineEmits<{
  (event: "update:panel", value: Panel): void;
  (event: "change", value: Partial<Criteria>): void;
  (event: "submit"): void;
  (event: "locate"): void;
  (event: "district", value: string): void;
}>();
const step = ref(0),
  menuOpen = ref(false);
const heading = ref<HTMLElement | null>(null),
  searchInput = ref<HTMLInputElement | null>(null);
const questions = computed(() => ([
  t("products.food.discovery.food_question"),
  t("products.food.discovery.meal_question"),
  t("products.food.discovery.budget_question"),
  t("products.food.discovery.people_question"),
  t("products.food.discovery.area_question"),
]));
const shortSteps = computed(() => ([t("products.food.discovery.food_step"), t("products.food.discovery.time_step"), t("products.food.discovery.budget_step"), t("products.food.discovery.people_step"), t("products.food.discovery.location_step")]));
const foods = computed(() => ([
  { label: t("products.food.discovery.any_food"), icon: "✨", value: "" },
  { label: t("products.food.labels.rice"), icon: "🍚", value: "បាយ" },
  { label: t("products.food.labels.noodles"), icon: "🍜", value: "គុយទាវ" },
  { label: t("products.food.labels.grilled_meat"), icon: "🍢", value: "សាច់អាំង" },
  { label: t("products.food.labels.hotpot"), icon: "🍲", value: "hotpot" },
  { label: t("products.food.labels.coffee"), icon: "☕", value: "កាហ្វេ" },
  { label: t("products.food.labels.dessert"), icon: "🍧", value: "បង្អែម" },
  { label: t("products.food.labels.pizza"), icon: "🍕", value: "pizza" },
]));
const meals = computed(() => ([
  { label: t("products.food.meals.breakfast"), icon: "🌤️", value: "breakfast" },
  { label: t("products.food.meals.lunch"), icon: "☀️", value: "lunch" },
  { label: t("products.food.meals.snack"), icon: "🧋", value: "snack" },
  { label: t("products.food.meals.dinner"), icon: "🌙", value: "dinner" },
  { label: t("products.food.meals.any"), icon: "🕒", value: "any" },
] as const));
const flexible = computed(
  () => props.filters.budgetType === "flexible-no-fixed-budget",
);
const perPerson = computed(() => props.filters.budgetType === "per-person");
const valid = computed(
  () =>
    Number.isInteger(props.peopleCount) &&
    props.peopleCount >= 1 &&
    props.peopleCount <= 50 &&
    (flexible.value ||
      (Number.isFinite(props.totalBudget) &&
        props.totalBudget > 0 &&
        props.totalBudget <= 10000)),
);
const menuItems = computed(() => ([
  { panel: "steps", label: t("products.food.nav.guided"), icon: "✨" },
  { panel: "results", label: t("products.food.nav.results"), icon: "📍" },
  { panel: "catalog", label: t("products.food.nav.catalog"), icon: "🍱" },
  { panel: "saved", label: t("products.food.nav.saved"), icon: "📚" },
  { panel: "advanced", label: t("products.food.nav.advanced"), icon: "⚙️" },
] as const));
function open(panel: Panel) {
  menuOpen.value = false;
  emit("update:panel", panel);
}
function chooseFood(keyword: string) {
  if (props.disabled) return;
  const { foodTypes, cuisines, restaurantTypes, ...filters } = props.filters;
  emit("change", { keyword, filters });
}
function chooseMeal(mealTime: Criteria["mealTime"]) {
  if (props.disabled) return;
  const { mealWindow, ...filters } = props.filters;
  emit("change", { mealTime, filters });
}
function chooseBudget(totalBudget: number | null) {
  if (props.disabled) return;
  const { budgetRange, ...filters } = props.filters;
  emit(
    "change",
    totalBudget === null
      ? { filters: { ...filters, budgetType: "flexible-no-fixed-budget" } }
      : {
          totalBudget,
          filters: {
            ...filters,
            budgetType: perPerson.value ? "per-person" : "total-group-budget",
          },
        },
  );
}
function budgetBasis(budgetType: string) {
  if (props.disabled) return;
  const { budgetRange, ...filters } = props.filters;
  emit("change", { filters: { ...filters, budgetType } });
}
async function goStep(index: number) {
  step.value = Math.max(0, Math.min(4, index));
  await nextTick();
  heading.value?.focus({ preventScroll: true });
}
function next() {
  if (props.disabled || (props.locating && step.value === 4) || !valid.value)
    return;
  if (step.value < 4) void goStep(step.value + 1);
  else emit("submit");
}
watch(
  () => props.panel,
  async (panel) => {
    if (panel === "search") {
      await nextTick();
      searchInput.value?.focus();
    }
  },
);
</script>

<template>
  <div
    class="min-w-0 space-y-4 md:hidden"
    :class="
      panel !== 'steps' && panel !== 'search'
        ? 'sticky top-20 z-30 rounded-2xl bg-stone-50/95 py-2 backdrop-blur dark:bg-stone-950/95'
        : ''
    "
  >
    <nav
      class="relative z-30 flex items-center gap-2"
      :aria-label="t(&quot;products.common.food_navigation&quot;)"
    >
      <button
        type="button"
        :aria-pressed="panel === 'steps'"
        class="mobile-nav"
        @click="open('steps')"
      >
        {{ t("products.food.discovery.choose_food") }}
      </button>
      <button
        type="button"
        :aria-pressed="panel === 'search'"
        class="mobile-nav"
        @click="open('search')"
      >
        <Search class="size-4" /> {{ t("products.food.actions.search") }}
      </button>
      <button
        type="button"
        :aria-expanded="menuOpen"
        aria-controls="food-mobile-menu"
        class="mobile-nav ml-auto"
        @click="menuOpen = !menuOpen"
      >
        <X v-if="menuOpen" class="size-4" /><Menu v-else class="size-4" /><span
          class="sr-only"
          >{{ t("products.food.menu") }}</span
        >
      </button>
      <div
        v-if="menuOpen"
        id="food-mobile-menu"
        class="absolute inset-x-0 top-full mt-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        @keydown.esc="menuOpen = false"
      >
        <button
          v-for="item in menuItems"
          :key="item.panel"
          type="button"
          class="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-stone-800 hover:bg-orange-50 dark:text-stone-100 dark:hover:bg-stone-800"
          :aria-current="panel === item.panel ? 'page' : undefined"
          @click="open(item.panel)"
        >
          <span aria-hidden="true">{{ item.icon }}</span
          >{{ item.label }}
        </button>
      </div>
    </nav>

    <section
      v-if="panel === 'steps' || panel === 'search'"
      class="rounded-3xl border border-orange-100 bg-white/95 p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900"
      :aria-label="panel === 'steps' ? t(&quot;products.common.guided_food_discovery&quot;) : t(&quot;products.common.search_food&quot;)"
    >
      <div
        class="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1 dark:bg-stone-800"
      >
        <button
          v-for="option in [
            { value: 'dine-out', label: t(&quot;products.food.discovery.dine_out&quot;) },
            { value: 'cook-at-home', label: t(&quot;products.food.discovery.cook_home&quot;) },
          ]"
          :key="option.value"
          type="button"
          class="min-h-11 rounded-lg px-2 text-xs font-bold"
          :class="
            mode === option.value
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-stone-600 dark:text-stone-300'
          "
          :aria-pressed="mode === option.value"
          :disabled="disabled"
          @click="emit('change', { mode: option.value as Criteria['mode'] })"
        >
          {{ option.label }}
        </button>
      </div>

      <template v-if="panel === 'steps'">
        <nav class="mb-5 grid grid-cols-5 gap-1" :aria-label="t(&quot;products.common.discovery_steps&quot;)">
          <button
            v-for="(label, index) in shortSteps"
            :key="label"
            type="button"
            class="space-y-1.5 text-center text-[10px] font-semibold text-stone-500"
            :aria-current="step === index ? 'step' : undefined"
            :disabled="disabled"
            @click="goStep(index)"
          >
            <span
              class="block h-1 rounded-full"
              :class="
                index <= step
                  ? 'bg-orange-500'
                  : 'bg-stone-200 dark:bg-stone-700'
              "
            />{{ label }}
          </button>
        </nav>
        <p
          class="text-[11px] font-semibold text-orange-600 dark:text-orange-400"
        >
          {{ t("products.food.discovery.step") }} {{ step + 1 }} / 5
        </p>
        <h2
          ref="heading"
          tabindex="-1"
          class="mb-4 mt-1 text-2xl font-black text-stone-900 outline-none dark:text-stone-100"
        >
          {{ questions[step] }}
        </h2>

        <div v-if="step === 0" class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="food in foods"
              :key="food.value"
              type="button"
              class="mobile-choice"
              :aria-pressed="keyword === food.value"
              :disabled="disabled"
              @click="chooseFood(food.value)"
            >
              <span aria-hidden="true" class="text-xl">{{ food.icon }}</span
              >{{ food.label }}
            </button>
          </div>
          <label class="block text-xs text-stone-500"
            ><span>{{ t("products.food.discovery.other_food") }}</span
            ><input
              :value="keyword"
              maxlength="120"
              type="search"
              class="mobile-input mt-1"
              :placeholder="t(&quot;products.food.discovery.food_example&quot;)"
              :disabled="disabled"
              @input="chooseFood(($event.target as HTMLInputElement).value)"
          /></label>
        </div>
        <div v-else-if="step === 1" class="grid grid-cols-2 gap-2">
          <button
            v-for="meal in meals"
            :key="meal.value"
            type="button"
            class="mobile-choice"
            :aria-pressed="mealTime === meal.value"
            :disabled="disabled"
            @click="chooseMeal(meal.value)"
          >
            <span aria-hidden="true" class="text-xl">{{ meal.icon }}</span
            >{{ meal.label }}
          </button>
        </div>
        <div v-else-if="step === 2" class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="mobile-choice justify-center text-xs"
              :aria-pressed="perPerson && !flexible"
              :disabled="disabled"
              @click="budgetBasis('per-person')"
            >
              {{ t("products.food.discovery.per_person") }}
            </button>
            <button
              type="button"
              class="mobile-choice justify-center text-xs"
              :aria-pressed="!perPerson && !flexible"
              :disabled="disabled"
              @click="budgetBasis('total-group-budget')"
            >
              {{ t("products.food.discovery.group_total") }}
            </button>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="amount in [2, 5, 10, 20, 35]"
              :key="amount"
              type="button"
              class="mobile-choice justify-center"
              :aria-pressed="
                !flexible && !filters.budgetRange && totalBudget === amount
              "
              :disabled="disabled"
              @click="chooseBudget(amount)"
            >
              ≤ ${{ amount }}
            </button>
            <button
              type="button"
              class="mobile-choice justify-center text-xs"
              :aria-pressed="flexible"
              :disabled="disabled"
              @click="chooseBudget(null)"
            >
              {{ t("products.food.discovery.any") }}
            </button>
          </div>
          <p class="text-xs text-stone-500">
            {{
              flexible
                ? t("products.food.discovery.no_budget_limit")
                : filters.budgetRange
                  ? budgetLabel || filters.budgetRange
                  : perPerson
                    ? t("products.food.discovery.person_budget_label")
                    : t("products.food.discovery.group_budget_label")
            }}
          </p>
          <details class="text-xs text-stone-500">
            <summary class="cursor-pointer py-2">{{ t("products.food.discovery.custom_budget") }}</summary>
            <input
              :value="totalBudget"
              type="number"
              min="0.01"
              max="10000"
              step="0.01"
              :aria-label="t(&quot;products.common.custom_budget_in_usd&quot;)"
              class="mobile-input mt-1"
              :disabled="disabled"
              @input="
                chooseBudget(Number(($event.target as HTMLInputElement).value))
              "
            />
          </details>
        </div>
        <div v-else-if="step === 3" class="space-y-3">
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="count in [1, 2, 3, 4, 6, 8]"
              :key="count"
              type="button"
              class="mobile-choice justify-center"
              :aria-pressed="peopleCount === count"
              :disabled="disabled"
              @click="emit('change', { peopleCount: count })"
            >
              {{ count === 1 ? t("products.food.discovery.alone") : t("products.food.discovery.people_count", { value: count }) }}
            </button>
          </div>
          <details class="text-xs text-stone-500">
            <summary class="cursor-pointer py-2">
              {{ t("products.food.discovery.other_count") }}
            </summary>
            <input
              :value="peopleCount"
              type="number"
              min="1"
              max="50"
              step="1"
              :aria-label="t(&quot;products.common.number_of_people&quot;)"
              class="mobile-input mt-1"
              :disabled="disabled"
              @input="
                emit('change', {
                  peopleCount: Number(
                    ($event.target as HTMLInputElement).value,
                  ),
                })
              "
            />
          </details>
        </div>
        <div v-else class="space-y-3">
          <button
            type="button"
            class="mobile-choice w-full"
            :aria-pressed="hasCoords"
            :disabled="disabled || locating"
            @click="emit('locate')"
          >
            <Compass class="size-5 text-orange-500" /><span>{{
              locating ? t("products.food.discovery.locating") : t("products.food.discovery.current_location")
            }}</span
            ><Check v-if="hasCoords" class="ml-auto size-4 text-orange-600" />
          </button>
          <p class="text-xs leading-relaxed text-stone-500">
            {{ locationLabel }}
          </p>
          <label
            class="block text-xs font-semibold text-stone-600 dark:text-stone-300"
            ><span>{{ t("products.food.discovery.select_area_help") }}</span
            ><ModernSelect
              :value="districtId"
              class="mobile-input mt-2"
              :disabled="disabled"
              @change="
                emit('district', ($event.target as HTMLSelectElement).value)
              "
            >
              <option value="" disabled>{{ t("products.food.discovery.select_area") }}</option>
              <option
                v-for="district in districts"
                :key="district.id"
                :value="district.id"
              >
                {{ district.nameKm }}
              </option>
            </ModernSelect></label
          >
          <button
            v-if="locationError && districtId && !hasCoords"
            type="button"
            class="min-h-11 text-left text-xs font-semibold text-orange-600 underline underline-offset-4 dark:text-orange-400"
            :disabled="disabled"
            @click="emit('district', districtId)"
          >{{ t("products.food.discovery.area_instead_gps") }}</button>
          <p v-if="mode === 'cook-at-home'" class="text-xs text-stone-500">
            {{ t("products.food.discovery.no_gps_recipe") }}
          </p>
        </div>
        <p
          v-if="!valid"
          role="alert"
          class="mt-3 text-xs text-amber-700 dark:text-amber-300"
        >
          {{ t("products.food.discovery.invalid_count_budget") }}
        </p>
        <div
          class="mt-5 flex gap-2 border-t border-stone-100 pt-4 dark:border-stone-800"
        >
          <button
            type="button"
            class="mobile-choice justify-center px-4"
            :disabled="step === 0 || disabled"
            :aria-label="t(&quot;products.common.previous_step&quot;)"
            @click="goStep(step - 1)"
          >
            <ArrowLeft class="size-4" />
          </button>
          <button
            type="button"
            class="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white disabled:opacity-50"
            :disabled="disabled || (step === 4 && locating) || !valid"
            @click="next"
          >
            {{
              step === 4
                ? mode === "cook-at-home"
                  ? t("products.food.discovery.create_recipe")
                  : t("products.food.discovery.matching_places")
                : t("products.food.discovery.next")
            }}<ArrowRight class="size-4" />
          </button>
        </div>
      </template>
      <form
        v-else
        class="space-y-4"
        @submit.prevent="!disabled && !locating && valid && emit('submit')"
      >
        <h2 class="text-xl font-black text-stone-900 dark:text-stone-100">
          {{ t("products.food.discovery.search_food") }}
        </h2>
        <label class="block text-xs text-stone-500"
          >{{ t("products.food.discovery.food_type") }}<input
            ref="searchInput"
            :value="keyword"
            type="search"
            maxlength="120"
            class="mobile-input mt-2"
            :placeholder="t(&quot;products.food.discovery.search_example&quot;)"
            :disabled="disabled"
            @input="chooseFood(($event.target as HTMLInputElement).value)"
        /></label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="food in foods.slice(1, 7)"
            :key="food.value"
            type="button"
            class="rounded-full border border-stone-200 px-3 py-2 text-xs dark:border-stone-700"
            :disabled="disabled"
            @click="chooseFood(food.value)"
          >
            {{ food.icon }} {{ food.label }}
          </button>
        </div>
        <p class="text-xs text-stone-500">
          {{ peopleCount }} {{ t("products.food.discovery.people_separator") }} {{ locationLabel }}
        </p>
        <button
          type="submit"
          class="min-h-12 w-full rounded-xl bg-orange-600 text-sm font-bold text-white disabled:opacity-50"
          :disabled="disabled || locating || !valid"
        >
          {{ mode === "cook-at-home" ? t("products.food.discovery.create_recipe") : t("products.food.discovery.search_places") }}
        </button>
        <button
          type="button"
          class="flex min-h-11 items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400"
          @click="open('advanced')"
        >
          <SlidersHorizontal class="size-4" />{{ t("products.food.discovery.edit_filters") }}
        </button>
      </form>
    </section>
    <div v-else class="space-y-1">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-bold text-stone-900 dark:text-stone-100">
          {{ menuItems.find((item) => item.panel === panel)?.label }}
        </h2>
        <button
          type="button"
          class="min-h-11 px-2 text-xs font-semibold text-orange-600 dark:text-orange-400"
          @click="open('steps')"
        >
          {{ t("products.food.discovery.edit_choices") }}
        </button>
      </div>
      <p
        v-if="panel === 'results'"
        class="truncate text-xs text-stone-500 dark:text-stone-400"
      >
        {{ keyword || t("products.food.discovery.all_food") }} · {{ locationLabel }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.mobile-nav {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgb(214 211 209);
  border-radius: 14px;
  padding: 8px 12px;
  background: white;
  color: #57534e;
  font-size: 12px;
  font-weight: 700;
}
.mobile-choice {
  display: flex;
  min-height: 48px;
  min-width: 0;
  align-items: center;
  gap: 8px;
  border: 1px solid #e7e5e4;
  border-radius: 12px;
  padding: 10px;
  background: #fff;
  color: #44403c;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}
.mobile-choice[aria-pressed="true"],
.mobile-nav[aria-pressed="true"] {
  border-color: #ea580c;
  background: #fff7ed;
  color: #c2410c;
  box-shadow: 0 0 0 1px #ea580c;
}
.mobile-choice:disabled,
.mobile-nav:disabled {
  opacity: 0.5;
}
.mobile-input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border: 1px solid #d6d3d1;
  border-radius: 12px;
  padding: 10px 12px;
  background: #fafaf9;
  color: #1c1917;
  font-size: 16px;
}
.dark .mobile-choice,
.dark .mobile-nav {
  border-color: #44403c;
  background: #1c1917;
  color: #e7e5e4;
}
.dark .mobile-choice[aria-pressed="true"],
.dark .mobile-nav[aria-pressed="true"] {
  border-color: #f97316;
  background: #431407;
  color: #fed7aa;
}
.dark .mobile-input {
  border-color: #57534e;
  background: #1c1917;
  color: #f5f5f4;
}
</style>
