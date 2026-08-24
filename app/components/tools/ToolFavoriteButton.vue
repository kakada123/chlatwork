<script setup lang="ts">
import { Heart } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{ toolKey: string; toolName: string; showLabel?: boolean }>(),
  { showLabel: false },
);
const { isFavorite, toggleFavorite } = useToolFavorites();
const favorite = computed(() => isFavorite(props.toolKey));
</script>

<template>
  <button
    type="button"
    class="flex items-center justify-center gap-1.5 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-rose-300"
    :class="[
      showLabel ? 'h-9 border border-rose-200 px-3 shadow-sm dark:border-rose-300/20' : 'h-7 w-7',
      favorite ? 'bg-rose-50 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300' : 'bg-white/70 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:bg-white/[0.06] dark:text-slate-500 dark:hover:bg-rose-400/10 dark:hover:text-rose-300',
    ]"
    :aria-label="favorite ? `Remove ${toolName} from favorites` : `Save ${toolName} to favorites`"
    :aria-pressed="favorite"
    :title="favorite ? 'Remove from favorites' : 'Save to favorites'"
    @click="toggleFavorite(toolKey)"
  >
    <Heart class="h-3.5 w-3.5" :class="favorite ? 'fill-current' : ''" aria-hidden="true" />
    <span v-if="showLabel" class="text-xs font-semibold">
      {{ favorite ? "Favorited" : "Favorite" }}
    </span>
  </button>
</template>
