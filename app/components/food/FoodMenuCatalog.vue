<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { useFoodMenuCatalog } from "~/composables/useFoodMenuCatalog";
import type { FoodMenuItem } from "~~/api/src/food/catalog/food-menu.contract";
const props = defineProps<{ disabled?: boolean; initiallyExpanded?: boolean; refreshKey?: number; recipeLoading?: boolean }>();
const emit = defineEmits<{
  (event: "open-recipe", id: string): void;
  (
    event: "choose",
    item: FoodMenuItem,
    mode: "dine-out" | "cook-at-home",
  ): void;
}>();
const {
  q,
  category,
  cuisine,
  mealTime,
  tag,
  items,
  total,
  categories,
  cuisines,
  mealTimes,
  isLoading,
  isLoadingMore,
  hasLoaded,
  errorMessage,
  hasMore,
  canAutoLoadMore,
  search,
  refresh,
  loadMore,
} = useFoodMenuCatalog();
const expanded = ref(Boolean(props.initiallyExpanded)),
  sentinel = ref<HTMLElement | null>(null),
  mobile = ref(false),
  supported = ref(false);
let observer: IntersectionObserver | undefined,
  viewport: MediaQueryList | undefined;
const meals: Record<string, string> = {
  breakfast: "ព្រឹក",
  lunch: "ថ្ងៃត្រង់",
  snack: "សម្រន់",
  dinner: "ល្ងាច",
};
function toggle(event: Event) {
  expanded.value = (event.target as HTMLDetailsElement).open;
  if (expanded.value) refresh();
}
function choose(item: FoodMenuItem, mode: "dine-out" | "cook-at-home") {
  expanded.value = false;
  emit("choose", item, mode);
}
function observe() {
  observer?.disconnect();
  if (expanded.value && mobile.value && canAutoLoadMore.value && sentinel.value)
    observer?.observe(sentinel.value);
}
function resize() {
  mobile.value = viewport?.matches || false;
}
watch([expanded, sentinel, mobile, canAutoLoadMore], observe);
watch(() => props.refreshKey, () => {
  if (expanded.value) refresh();
});
onMounted(() => {
  if (expanded.value && !hasLoaded.value && !isLoading.value) void search();
  viewport = window.matchMedia("(max-width: 767px)");
  resize();
  viewport.addEventListener("change", resize);
  supported.value = typeof window.IntersectionObserver === "function";
  if (supported.value)
    observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          canAutoLoadMore.value
        )
          void loadMore();
      },
      { rootMargin: "240px 0px" },
    );
});
onBeforeUnmount(() => {
  observer?.disconnect();
  viewport?.removeEventListener("change", resize);
});
</script>

<template>
  <details
    :open="expanded"
    class="min-w-0 rounded-3xl border border-orange-200 bg-white p-4 shadow-sm dark:border-orange-950 dark:bg-stone-900 sm:p-6"
    @toggle="toggle"
  >
    <summary
      class="cursor-pointer text-base font-bold text-stone-900 dark:text-stone-100"
    >
      🍱 មើលបញ្ជីមុខម្ហូបនៅកម្ពុជា
      <span class="ml-1 text-xs font-normal text-stone-500"
        >Food ideas
        <template v-if="hasLoaded && !isLoading && !errorMessage"
          >· {{ total }}</template
        ></span
      >
    </summary>
    <div v-if="expanded" class="mt-5 space-y-4">
      <p class="text-xs leading-relaxed text-stone-500">
        បញ្ជីមុខម្ហូបរៀបចំដោយជំនួយ AI។ គ្រឿងផ្សំអាចខុសគ្នាតាមអ្នកចម្អិន។
        សូមបញ្ជាក់តម្លៃ និងអាលែកហ្ស៊ីជាមួយហាងផ្ទាល់។
      </p>
      <form class="space-y-3" @submit.prevent="search">
        <div class="flex gap-2">
          <input
            v-model="q"
            maxlength="120"
            type="search"
            class="min-w-0 flex-1 rounded-xl border border-stone-200 bg-transparent px-3 py-2 text-base dark:border-stone-700"
            placeholder="ស្វែងរកមុខម្ហូប / Khmer or English"
            aria-label="Search food catalog"
          /><button
            type="submit"
            :disabled="isLoading || isLoadingMore"
            class="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            ស្វែងរក
          </button>
        </div>
        <div class="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4">
          <select
            v-model="category"
            class="min-w-0 rounded-xl border border-stone-200 bg-transparent px-2 py-2 text-base dark:border-stone-700 sm:text-sm"
            aria-label="Food category"
            @change="search"
          >
            <option value="">មុខម្ហូបគ្រប់ប្រភេទ</option>
            <option
              v-for="option in categories"
              :key="option.value"
              :value="option.value"
            >
              {{ option.icon }} {{ option.labelKm }}
            </option>
          </select>
          <select
            v-model="cuisine"
            class="min-w-0 rounded-xl border border-stone-200 bg-transparent px-2 py-2 text-base dark:border-stone-700 sm:text-sm"
            aria-label="Cuisine"
            @change="search"
          >
            <option value="">ម្ហូបគ្រប់តំបន់</option>
            <option
              v-for="option in cuisines"
              :key="option.value"
              :value="option.value"
            >
              {{ option.labelKm }}
            </option>
          </select>
          <select
            v-model="mealTime"
            class="min-w-0 rounded-xl border border-stone-200 bg-transparent px-2 py-2 text-base dark:border-stone-700 sm:text-sm"
            aria-label="Meal time"
            @change="search"
          >
            <option value="">គ្រប់ពេលញ៉ាំ</option>
            <option v-for="meal in mealTimes" :key="meal" :value="meal">
              {{ meals[meal] || meal }}
            </option>
          </select>
          <select
            v-model="tag"
            class="min-w-0 rounded-xl border border-stone-200 bg-transparent px-2 py-2 text-base dark:border-stone-700 sm:text-sm"
            aria-label="Food style"
            @change="search"
          >
            <option value="">គ្រប់បែប</option>
            <option value="STREET_FOOD">ម្ហូបតាមផ្លូវ</option>
            <option value="HOME_COOKING">ម្ហូបផ្ទះ</option>
            <option value="CAFE">កាហ្វេ</option>
            <option value="QUICK_MEAL">ញ៉ាំឆាប់រហ័ស</option>
            <option value="SHAREABLE">ចែកគ្នាញ៉ាំ</option>
            <option value="FAMILY_MEAL">ញ៉ាំជុំគ្រួសារ</option>
          </select>
        </div>
      </form>
      <p
        v-if="errorMessage"
        role="alert"
        class="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
      >
        {{ errorMessage }}
        <button
          type="button"
          :disabled="isLoading || isLoadingMore"
          class="underline"
          @click="items.length && hasMore ? loadMore() : search()"
        >
          សាកម្ដងទៀត
        </button>
      </p>
      <div v-if="isLoading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="index in 6"
          :key="index"
          class="h-44 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-800"
        />
      </div>
      <p
        v-else-if="!items.length && !errorMessage"
        class="py-6 text-center text-sm text-stone-500"
      >
        មិនទាន់មានមុខម្ហូបដែលត្រូវគ្នាទេ។ សាកពាក្យផ្សេង ឬប្តូរតម្រង។
      </p>
      <div v-else class="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="item in items"
          :key="item.slug"
          class="flex min-w-0 flex-col rounded-2xl border border-stone-200 p-4 dark:border-stone-700"
        >
          <div
            class="mb-2 flex flex-wrap items-center gap-2 text-xs text-stone-500"
          >
            <span
              >{{
                categories.find((entry) => entry.value === item.category)?.icon
              }}
              {{
                categories.find((entry) => entry.value === item.category)
                  ?.labelKm
              }}</span
            ><span
              >·
              {{
                item.mealTimes.map((meal) => meals[meal] || meal).join(" / ")
              }}</span
            >
          </div>
          <h4
            class="break-words text-base font-bold text-stone-900 dark:text-stone-100"
          >
            {{ item.nameKm }}
          </h4>
          <p class="mt-1 break-words text-xs text-stone-400">
            {{ item.nameEn }}
          </p>
          <p
            class="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300"
          >
            {{ item.descriptionKm }}
          </p>
          <details class="mt-3 text-xs text-stone-500">
            <summary class="cursor-pointer font-semibold">
              គ្រឿងផ្សំទូទៅ និងព័ត៌មានបន្ថែម
            </summary>
            <p class="mt-2 leading-relaxed">{{ item.descriptionEn }}</p>
            <p class="mt-2 leading-relaxed">
              {{
                item.ingredients
                  .map((ingredient) => ingredient.nameKm)
                  .join(" · ")
              }}
            </p>
          </details>
          <div class="mt-auto flex flex-wrap gap-2 pt-4">
            <button
              v-if="item.recipeId"
              type="button"
              :disabled="recipeLoading"
              class="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:opacity-50 dark:border-emerald-900 dark:text-emerald-300"
              @click="emit('open-recipe', item.recipeId)"
            >
              មើលរបៀបចម្អិន / View how to cook
            </button>
            <button
              type="button"
              :disabled="disabled"
              class="rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              @click="choose(item, 'dine-out')"
            >
              រកហាងនៅជិត</button
            ><button
              type="button"
              :disabled="disabled"
              class="rounded-xl border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-700 disabled:opacity-50 dark:border-orange-900 dark:text-orange-300"
              @click="choose(item, 'cook-at-home')"
            >
              បង្កើតរូបមន្ត AI
            </button>
          </div>
        </article>
      </div>
      <div v-if="hasMore" class="flex justify-center py-2" aria-live="polite">
        <button
          v-if="!mobile || !supported || errorMessage"
          type="button"
          :disabled="isLoadingMore"
          class="rounded-xl border border-orange-300 px-5 py-2.5 text-sm font-semibold text-orange-700 disabled:opacity-50 dark:text-orange-300"
          @click="loadMore"
        >
          {{ isLoadingMore ? "កំពុងផ្ទុក…" : "មើលមុខម្ហូបបន្ថែម" }}</button
        ><span v-else-if="isLoadingMore" class="text-sm text-stone-500"
          >កំពុងផ្ទុកមុខម្ហូបបន្ថែម…</span
        >
      </div>
      <div ref="sentinel" class="h-px" aria-hidden="true" />
    </div>
  </details>
</template>
