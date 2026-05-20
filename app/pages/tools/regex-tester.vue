<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">Regex Tester</h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        Test JavaScript regular expressions, toggle flags, and inspect matches.
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-900">Pattern</label>
            <input
              v-model="pattern"
              class="mt-2 h-11 w-full rounded-lg border px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
              placeholder="\\b\\w+@\\w+\\.\\w+\\b"
            />
          </div>

          <div>
            <p class="mb-2 text-sm font-semibold text-gray-900">Flags</p>
            <div class="grid grid-cols-2 gap-2">
              <label
                v-for="flag in flagRows"
                :key="flag.key"
                class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <input v-model="flags[flag.key]" type="checkbox" class="h-4 w-4" />
                <span class="font-mono">{{ flag.key }}</span>
                <span class="text-gray-500">{{ flag.label }}</span>
              </label>
            </div>
          </div>

          <div class="rounded-lg bg-gray-50 p-3 text-sm">
            <p class="font-semibold text-gray-700">Expression</p>
            <p class="mt-1 break-all font-mono text-gray-600">
              /{{ pattern || "" }}/{{ flagString }}
            </p>
          </div>
          <p v-if="regexError" class="text-sm text-red-600">{{ regexError }}</p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-900">Test string</label>
          <textarea
            v-model="testText"
            class="h-80 w-full resize-y rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="Paste text to test"
          />
        </div>
      </div>
    </section>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-sm font-semibold text-gray-900">Highlighted matches</h2>
      <pre class="min-h-32 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 font-mono text-sm"
        ><template v-for="(segment, index) in highlightedSegments" :key="index"><mark
          v-if="segment.match"
          class="rounded bg-yellow-200 px-0.5 text-gray-950"
          >{{ segment.text }}</mark
        ><span v-else>{{ segment.text }}</span></template></pre>
      <p v-if="!matches.length" class="mt-3 text-sm text-gray-500">
        No matches found.
      </p>
    </section>

    <section v-if="matches.length" class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-gray-900">
          Matches ({{ matches.length }})
        </h2>
        <CopyButton :text="matchesText" label="Copy matches" />
      </div>
      <div class="overflow-auto rounded-lg border">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left">
            <tr>
              <th class="p-2 font-semibold">Index</th>
              <th class="p-2 font-semibold">Match</th>
              <th class="p-2 font-semibold">Groups</th>
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
import CopyButton from "~/components/developer-tools/CopyButton.vue";

useSeoMeta({
  title: "Regex Tester - ChlatWork",
  description: "Test JavaScript regular expressions with flags, match highlighting, and groups.",
  ogTitle: "Regex Tester - ChlatWork",
  ogDescription: "Browser-based regex tester for JavaScript patterns.",
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

const flagRows: Array<{ key: FlagKey; label: string }> = [
  { key: "g", label: "global" },
  { key: "i", label: "ignore case" },
  { key: "m", label: "multiline" },
  { key: "s", label: "dot all" },
  { key: "u", label: "unicode" },
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
