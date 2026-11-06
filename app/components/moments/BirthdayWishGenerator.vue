<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { computed, ref, watch } from "vue";
import { Check, LoaderCircle, Sparkles } from "lucide-vue-next";
import ModernSelect from "~/components/ModernSelect.vue";
import { useBirthdayWishGenerator, type BirthdayWishResult } from "~/composables/useBirthdayWishGenerator";

const props = defineProps<{ recipientName: string; locale: "en" | "km" }>();

const { t } = useAppI18n(computed(() => props.locale === "km"));
const emit = defineEmits<{ apply: [wish: BirthdayWishResult] }>();
const { user } = useAuth();
const relationship = ref("friend");
const customRelationship = ref("");
const tone = ref("warm");
const customTone = ref("");
const language = ref<"en" | "km">(props.locale);
const includeEmojis = ref(true);
const context = ref("");
const applied = ref(false);
const isKhmer = computed(() => props.locale === "km");
const copy = computed(() => ({
  heading: t("products.moments.birthday_wish_generator.heading"),
  intro: t("products.moments.birthday_wish_generator.intro"),
  relationship: t("products.moments.birthday_wish_generator.relationship"), customRelationship: t("products.moments.birthday_wish_generator.custom_relationship"),
  relationshipPlaceholder: t("products.moments.birthday_wish_generator.relationship_placeholder"), tone: t("products.moments.birthday_wish_generator.tone"),
  customTone: t("products.moments.birthday_wish_generator.custom_tone"), tonePlaceholder: t("products.moments.birthday_wish_generator.tone_placeholder"),
  language: t("products.moments.birthday_wish_generator.language"), context: t("products.moments.birthday_wish_generator.context"),
  includeEmojis: t("products.moments.birthday_wish_generator.include_emojis"),
  contextPlaceholder: t("products.moments.birthday_wish_generator.context_placeholder"),
  privacy: t("products.moments.birthday_wish_generator.privacy"),
  nameRequired: t("products.moments.birthday_wish_generator.name_required"), loginRequired: t("products.moments.birthday_wish_generator.login_required"),
  search: t("products.moments.birthday_wish_generator.search"), generate: t("products.moments.birthday_wish_generator.generate"), generating: t("products.moments.birthday_wish_generator.generating"),
  regenerate: t("products.moments.birthday_wish_generator.regenerate"), preview: t("products.moments.birthday_wish_generator.preview"), mainMessage: t("products.moments.birthday_wish_generator.main_message"),
  surprise: t("products.moments.birthday_wish_generator.surprise"), surpriseHint: t("products.moments.birthday_wish_generator.surprise_hint"),
  use: t("products.moments.birthday_wish_generator.use"), applied: t("products.moments.birthday_wish_generator.applied"), other: t("products.moments.birthday_wish_generator.other"),
  authError: t("products.moments.birthday_wish_generator.auth_error"), rateError: t("products.moments.birthday_wish_generator.rate_error"),
  unavailable: t("products.moments.birthday_wish_generator.unavailable"),
}));
const relationships = [
  { value: "friend", labelKey: "products.moments.wish.relationships.friend" },
  { value: "best friend", labelKey: "products.moments.wish.relationships.best_friend" },
  { value: "coworker", labelKey: "products.moments.wish.relationships.coworker" },
  { value: "boss", labelKey: "products.moments.wish.relationships.boss" },
  { value: "romantic partner", labelKey: "products.moments.wish.relationships.romantic_partner" },
  { value: "wife", labelKey: "products.moments.wish.relationships.wife" },
  { value: "husband", labelKey: "products.moments.wish.relationships.husband" },
  { value: "parent", labelKey: "products.moments.wish.relationships.parent" },
  { value: "sibling", labelKey: "products.moments.wish.relationships.sibling" },
  { value: "child", labelKey: "products.moments.wish.relationships.child" },
  { value: "teacher", labelKey: "products.moments.wish.relationships.teacher" },
];
const tones = [
  { value: "warm", labelKey: "products.moments.wish.tones.warm" },
  { value: "funny", labelKey: "products.moments.wish.tones.funny" },
  { value: "romantic", labelKey: "products.moments.wish.tones.romantic" },
  { value: "professional", labelKey: "products.moments.wish.tones.professional" },
  { value: "inspiring", labelKey: "products.moments.wish.tones.inspiring" },
  { value: "short and sweet", labelKey: "products.moments.wish.tones.short_and_sweet" },
  { value: "poetic", labelKey: "products.moments.wish.tones.poetic" },
];
const { result, loading, error, canGenerate, generate, getApplicableWish } = useBirthdayWishGenerator({
  input: () => ({
    recipientName: props.recipientName.trim(),
    relationship: relationship.value === "custom" ? customRelationship.value.trim() : relationship.value,
    tone: tone.value === "custom" ? customTone.value.trim() : tone.value,
    language: language.value,
    includeEmojis: includeEmojis.value,
    context: context.value.trim(),
  }),
  session: () => user.value?.id ?? null,
});
const errorText = computed(() => error.value === "auth" ? copy.value.authError : error.value === "rate-limit" ? copy.value.rateError : copy.value.unavailable);
watch(result, () => { applied.value = false; });

function applyWish() {
  const wish = getApplicableWish();
  if (!wish) return;
  emit("apply", wish);
  applied.value = true;
}
</script>

<template>
  <section class="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-500/30 dark:bg-violet-950/20" :aria-label="copy.heading">
    <div class="space-y-1">
      <h3 class="flex items-center gap-2 font-bold text-violet-950 dark:text-violet-100"><Sparkles class="h-4 w-4 shrink-0" aria-hidden="true" />{{ copy.heading }}</h3>
      <p class="text-sm text-slate-600 dark:text-slate-300">{{ copy.intro }}</p>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <label class="wish-label">
        <span>{{ copy.relationship }}</span>
        <ModernSelect v-model="relationship" :search-placeholder="copy.search">
          <option v-for="item in relationships" :key="item.value" :value="item.value">{{ t(item.labelKey) }}</option>
          <option value="custom">{{ copy.other }}</option>
        </ModernSelect>
      </label>
      <label class="wish-label">
        <span>{{ copy.tone }}</span>
        <ModernSelect v-model="tone" :search-placeholder="copy.search">
          <option v-for="item in tones" :key="item.value" :value="item.value">{{ t(item.labelKey) }}</option>
          <option value="custom">{{ copy.other }}</option>
        </ModernSelect>
      </label>
      <label v-if="relationship === 'custom'" class="wish-label">
        <span>{{ copy.customRelationship }}</span>
        <input v-model="customRelationship" type="text" maxlength="120" :placeholder="copy.relationshipPlaceholder" class="wish-input" />
      </label>
      <label v-if="tone === 'custom'" class="wish-label">
        <span>{{ copy.customTone }}</span>
        <input v-model="customTone" type="text" maxlength="120" :placeholder="copy.tonePlaceholder" class="wish-input" />
      </label>
      <label class="wish-label sm:col-span-2">
        <span>{{ copy.language }}</span>
        <ModernSelect v-model="language" :search-placeholder="copy.search">
          <option value="km">ខ្មែរ</option>
          <option value="en">{{ t("products.common.english") }}</option>
        </ModernSelect>
      </label>
    </div>
    <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
      <input v-model="includeEmojis" type="checkbox" class="h-4 w-4 rounded border-slate-300 accent-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500" />
      <span>{{ copy.includeEmojis }}</span>
    </label>
    <label class="wish-label">
      <span>{{ copy.context }}</span>
      <textarea v-model="context" rows="3" maxlength="1000" :placeholder="copy.contextPlaceholder" class="wish-input resize-y" />
      <span class="text-xs font-normal text-slate-500 dark:text-slate-400">{{ copy.privacy }}</span>
    </label>
    <p v-if="!recipientName.trim()" class="text-sm text-slate-600 dark:text-slate-300">{{ copy.nameRequired }}</p>
    <p v-else-if="!user" class="text-sm text-slate-600 dark:text-slate-300">{{ copy.loginRequired }}</p>
    <button type="button" :disabled="!canGenerate || loading" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50" @click="generate">
      <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" aria-hidden="true" /><Sparkles v-else class="h-4 w-4" aria-hidden="true" />
      {{ loading ? copy.generating : result ? copy.regenerate : copy.generate }}
    </button>
    <p v-if="error" role="alert" class="text-sm text-red-700 dark:text-red-300">{{ errorText }}</p>
    <div aria-live="polite" aria-atomic="true">
      <p v-if="loading" class="sr-only" role="status">{{ copy.generating }}</p>
      <div v-if="result" class="space-y-3 rounded-xl border border-violet-100 bg-white p-4 dark:border-violet-500/20 dark:bg-slate-900">
        <p class="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">{{ copy.preview }}</p>
        <h4 class="break-words font-bold text-slate-900 dark:text-white">{{ result.title }}</h4>
        <div class="space-y-1"><p class="text-xs font-bold text-slate-500 dark:text-slate-400">{{ copy.mainMessage }}</p><p class="whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-200">{{ result.message }}</p></div>
        <div class="space-y-1"><p class="text-xs font-bold text-slate-500 dark:text-slate-400">{{ copy.surprise }}</p><p class="whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-200">{{ result.secretMessage }}</p><p class="text-xs text-slate-500 dark:text-slate-400">{{ copy.surpriseHint }}</p></div>
        <button type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700" @click="applyWish"><Check class="h-4 w-4" aria-hidden="true" />{{ applied ? copy.applied : copy.use }}</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.wish-label { @apply flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200; }
.wish-input { @apply min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white; }
</style>
