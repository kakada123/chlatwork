<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Check, LoaderCircle, Sparkles } from "lucide-vue-next";
import ModernSelect from "~/components/ModernSelect.vue";
import { useBirthdayWishGenerator, type BirthdayWishResult } from "~/composables/useBirthdayWishGenerator";

const props = defineProps<{ recipientName: string; locale: "en" | "km" }>();
const emit = defineEmits<{ apply: [wish: BirthdayWishResult] }>();
const { user } = useAuth();
const relationship = ref("friend");
const customRelationship = ref("");
const tone = ref("warm");
const customTone = ref("");
const language = ref<"en" | "km">(props.locale);
const context = ref("");
const applied = ref(false);
const isKhmer = computed(() => props.locale === "km");
const copy = computed(() => isKhmer.value ? {
  heading: "សរសេរពាក្យជូនពរថ្ងៃកំណើតជាមួយ AI",
  intro: "ជ្រើសរើសទំនាក់ទំនង និងសំនៀង រួចពិនិត្យពាក្យជូនពរមុននឹងប្រើ។",
  relationship: "ទំនាក់ទំនងជាមួយអ្នកទទួល", customRelationship: "បញ្ជាក់ទំនាក់ទំនង",
  relationshipPlaceholder: "ឧ. គ្រូបង្រៀន ឬអ្នកណែនាំ", tone: "សំនៀងនៃពាក្យជូនពរ",
  customTone: "បញ្ជាក់សំនៀងដែលអ្នកចង់បាន", tonePlaceholder: "ឧ. សុភាព និងមានក្តីសង្ឃឹម",
  language: "ភាសានៃពាក្យជូនពរ", context: "ព័ត៌មានបន្ថែម (មិនចាំបាច់)",
  contextPlaceholder: "ចែករំលែកអនុស្សាវរីយ៍ គុណសម្បត្តិ ឬអ្វីដែលអ្នកចង់ជូនពរ។",
  privacy: "បញ្ចូលតែព័ត៌មានដែលអ្នកចង់ចែករំលែកជាមួយសេវា AI។",
  nameRequired: "បញ្ចូលឈ្មោះអ្នកទទួលមុនសិន។", loginRequired: "ចូលគណនីដើម្បីបង្កើតពាក្យជូនពរជាមួយ AI។",
  search: "ស្វែងរកជម្រើស…", generate: "បង្កើតពាក្យជូនពរ", generating: "កំពុងសរសេរពាក្យជូនពរ…",
  regenerate: "បង្កើតម្តងទៀត", preview: "ពិនិត្យពាក្យជូនពរ", mainMessage: "សារជូនពរ",
  surprise: "សារភ្ញាក់ផ្អើល", surpriseHint: "សារនេះនឹងបង្ហាញក្នុងកាតដែលអ្នកចែករំលែក។",
  use: "ប្រើពាក្យជូនពរនេះ", applied: "បានប្រើពាក្យជូនពរ", other: "ផ្សេងទៀត (បញ្ជាក់ផ្ទាល់)",
  authError: "សូមចូលគណនីដើម្បីបង្កើតពាក្យជូនពរ។", rateError: "អ្នកបានស្នើច្រើនដងហើយ។ សូមរង់ចាំមួយនាទី រួចសាកម្តងទៀត។",
  unavailable: "មិនអាចបង្កើតពាក្យជូនពរបានទេ។ សូមសាកម្តងទៀតនៅពេលក្រោយ។",
} : {
  heading: "Write a birthday wish with AI",
  intro: "Choose a relationship and tone, then review your wish before using it.",
  relationship: "Relationship to recipient", customRelationship: "Describe the relationship",
  relationshipPlaceholder: "e.g. teacher or mentor", tone: "Tone of the wish",
  customTone: "Describe your preferred tone", tonePlaceholder: "e.g. respectful and hopeful",
  language: "Wish language", context: "Personal details (optional)",
  contextPlaceholder: "Share a memory, a quality you appreciate, or something to wish for.",
  privacy: "Only include details you want to share with the AI provider.",
  nameRequired: "Enter the recipient’s name first.", loginRequired: "Sign in to generate a wish with AI.",
  search: "Search options…", generate: "Generate a wish", generating: "Writing your wish…",
  regenerate: "Generate again", preview: "Review your wish", mainMessage: "Birthday message",
  surprise: "Surprise message", surpriseHint: "This message will be revealed in the card you share.",
  use: "Use this wish", applied: "Wish applied", other: "Other (describe your own)",
  authError: "Please sign in to generate a wish.", rateError: "You’ve made several requests. Wait a minute, then try again.",
  unavailable: "We couldn’t generate a wish. Please try again later.",
});
const relationships = [
  { value: "friend", en: "Friend", km: "មិត្តភក្តិ" },
  { value: "best friend", en: "Best friend", km: "មិត្តជិតស្និទ្ធ" },
  { value: "coworker", en: "Coworker", km: "មិត្តរួមការងារ" },
  { value: "boss", en: "Boss / manager", km: "ប្រធាន / អ្នកគ្រប់គ្រង" },
  { value: "romantic partner", en: "Couple / partner", km: "គូស្នេហ៍" },
  { value: "wife", en: "Wife", km: "ភរិយា" },
  { value: "husband", en: "Husband", km: "ស្វាមី" },
  { value: "parent", en: "Parent", km: "ឪពុក / ម្តាយ" },
  { value: "sibling", en: "Sibling", km: "បងប្អូន" },
  { value: "child", en: "Child", km: "កូន" },
  { value: "teacher", en: "Teacher / mentor", km: "គ្រូ / អ្នកណែនាំ" },
];
const tones = [
  { value: "warm", en: "Warm and heartfelt", km: "កក់ក្តៅ និងស្មោះត្រង់" },
  { value: "funny", en: "Funny and playful", km: "កំប្លែង និងរីករាយ" },
  { value: "romantic", en: "Romantic", km: "រ៉ូមែនទិក" },
  { value: "professional", en: "Professional and respectful", km: "វិជ្ជាជីវៈ និងគោរព" },
  { value: "inspiring", en: "Inspiring", km: "លើកទឹកចិត្ត" },
  { value: "short and sweet", en: "Short and sweet", km: "ខ្លី និងផ្អែមល្ហែម" },
  { value: "poetic", en: "Poetic", km: "បែបកំណាព្យ" },
];
const { result, loading, error, canGenerate, generate, getApplicableWish } = useBirthdayWishGenerator({
  input: () => ({
    recipientName: props.recipientName.trim(),
    relationship: relationship.value === "custom" ? customRelationship.value.trim() : relationship.value,
    tone: tone.value === "custom" ? customTone.value.trim() : tone.value,
    language: language.value,
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
          <option v-for="item in relationships" :key="item.value" :value="item.value">{{ isKhmer ? item.km : item.en }}</option>
          <option value="custom">{{ copy.other }}</option>
        </ModernSelect>
      </label>
      <label class="wish-label">
        <span>{{ copy.tone }}</span>
        <ModernSelect v-model="tone" :search-placeholder="copy.search">
          <option v-for="item in tones" :key="item.value" :value="item.value">{{ isKhmer ? item.km : item.en }}</option>
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
          <option value="en">English</option>
        </ModernSelect>
      </label>
    </div>
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
