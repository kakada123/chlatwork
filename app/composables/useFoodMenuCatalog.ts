import { computed, ref } from "vue";
import type { FoodMenuCatalogItem } from "~~/api/src/food/catalog/food-menu.contract";
interface Option {
  value: string;
  label: string;
  labelKm: string;
  icon?: string;
}
interface CatalogResult {
  items: FoodMenuCatalogItem[];
  total: number;
  nextCursor?: string;
  categories: Option[];
  cuisines: Option[];
  mealTimes: string[];
  tags: string[];
}

export function useFoodMenuCatalog() {
  const q = ref(""),
    category = ref(""),
    cuisine = ref(""),
    mealTime = ref(""),
    tag = ref("");
  const items = ref<FoodMenuCatalogItem[]>([]),
    total = ref(0),
    categories = ref<Option[]>([]),
    cuisines = ref<Option[]>([]);
  const mealTimes = ref<string[]>([]),
    tags = ref<string[]>([]);
  const isLoading = ref(false),
    isLoadingMore = ref(false),
    hasLoaded = ref(false),
    errorMessage = ref<string | null>(null);
  const cursor = ref<string | undefined>(),
    activeSignature = ref("");
  let activeQuery: Record<string, unknown> = {},
    inFlight = "",
    pending = false;
  const seen = new Set<string>();
  const criteria = () => ({
    ...(q.value.trim() ? { q: q.value.trim() } : {}),
    ...(category.value ? { category: category.value } : {}),
    ...(cuisine.value ? { cuisine: cuisine.value } : {}),
    ...(mealTime.value ? { mealTime: mealTime.value } : {}),
    ...(tag.value ? { tag: tag.value } : {}),
    limit: 24,
  });
  const signature = () => JSON.stringify(criteria());
  const busy = () => isLoading.value || isLoadingMore.value;
  const hasMore = computed(
    () => Boolean(cursor.value) && activeSignature.value === signature(),
  );
  const canAutoLoadMore = computed(
    () => hasMore.value && !busy() && !errorMessage.value,
  );
  function drain() {
    if (pending && !busy()) {
      pending = false;
      void search();
    }
  }
  function refresh() {
    // Generation can finish while this same catalog query is still in flight.
    if (busy()) pending = true;
    else void search();
  }
  async function search() {
    const key = signature();
    if (busy()) {
      if (key !== inFlight) pending = true;
      return;
    }
    isLoading.value = true;
    hasLoaded.value = true;
    inFlight = key;
    errorMessage.value = null;
    items.value = [];
    total.value = 0;
    cursor.value = undefined;
    try {
      const query = JSON.parse(key);
      const result = await $fetch<CatalogResult>("/api/food/menu-catalog", {
        query,
        retry: 0,
      });
      if (key !== signature()) return;
      items.value = [
        ...new Map(result.items.map((item) => [item.slug, item])).values(),
      ];
      total.value = result.total;
      categories.value = result.categories;
      cuisines.value = result.cuisines;
      mealTimes.value = result.mealTimes;
      tags.value = result.tags;
      activeQuery = query;
      activeSignature.value = key;
      cursor.value = result.nextCursor;
      seen.clear();
    } catch {
      if (key === signature())
        errorMessage.value = "មិនអាចផ្ទុកបញ្ជីមុខម្ហូបបានទេ។ សូមសាកម្ដងទៀត។";
    } finally {
      isLoading.value = false;
      drain();
    }
  }
  async function loadMore() {
    if (busy() || !hasMore.value || !cursor.value) return;
    const key = activeSignature.value,
      after = cursor.value;
    isLoadingMore.value = true;
    inFlight = key;
    errorMessage.value = null;
    try {
      const result = await $fetch<CatalogResult>("/api/food/menu-catalog", {
        query: { ...activeQuery, after },
        retry: 0,
      });
      if (key !== signature()) return;
      const ids = new Set(items.value.map((item) => item.slug));
      items.value.push(
        ...result.items.filter((item) => {
          if (ids.has(item.slug)) return false;
          ids.add(item.slug);
          return true;
        }),
      );
      total.value = result.total;
      seen.add(after);
      cursor.value =
        result.nextCursor && !seen.has(result.nextCursor)
          ? result.nextCursor
          : undefined;
    } catch {
      if (key === signature())
        errorMessage.value = "មិនអាចផ្ទុកមុខម្ហូបបន្ថែមបានទេ។ ចុចសាកម្ដងទៀត។";
    } finally {
      isLoadingMore.value = false;
      drain();
    }
  }
  return {
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
    tags,
    isLoading,
    isLoadingMore,
    hasLoaded,
    errorMessage,
    hasMore,
    canAutoLoadMore,
    search,
    refresh,
    loadMore,
  };
}
