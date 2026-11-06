<script setup lang="ts">
import { useLanguage } from "~/composables/useLanguage";
import {
  DEFAULT_KHMER_UNICODE_FIXER_OPTIONS,
  fixKhmerUnicodeText,
} from "~/lib/khmer-unicode-fixer";

const { isKhmer } = useLanguage();

const inputText = ref("");
const copied = ref(false);
const options = reactive({
  ...DEFAULT_KHMER_UNICODE_FIXER_OPTIONS,
});

let copyTimer: ReturnType<typeof setTimeout> | null = null;

const result = computed(() => fixKhmerUnicodeText(inputText.value, options));
const hasInput = computed(() => inputText.value.trim().length > 0);
const cleanedText = computed(() => (hasInput.value ? result.value.text : ""));

useSeoMeta({
  title: "Khmer Unicode Fixer - Clean Khmer Text Online | ChlatWork",
  description:
    "Fix copied Khmer Unicode text by normalizing characters, invisible marks, spacing, and Khmer or Latin digits directly in your browser.",
  ogTitle: "Khmer Unicode Fixer - Clean Khmer Text Online | ChlatWork",
  ogDescription:
    "Clean copied Khmer Unicode text for documents, Telegram posts, forms, and CMS content without uploading it.",
  ogType: "website",
  ogUrl: "https://chlatwork.com/tools/khmer-unicode-fixer",
  twitterCard: "summary_large_image",
  twitterTitle: "Khmer Unicode Fixer - Clean Khmer Text Online | ChlatWork",
  twitterDescription:
    "Normalize Khmer Unicode text, remove hidden characters, and convert digits in your browser.",
});

useHead({
  link: [
    {
      rel: "canonical",
      href: "https://chlatwork.com/tools/khmer-unicode-fixer",
    },
  ],
});

function setCopied() {
  copied.value = true;

  if (copyTimer) {
    clearTimeout(copyTimer);
  }

  copyTimer = setTimeout(() => {
    copied.value = false;
    copyTimer = null;
  }, 1400);
}

async function copyCleanedText() {
  if (!cleanedText.value || !import.meta.client) {
    return;
  }

  try {
    await navigator.clipboard.writeText(cleanedText.value);
    setCopied();
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = cleanedText.value;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    setCopied();
  }
}

function clearText() {
  inputText.value = "";
}

onBeforeUnmount(() => {
  if (copyTimer) {
    clearTimeout(copyTimer);
  }
});
</script>

<template>
  <div class="mx-auto w-full max-w-[1180px] space-y-6 text-slate-950 dark:text-white">
    <header class="space-y-2">
      <h1 class="text-2xl font-black sm:text-3xl">
        {{ isKhmer ? "កែសម្រួលអក្សរខ្មែរ Unicode" : "Khmer Unicode Fixer" }}
      </h1>
      <p class="max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/65">
        {{ isKhmer ? "សម្អាត និងរៀបចំអក្សរខ្មែរ Unicode ដែលបានចម្លងពី PDF, ឯកសារ, គេហទំព័រ ឬ Telegram ឱ្យមានទម្រង់ត្រឹមត្រូវមុនពេលប្រើប្រាស់។" : "Clean Khmer Unicode text copied from PDFs, documents, websites, forms, or Telegram before pasting it into your final workflow." }}
      </p>
    </header>

    <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
        <div class="grid gap-4 lg:grid-cols-2">
          <div>
            <label
              for="khmer-unicode-input"
              class="text-sm font-bold text-slate-950 dark:text-white"
            >
              {{ isKhmer ? "អត្ថបទដើម" : "Original text" }}
            </label>
            <textarea
              id="khmer-unicode-input"
              v-model="inputText"
              class="mt-2 min-h-[320px] w-full resize-y rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-7 text-slate-950 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:focus:border-cyan-300/50 dark:focus:ring-cyan-200/20"
              :placeholder="isKhmer ? 'បិទភ្ជាប់អត្ថបទខ្មែរដែលបានចម្លងនៅទីនេះ...' : 'Paste copied Khmer text here...'"
              spellcheck="false"
            />
          </div>

          <div>
            <div class="flex items-center justify-between gap-3">
              <label
                for="khmer-unicode-output"
                class="text-sm font-bold text-slate-950 dark:text-white"
              >
                {{ isKhmer ? "អត្ថបទដែលបានកែសម្រួលរួច" : "Cleaned text" }}
              </label>
              <button
                type="button"
                class="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.10]"
                :disabled="!cleanedText"
                @click="copyCleanedText"
              >
                {{ copied ? (isKhmer ? "បានចម្លង" : "Copied") : (isKhmer ? "ចម្លង" : "Copy") }}
              </button>
            </div>
            <textarea
              id="khmer-unicode-output"
              :value="cleanedText"
              class="mt-2 min-h-[320px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-7 text-slate-950 outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              :placeholder="isKhmer ? 'អត្ថបទដែលបានកែសម្រួលរួចនឹងបង្ហាញនៅទីនេះ។' : 'Cleaned Khmer text will appear here.'"
              readonly
              spellcheck="false"
            />
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100 dark:disabled:bg-white/20 dark:disabled:text-white/40"
            :disabled="!cleanedText"
            @click="copyCleanedText"
          >
            {{ copied ? (isKhmer ? "បានចម្លង" : "Copied") : (isKhmer ? "ចម្លងអត្ថបទដែលបានកែសម្រួល" : "Copy cleaned text") }}
          </button>
          <button
            type="button"
            class="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.10]"
            @click="clearText"
          >
            {{ isKhmer ? "សម្អាត" : "Clear" }}
          </button>
        </div>
      </div>

      <aside class="space-y-4">
        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <h2 class="text-sm font-black text-slate-950 dark:text-white">
            {{ isKhmer ? "ជម្រើសនៃការសម្អាត" : "Cleanup options" }}
          </h2>

          <div class="mt-4 space-y-4">
            <label class="flex items-start gap-3 text-sm text-slate-600 dark:text-white/65">
              <input
                v-model="options.normalizeUnicode"
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-slate-300 text-sky-700"
              />
              <span>
                <span class="block font-bold text-slate-900 dark:text-white">
                  {{ isKhmer ? "សម្រួលទម្រង់ Unicode" : "Normalize Unicode" }}
                </span>
                {{ isKhmer ? "ប្រើប្រាស់ NFC normalization សម្រាប់អក្សរខ្មែរ។" : "Use NFC normalization for copied Khmer text." }}
              </span>
            </label>

            <label class="flex items-start gap-3 text-sm text-slate-600 dark:text-white/65">
              <input
                v-model="options.normalizeWhitespace"
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-slate-300 text-sky-700"
              />
              <span>
                <span class="block font-bold text-slate-900 dark:text-white">
                  {{ isKhmer ? "សម្រួលចន្លោះឃ្លា (Spacing)" : "Normalize spacing" }}
                </span>
                {{ isKhmer ? "បង្រួមចន្លោះដកឃ្លាដែលស្ទួន ឬវែងពេក។" : "Collapse repeated spaces and long blank gaps." }}
              </span>
            </label>

            <label class="flex items-start gap-3 text-sm text-slate-600 dark:text-white/65">
              <input
                v-model="options.trimLines"
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-slate-300 text-sky-700"
              />
              <span>
                <span class="block font-bold text-slate-900 dark:text-white">
                  {{ isKhmer ? "កាត់ចន្លោះក្បាលនិងកន្ទុយជួរ" : "Trim each line" }}
                </span>
                {{ isKhmer ? "លុបចន្លោះទំនេរនៅដើម និងចុងបន្ទាត់នីមួយៗ។" : "Remove extra spaces at the start and end of lines." }}
              </span>
            </label>

            <label class="flex items-start gap-3 text-sm text-slate-600 dark:text-white/65">
              <input
                v-model="options.removeReplacementCharacters"
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-slate-300 text-sky-700"
              />
              <span>
                <span class="block font-bold text-slate-900 dark:text-white">
                  {{ isKhmer ? "លុបតួអក្សរខូច" : "Remove broken marks" }}
                </span>
                {{ isKhmer ? "លុបតួអក្សរជំនួសដែលបង្ហាញជាសញ្ញា U+FFFD។" : "Remove replacement characters shown as U+FFFD." }}
              </span>
            </label>

            <div>
              <label
                for="khmer-invisible-mode"
                class="text-xs font-bold uppercase text-slate-500 dark:text-white/50"
              >
                {{ isKhmer ? "តួអក្សរមើលមិនឃើញ" : "Invisible characters" }}
              </label>
              <ModernSelect
                id="khmer-invisible-mode"
                v-model="options.invisibleCharacters"
                class="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              >
                <option value="space">
                  {{ isKhmer ? "ជំនួសដោយដកឃ្លា" : "Replace with spaces" }}
                </option>
                <option value="remove">
                  {{ isKhmer ? "លុបចេញ" : "Remove" }}
                </option>
                <option value="keep">
                  {{ isKhmer ? "រក្សាទុក" : "Keep" }}
                </option>
              </ModernSelect>
            </div>

            <div>
              <label
                for="khmer-digit-mode"
                class="text-xs font-bold uppercase text-slate-500 dark:text-white/50"
              >
                {{ isKhmer ? "ប្តូរលេខ" : "Digit conversion" }}
              </label>
              <ModernSelect
                id="khmer-digit-mode"
                v-model="options.digitMode"
                class="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              >
                <option value="none">
                  {{ isKhmer ? "កុំប្តូរលេខ" : "Do not convert digits" }}
                </option>
                <option value="khmer-to-latin">
                  {{ isKhmer ? "លេខខ្មែរ ទៅ ០-៩" : "Khmer digits to 0-9" }}
                </option>
                <option value="latin-to-khmer">
                  {{ isKhmer ? "០-៩ ទៅ លេខខ្មែរ" : "0-9 to Khmer digits" }}
                </option>
              </ModernSelect>
            </div>
          </div>
        </section>

        <section
          v-if="hasInput"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
        >
          <h2 class="text-sm font-black text-slate-950 dark:text-white">
            {{ isKhmer ? "សង្ខេបលទ្ធផល" : "Cleanup summary" }}
          </h2>
          <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-white/65">
            <li v-for="change in result.changes" :key="change" class="flex gap-2">
              <span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <span>{{ change }}</span>
            </li>
          </ul>
          <div
            v-if="result.warnings.length"
            class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100"
          >
            <p class="font-black">{{ isKhmer ? "សូមផ្ទៀងផ្ទាត់មុនពេលបោះពុម្ពផ្សាយ" : "Check before publishing" }}</p>
            <ul class="mt-2 space-y-1">
              <li v-for="warning in result.warnings" :key="warning">
                {{ warning }}
              </li>
            </ul>
          </div>
        </section>
      </aside>
    </section>
  </div>
</template>
