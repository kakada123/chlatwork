<template>
  <div class="mx-auto max-w-5xl">
    <!-- ✅ Mobile-friendly header -->
    <div
      class="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
    >
      <div>
        <h1 class="text-xl font-bold leading-tight">PayBack Calculator</h1>
        <p class="mt-2 max-w-xl text-gray-600">
          Paste names + amounts. We’ll calculate who owes who (minimal
          transfers).
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          class="w-full sm:w-auto px-4 py-2 rounded-lg bg-white border hover:bg-gray-100"
          @click="reset"
        >
          Reset
        </button>

        <!-- Share link (ChatGPT-style) -->
        <button
          class="w-full sm:w-auto px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 inline-flex items-center justify-center gap-2"
          @click="shareLink"
          :aria-label="shareCopied ? 'Link copied' : 'Share link'"
        >
          <svg
            v-if="!shareCopied"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="w-4 h-4"
          >
            <path
              fill="currentColor"
              d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a2.5 2.5 0 0 0 0-1.39l7-4.11A2.99 2.99 0 1 0 14 5a2.9 2.9 0 0 0 .05.52l-7 4.11a3 3 0 1 0 0 4.74l7.05 4.11c-.03.17-.05.34-.05.52a3 3 0 1 0 3-2.92Z"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="w-4 h-4"
          >
            <path
              fill="currentColor"
              d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4-9.65 9.65Z"
            />
          </svg>

          <span class="text-sm font-medium">
            {{ shareCopied ? "Link copied" : "Share link" }}
          </span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Input -->
      <div class="bg-white rounded-xl border p-4">
        <div class="flex items-center justify-between mb-2">
          <h2 class="font-semibold">Input</h2>
          <select
            v-model="currency"
            class="text-sm border rounded-lg px-2 py-1"
          >
            <option value="USD">USD</option>
            <option value="KHR">KHR</option>
          </select>
        </div>

        <textarea
          v-model="raw"
          class="w-full h-72 border rounded-xl p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-black/10"
          placeholder="Example:
Mina 5$
Sreynea : 10$
John 4
Minea: 0
Reak: 0
Jompa: 38$"
        />

        <!-- ✅ Mobile-friendly buttons -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          <button
            class="w-full px-4 py-2 rounded-lg bg-gray-900 text-white hover:opacity-90"
            @click="loadExample"
          >
            Load example
          </button>

          <!-- Copy result (ChatGPT-style) -->
          <button
            class="w-full px-4 py-2 rounded-lg bg-white border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            @click="copyResult"
            :disabled="settlements.length === 0"
            :aria-label="copied ? 'Copied' : 'Copy result'"
          >
            <svg
              v-if="!copied"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="w-4 h-4"
            >
              <path
                fill="currentColor"
                d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="w-4 h-4"
            >
              <path
                fill="currentColor"
                d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4-9.65 9.65Z"
              />
            </svg>

            <span class="text-sm font-medium">
              {{ copied ? "Copied" : "Copy result" }}
            </span>
          </button>
        </div>

        <p v-if="error" class="text-sm text-red-600 mt-3">{{ error }}</p>
      </div>

      <!-- Summary -->
      <div class="bg-white rounded-xl border p-4">
        <h2 class="font-semibold mb-3">Summary</h2>

        <div class="grid grid-cols-3 gap-3">
          <div class="rounded-xl bg-gray-50 border p-3">
            <div class="text-xs text-gray-500">People</div>
            <div class="text-lg font-bold">{{ people.length }}</div>
          </div>
          <div class="rounded-xl bg-gray-50 border p-3">
            <div class="text-xs text-gray-500">Total</div>
            <div class="text-lg font-bold">{{ fmt(total) }}</div>
          </div>
          <div class="rounded-xl bg-gray-50 border p-3">
            <div class="text-xs text-gray-500">Average</div>
            <div class="text-lg font-bold">{{ fmt(avg) }}</div>
          </div>
        </div>

        <div class="mt-4">
          <h3 class="font-semibold mb-2">Balances</h3>

          <div class="overflow-auto border rounded-xl">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="text-left p-2">Name</th>
                  <th class="text-right p-2">Paid</th>
                  <th class="text-right p-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in people" :key="p.name" class="border-t">
                  <td class="p-2 font-medium">{{ p.name }}</td>
                  <td class="p-2 text-right">{{ fmt(p.paid) }}</td>
                  <td class="p-2 text-right">
                    <span
                      :class="
                        p.balance >= 0 ? 'text-green-700' : 'text-red-700'
                      "
                      class="font-semibold"
                    >
                      {{ p.balance >= 0 ? "+" : "" }}{{ fmt(p.balance) }}
                    </span>
                  </td>
                </tr>

                <tr v-if="people.length === 0">
                  <td class="p-3 text-gray-500" colspan="3">No data yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-4">
          <h3 class="font-semibold mb-2">Who pays who</h3>

          <div v-if="settlements.length === 0" class="text-sm text-gray-500">
            Add input to see settlements.
          </div>

          <ul v-else class="space-y-2">
            <li
              v-for="(s, i) in settlements"
              :key="i"
              class="flex items-center justify-between gap-3 border rounded-xl p-3 bg-gray-50"
            >
              <div class="text-sm">
                <span class="font-semibold">{{ s.from }}</span>
                <span class="text-gray-500"> → </span>
                <span class="font-semibold">{{ s.to }}</span>
              </div>
              <div class="font-bold">{{ fmt(s.amount) }}</div>
            </li>
          </ul>
        </div>

        <p class="text-xs text-gray-500 mt-4">
          Tip: lines like <span class="font-mono">Name: 10$</span> or
          <span class="font-mono">Name 10</span> both work.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type Person = {
  name: string;
  paid: number;
  balance: number;
};

type Settlement = {
  from: string;
  to: string;
  amount: number;
};

const route = useRoute();
const router = useRouter();

// ✅ SEO Meta (Google + social)
useSeoMeta({
  title: "PayBack Calculator | ChlatWork",
  description:
    "Split group spending and calculate who pays who. Paste names + amounts and get minimal payback transfers instantly.",
  ogTitle: "PayBack Calculator | ChlatWork",
  ogDescription:
    "Split group spending and calculate who pays who. Minimal transfers, instant results.",
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterTitle: "PayBack Calculator | ChlatWork",
  twitterDescription:
    "Split group spending and calculate who pays who. Minimal transfers, instant results.",
});

useHead({
  link: [
    {
      rel: "canonical",
      href: "https://chlatwork.com/tools/payback-calculator",
    },
  ],
});

// ---------- UI state for ChatGPT-style buttons ----------
const copied = ref(false);
const shareCopied = ref(false);

let copiedTimer: ReturnType<typeof setTimeout> | null = null;
let shareTimer: ReturnType<typeof setTimeout> | null = null;

function flashCopied(ms = 1500) {
  copied.value = true;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copied.value = false;
    copiedTimer = null;
  }, ms);
}

function flashShareCopied(ms = 1500) {
  shareCopied.value = true;
  if (shareTimer) clearTimeout(shareTimer);
  shareTimer = setTimeout(() => {
    shareCopied.value = false;
    shareTimer = null;
  }, ms);
}

// ---------- Core ----------
const currency = ref<"USD" | "KHR">("USD");
const raw = ref("");
const error = ref<string>("");

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function fmt(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (currency.value === "KHR") {
    return `${sign}${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}៛`;
  }
  return `${sign}$${abs.toFixed(2)}`;
}

function parseLines(input: string): Array<{ name: string; paid: number }> {
  const lines = input
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const out: Array<{ name: string; paid: number }> = [];

  for (const line of lines) {
    const cleaned = line.replace(/\$/g, "").replace(/៛/g, "");
    const match = cleaned.match(/^(.+?)[\s:=-]+(-?\d+(\.\d+)?)\s*$/);

    if (!match) throw new Error(`Invalid line: "${line}"`);

    const name = match[1].trim();
    const paid = Number(match[2]);

    if (!name) throw new Error(`Missing name in line: "${line}"`);
    if (Number.isNaN(paid))
      throw new Error(`Invalid amount in line: "${line}"`);

    out.push({ name, paid });
  }

  return out;
}

function computeSettlements(people: Person[]): Settlement[] {
  const debtors = people
    .filter((p) => p.balance < 0)
    .map((p) => ({ ...p, balance: round2(Math.abs(p.balance)) }))
    .sort((a, b) => b.balance - a.balance);

  const creditors = people
    .filter((p) => p.balance > 0)
    .map((p) => ({ ...p, balance: round2(p.balance) }))
    .sort((a, b) => b.balance - a.balance);

  const res: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];

    const amount = round2(Math.min(d.balance, c.balance));
    if (amount > 0) {
      res.push({ from: d.name, to: c.name, amount });
      d.balance = round2(d.balance - amount);
      c.balance = round2(c.balance - amount);
    }

    if (d.balance <= 0) i++;
    if (c.balance <= 0) j++;
  }

  return res;
}

const people = computed<Person[]>(() => {
  error.value = "";
  if (!raw.value.trim()) return [];

  try {
    const entries = parseLines(raw.value);

    const map = new Map<string, number>();
    for (const e of entries)
      map.set(e.name, round2((map.get(e.name) || 0) + e.paid));

    const list = [...map.entries()].map(([name, paid]) => ({ name, paid }));

    const total = round2(list.reduce((sum, p) => sum + p.paid, 0));
    const avg = list.length ? round2(total / list.length) : 0;

    return list
      .map((p) => ({
        name: p.name,
        paid: round2(p.paid),
        balance: round2(p.paid - avg),
      }))
      .sort((a, b) => b.paid - a.paid);
  } catch (e: any) {
    error.value = e?.message || "Invalid input";
    return [];
  }
});

const total = computed(() =>
  round2(people.value.reduce((s, p) => s + p.paid, 0)),
);
const avg = computed(() =>
  people.value.length ? round2(total.value / people.value.length) : 0,
);
const settlements = computed(() => computeSettlements(people.value));

function loadExample() {
  raw.value = `Mina 5$
Sreynea : 10$
John: 4$
Minea: 0
Reak: 0
Rotha: 38$`;
}

function reset() {
  raw.value = "";
  error.value = "";
}

function buildSharePayload() {
  const payload = { c: currency.value, t: raw.value };
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return b64;
}

function readSharePayload(b64: string) {
  const padded =
    b64.replaceAll("-", "+").replaceAll("_", "/") +
    "=".repeat((4 - (b64.length % 4)) % 4);

  const json = decodeURIComponent(escape(atob(padded)));
  const payload = JSON.parse(json) as { c?: "USD" | "KHR"; t?: string };
  if (payload.c) currency.value = payload.c;
  if (payload.t) raw.value = payload.t;
}

async function copyResult() {
  if (settlements.value.length === 0) return;

  const lines: string[] = [];
  lines.push(`PayBack Calculator`);
  lines.push(`People: ${people.value.length}`);
  lines.push(`Total: ${fmt(total.value)}`);
  lines.push(`Average: ${fmt(avg.value)}`);
  lines.push("");
  lines.push(`Who pays who:`);
  for (const s of settlements.value) {
    lines.push(`- ${s.from} -> ${s.to}: ${fmt(s.amount)}`);
  }

  await navigator.clipboard.writeText(lines.join("\n"));
  flashCopied();
}

async function shareLink() {
  const s = buildSharePayload();
  await router.replace({ query: { s } });

  const url = `${window.location.origin}${route.path}?s=${encodeURIComponent(s)}`;
  await navigator.clipboard.writeText(url);
  flashShareCopied();
}

onMounted(() => {
  const s = route.query.s;
  if (typeof s === "string" && s.trim()) {
    try {
      readSharePayload(s.trim());
    } catch {
      // ignore invalid payload
    }
  }
});
</script>
