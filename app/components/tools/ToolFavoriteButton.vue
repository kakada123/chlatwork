<script setup lang="ts">
import { Heart, LoaderCircle } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{ toolKey: string; toolName: string; showLabel?: boolean }>(),
  { showLabel: false },
);
const { user, isReady: authReady } = useAuth();
const { favoritesReady, favoriteError, isFavorite, toggleFavorite, isFavoriteSaving } = useToolFavorites();
const favorite = computed(() => isFavorite(props.toolKey));
const saving = computed(() => isFavoriteSaving(props.toolKey));
const saveFailed = ref(false);
const actionTitle = computed(() => {
  if (saveFailed.value && favoriteError.value) return favoriteError.value;
  if (!authReady.value || !favoritesReady.value) return "Loading account favorites";
  if (!user.value) return "Sign in to save favorites";
  return favorite.value ? "Remove from favorites" : "Save to favorites";
});
const actionAriaLabel = computed(() => {
  if (!authReady.value || !favoritesReady.value) return `Loading favorites for ${props.toolName}`;
  if (!user.value) return `Sign in to save ${props.toolName} to favorites`;
  return favorite.value
    ? `Remove ${props.toolName} from favorites`
    : `Save ${props.toolName} to favorites`;
});

async function handleToggle() {
  saveFailed.value = false;
  const wasSignedIn = Boolean(user.value);
  const saved = await toggleFavorite(props.toolKey);
  saveFailed.value = wasSignedIn && !saved;
}
</script>

<template>
  <button
    type="button"
    class="flex items-center justify-center gap-1.5 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-rose-300"
    :class="[
      showLabel ? 'h-9 border border-rose-200 px-3 shadow-sm dark:border-rose-300/20' : 'h-7 w-7',
      favorite ? 'bg-rose-50 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300' : 'bg-white/70 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:bg-white/[0.06] dark:text-slate-500 dark:hover:bg-rose-400/10 dark:hover:text-rose-300',
    ]"
    :aria-label="actionAriaLabel"
    :aria-pressed="favorite"
    :aria-busy="saving"
    :disabled="!authReady || !favoritesReady || saving"
    :title="actionTitle"
    @click="handleToggle"
  >
    <LoaderCircle v-if="saving" class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
    <Heart v-else class="h-3.5 w-3.5" :class="favorite ? 'fill-current' : ''" aria-hidden="true" />
    <span v-if="showLabel" class="text-xs font-semibold">
      {{ saving ? "Saving…" : favorite ? "Favorited" : "Favorite" }}
    </span>
  </button>
  <span v-if="saveFailed" class="sr-only" role="alert">{{ favoriteError }}</span>
</template>
