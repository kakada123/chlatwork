<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">
        {{ t("tools.regexTester.regexTester") }}
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        {{ t("tools.regexTester.testJavaScriptRegularExpressionsToggleFlagsAndInspect") }}
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-900">
              {{ t("tools.regexTester.pattern") }}
            </label>
            <input
              v-model="pattern"
              class="mt-2 h-11 w-full rounded-lg border px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
              placeholder="\\b\\w+@\\w+\\.\\w+\\b"
            />
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold text-gray-900">
              {{ t("tools.regexTester.flags") }}
            </p>
            <div class="grid grid-cols-2 gap-2">
              <label
                v-for="flag in flagRows"
                :key="flag.key"
                class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <input v-model="flags[flag.key]" type="checkbox" class="h-4 w-4" />
                <span class="font-mono">{{ flag.key }}</span>
                <span class="text-gray-500">{{ t(`tools.regexTester.flags.${flag.key}`) }}</span>
              </label>
            </div>
          </div>

          <div class="rounded-lg bg-gray-50 p-3 text-sm">
            <p class="font-semibold text-gray-700">
              {{ t("tools.regexTester.expression") }}
            </p>
            <p class="mt-1 break-all font-mono text-gray-600">
              /{{ pattern || "" }}/{{ flagString }}
            </p>
          </div>
          <p v-if="regexError" class="text-sm text-red-600">{{ localizeToolError(regexError, isKhmer) }}</p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-900">
            {{ t("tools.regexTester.testString") }}
          </label>
          <textarea
            v-model="testText"
            class="h-80 w-full resize-y rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            :placeholder="t(&quot;tools.regexTester.pasteTextToTest&quot;)"
          />
        </div>
      </div>
    </section>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-gray-900">
          {{ t("tools.regexTester.matchPreview") }}
        </h2>
        <span
          v-if="matches.length"
          class="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100"
        >
          {{ t(matches.length === 1 ? "tools.regexTester.matchCount.one" : "tools.regexTester.matchCount.other", { count: matches.length }) }}
        </span>
      </div>
      <pre
        class="min-h-32 whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm leading-6 text-slate-700 dark:border-white/10 dark:bg-slate-950/40 dark:text-white/70"
        ><template v-for="(segment, index) in highlightedSegments" :key="index"><mark
          v-if="segment.match"
          class="rounded-md bg-cyan-100 px-1 py-0.5 font-semibold text-cyan-950 ring-1 ring-inset ring-cyan-300/60 dark:bg-cyan-300/20 dark:text-cyan-50 dark:ring-cyan-300/40"
          >{{ segment.text }}</mark
        ><span v-else>{{ segment.text }}</span></template></pre>
      <p v-if="!matches.length" class="mt-3 text-sm text-gray-500">
        {{ t("tools.regexTester.noMatchesFound") }}
      </p>
    </section>

    <section v-if="matches.length" class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-gray-900">
          {{ t("tools.regexTester.matches", { matchesLength: matches.length }) }}
        </h2>
        <CopyButton :text="matchesText" :label="t(&quot;tools.regexTester.copyMatches&quot;)" />
      </div>
      <div class="overflow-auto rounded-lg border">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left">
            <tr>
              <th class="p-2 font-semibold">{{ t("tools.regexTester.index") }}</th>
              <th class="p-2 font-semibold">{{ t("tools.regexTester.match") }}</th>
              <th class="p-2 font-semibold">{{ t("tools.regexTester.groups") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="match in matches" :key="`${match.index}-${match.text}`" class="border-t">
              <td class="p-2 font-mono">{{ match.index }}</td>
              <td class="break-words p-2 font-mono">{{ match.text }}</td>
              <td class="break-words p-2 font-mono text-gray-600">
                {{ match.groups.length ? match.groups.join(", ") : "-" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeToolError } from "~/data/tool-ui-km";
import { useLanguage } from "~/composables/useLanguage";
import CopyButton from "~/components/developer-tools/CopyButton.vue";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();




useSeoMeta({
  title: () => t("tools.regexTester.metaTitle"),
  description: () => t("tools.regexTester.metaDescription"),
  ogTitle: () => t("tools.regexTester.metaOgTitle"),
  ogDescription: () => t("tools.regexTester.metaOgDescription"),
});

type FlagKey = "g" | "i" | "m" | "s" | "u";

const pattern = ref("\\b\\w+@\\w+\\.\\w+\\b");
const testText = ref("Email hello@chlatwork.com or support@example.com for help.");
const flags = reactive<Record<FlagKey, boolean>>({
  g: true,
  i: false,
  m: true,
  s: false,
  u: false,
});

const flagRows: Array<{ key: FlagKey }> = [
  { key: "g" },
  { key: "i" },
  { key: "m" },
  { key: "s" },
  { key: "u" },
];

const flagString = computed(() =>
  flagRows
    .filter((flag) => flags[flag.key])
    .map((flag) => flag.key)
    .join(""),
);

const regexError = computed(() => {
  try {
    buildRegex();
    return "";
  } catch (caught: any) {
    return caught?.message ?? "Invalid regular expression.";
  }
});

const matches = computed(() => {
  if (!pattern.value || regexError.value) {
    return [] as Array<{ index: number; text: string; groups: string[] }>;
  }

  const regex = buildRegex();
  const found: Array<{ index: number; text: string; groups: string[] }> = [];

  if (!flagString.value.includes("g")) {
    const match = regex.exec(testText.value);
    return match
      ? [
          {
            index: match.index,
            text: match[0],
            groups: match.slice(1),
          },
        ]
      : [];
  }

  let match: RegExpExecArray | null;
  while ((match = regex.exec(testText.value))) {
    found.push({
      index: match.index,
      text: match[0],
      groups: match.slice(1),
    });

    if (match[0] === "") {
      regex.lastIndex += 1;
    }
  }

  return found;
});

const highlightedSegments = computed(() => {
  const segments: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;

  for (const match of matches.value) {
    if (!match.text) continue;
    if (match.index > cursor) {
      segments.push({ text: testText.value.slice(cursor, match.index), match: false });
    }
    segments.push({ text: match.text, match: true });
    cursor = match.index + match.text.length;
  }

  if (cursor < testText.value.length) {
    segments.push({ text: testText.value.slice(cursor), match: false });
  }

  return segments.length ? segments : [{ text: testText.value, match: false }];
});

const matchesText = computed(() => matches.value.map((match) => match.text).join("\n"));

function buildRegex() {
  return new RegExp(pattern.value, flagString.value);
}
</script>
