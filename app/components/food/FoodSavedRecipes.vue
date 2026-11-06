<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { onMounted, ref, watch } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useSavedFoodRecipes } from "~/composables/useSavedFoodRecipes";
import type { KhmerRecipe } from "~/composables/useFoodDiscovery";

const { t } = useAppI18n();

const props = defineProps<{ refreshKey: number; initiallyExpanded?: boolean; shared?: boolean }>();
const emit = defineEmits<{ (event: "open", recipe: KhmerRecipe): void }>();
const { user, isReady, fetchMe } = useAuth();
const { recipes, isLoading, errorMessage, hasMore, refresh, loadMore } =
  useSavedFoodRecipes(() => user.value?.id || null, { shared: props.shared });
const expanded = ref(Boolean(props.initiallyExpanded));
let mounted = false;
function toggle(event: Event) {
  expanded.value = (event.target as HTMLDetailsElement).open;
  if (mounted && expanded.value && (props.shared || user.value) && !isLoading.value) void refresh();
}
watch([() => user.value?.id, () => props.refreshKey], () => {
  if (mounted && expanded.value && (props.shared || user.value)) void refresh();
});
onMounted(async () => {
  mounted = true;
  if (!props.shared && !isReady.value) await fetchMe();
  if (expanded.value && (props.shared || user.value) && !isLoading.value) void refresh();
});
function date(value: string) {
  return new Date(value).toLocaleDateString("km-KH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
</script>

<template>
  <details
    :open="expanded"
    class="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 sm:p-5"
    @toggle="toggle"
  >
    <summary
      class="cursor-pointer text-sm font-bold text-stone-800 dark:text-stone-100"
    >
      📚 {{ shared ? t("products.food.saved.public_title") : t("products.food.saved.account_title") }}
      <span class="ml-1 font-normal text-stone-500">/ {{ shared ? t("products.food.global_recipes") : t("products.food.my_recipes") }}</span>
    </summary>
    <div v-if="expanded" class="mt-4 space-y-3">
      <p v-if="!shared && !isReady" class="text-sm text-stone-500">{{ t("products.food.saved.loading_account") }}</p>
      <p v-else-if="!shared && !user" class="text-sm leading-relaxed text-stone-500">
        {{ t("products.food.saved.sign_in_help") }}
        <NuxtLink to="/account" class="font-semibold text-orange-600 underline"
          >{{ t("products.food.actions.sign_in") }}</NuxtLink
        >
      </p>
      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-stone-500">
            {{ shared ? t("products.food.saved.public_description") : t("products.food.saved.account_description") }} {{ t("products.food.saved.open_notice") }}
          </p>
          <button
            type="button"
            :disabled="isLoading"
            class="text-xs font-semibold text-orange-600 disabled:opacity-50"
            @click="refresh"
          >
            {{ t("products.food.actions.refresh") }}
          </button>
        </div>
        <p
          v-if="errorMessage"
          role="alert"
          class="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          {{ t(errorMessage ?? "") }}
          <button
            type="button"
            :disabled="isLoading"
            class="underline"
            @click="recipes.length && hasMore ? loadMore() : refresh()"
          >
            {{ t("products.food.actions.retry") }}
          </button>
        </p>
        <p
          v-if="!isLoading && !errorMessage && !recipes.length"
          class="py-3 text-sm text-stone-500"
        >
          {{ t("products.food.saved.empty") }}
        </p>
        <div class="grid min-w-0 gap-2 sm:grid-cols-2">
          <button
            v-for="recipe in recipes"
            :key="recipe.savedRecipeId"
            type="button"
            class="min-w-0 rounded-xl border border-stone-200 p-3 text-left transition hover:border-orange-300 hover:bg-orange-50/50 dark:border-stone-700 dark:hover:bg-orange-950/30"
            @click="emit('open', recipe)"
          >
            <span
              class="block break-words text-sm font-bold text-stone-800 dark:text-stone-100"
              >{{ recipe.nameKm }}</span
            ><span class="mt-1 block text-xs text-stone-500"
              >{{ recipe.servings }} {{ t("products.food.saved.people_budget_separator") }}{{ recipe.estimatedCostUsd }} ·
              {{ recipe.prepTimeMinutes + recipe.cookTimeMinutes }} {{ t("products.food.labels.minutes") }}</span
            ><time
              v-if="recipe.savedAt"
              :datetime="recipe.savedAt"
              class="mt-1 block text-[11px] text-stone-400"
              >{{ date(recipe.savedAt) }}</time
            >
          </button>
        </div>
        <p
          v-if="isLoading"
          class="text-center text-xs text-stone-500"
          aria-live="polite"
        >
          {{ t("products.food.saved.loading") }}
        </p>
        <button
          v-else-if="hasMore"
          type="button"
          class="rounded-xl border border-orange-200 px-4 py-2 text-xs font-semibold text-orange-600 dark:border-orange-900"
          @click="loadMore"
        >
          {{ t("products.food.saved.more") }}
        </button>
      </template>
    </div>
  </details>
</template>
