<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useSavedFoodRecipes } from "~/composables/useSavedFoodRecipes";
import type { KhmerRecipe } from "~/composables/useFoodDiscovery";
const props = defineProps<{ refreshKey: number }>();
const emit = defineEmits<{ (event: "open", recipe: KhmerRecipe): void }>();
const { user, isReady, fetchMe } = useAuth();
const { recipes, isLoading, errorMessage, hasMore, refresh, loadMore } =
  useSavedFoodRecipes(() => user.value?.id || null);
const expanded = ref(false);
let mounted = false;
function toggle(event: Event) {
  expanded.value = (event.target as HTMLDetailsElement).open;
  if (mounted && expanded.value && user.value) void refresh();
}
watch([() => user.value?.id, () => props.refreshKey], () => {
  if (mounted && expanded.value && user.value) void refresh();
});
onMounted(async () => {
  mounted = true;
  if (!isReady.value) await fetchMe();
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
    class="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 sm:p-5"
    @toggle="toggle"
  >
    <summary
      class="cursor-pointer text-sm font-bold text-stone-800 dark:text-stone-100"
    >
      📚 រូបមន្តដែលបានរក្សាទុក
      <span class="ml-1 font-normal text-stone-500">/ My recipes</span>
    </summary>
    <div v-if="expanded" class="mt-4 space-y-3">
      <p v-if="!isReady" class="text-sm text-stone-500">កំពុងផ្ទុកគណនី…</p>
      <p v-else-if="!user" class="text-sm leading-relaxed text-stone-500">
        ចូលគណនីមុនបង្កើតរូបមន្ត ដើម្បីរក្សាទុក និងមើលប្រវត្តិរបស់អ្នកនៅទីនេះ។
        <NuxtLink to="/account" class="font-semibold text-orange-600 underline"
          >ចូលគណនី</NuxtLink
        >
      </p>
      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-stone-500">
            រូបមន្ត AI របស់គណនីអ្នក · បើកមើលបានដោយមិនបង្កើតឡើងវិញ
          </p>
          <button
            type="button"
            :disabled="isLoading"
            class="text-xs font-semibold text-orange-600 disabled:opacity-50"
            @click="refresh"
          >
            ផ្ទុកឡើងវិញ
          </button>
        </div>
        <p
          v-if="errorMessage"
          role="alert"
          class="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          {{ errorMessage }}
          <button
            type="button"
            :disabled="isLoading"
            class="underline"
            @click="recipes.length && hasMore ? loadMore() : refresh()"
          >
            សាកម្ដងទៀត
          </button>
        </p>
        <p
          v-if="!isLoading && !errorMessage && !recipes.length"
          class="py-3 text-sm text-stone-500"
        >
          មិនទាន់មានរូបមន្តទេ។
          រូបមន្តថ្មីរបស់អ្នកនឹងត្រូវបានរក្សាទុកដោយស្វ័យប្រវត្តិ។
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
              >{{ recipe.servings }} នាក់ · ≈ ${{ recipe.estimatedCostUsd }} ·
              {{ recipe.prepTimeMinutes + recipe.cookTimeMinutes }} នាទី</span
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
          កំពុងផ្ទុករូបមន្ត…
        </p>
        <button
          v-else-if="hasMore"
          type="button"
          class="rounded-xl border border-orange-200 px-4 py-2 text-xs font-semibold text-orange-600 dark:border-orange-900"
          @click="loadMore"
        >
          មើលរូបមន្តបន្ថែម
        </button>
      </template>
    </div>
  </details>
</template>
