<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { Heart, LoaderCircle } from "lucide-vue-next";

const { t } = useAppI18n();

const props = withDefaults(
  defineProps<{ toolKey: string; toolName: string; showLabel?: boolean }>(),
  { showLabel: false },
);
const { isKhmer } = useLanguage();
const { user, isReady: authReady } = useAuth();
const { favoritesReady, favoriteError, isFavorite, toggleFavorite, isFavoriteSaving } = useToolFavorites();
const localizedFavoriteError = computed(() => favoriteError.value);
const favorite = computed(() => isFavorite(props.toolKey));
const saving = computed(() => isFavoriteSaving(props.toolKey));
const saveFailed = ref(false);
const actionTitle = computed(() => {
  if (saveFailed.value && favoriteError.value) return localizedFavoriteError.value;
  if (!authReady.value || !favoritesReady.value)
    return t("shared.components_tools_tool_favorite_button.loading_account_favorites");
  if (!user.value)
    return t("shared.components_tools_tool_favorite_button.sign_in_to_save_favorites");
  return favorite.value
    ? (t("shared.components_tools_tool_favorite_button.remove_from_favorites"))
    : (t("shared.components_tools_tool_favorite_button.save_to_favorites"));
});
const actionAriaLabel = computed(() => {
  if (!authReady.value || !favoritesReady.value)
    return t("shared.components_tools_tool_favorite_button.loading_favorites_for", { toolName: props.toolName });
  if (!user.value)
    return t("shared.components_tools_tool_favorite_button.sign_in_to_save_to_favorites", { toolName: props.toolName });
  return favorite.value
    ? (t("shared.components_tools_tool_favorite_button.remove_from_favorites_2", { toolName: props.toolName }))
    : (t("shared.components_tools_tool_favorite_button.save_to_favorites_2", { toolName: props.toolName }));
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
      {{ saving ? (t("shared.common.saving")) : (favorite) ? t("shared.extra_app_components_tools_ToolFavoriteButton_vue.favorited") : t("shared.extra_app_components_tools_ToolFavoriteButton_vue.favorite") }}
    </span>
    <span v-if="saveFailed" class="sr-only" role="alert">{{ localizedFavoriteError }}</span>
  </button>
</template>
