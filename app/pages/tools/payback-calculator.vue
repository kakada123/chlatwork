<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto max-w-5xl px-4 py-10">
      <div class="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold">PayBack Calculator</h1>
          <p class="text-gray-600 mt-1">
            Paste names + amounts. We’ll calculate who owes who (minimal
            transfers).
          </p>
        </div>

        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-lg bg-white border hover:bg-gray-100"
            @click="reset"
          >
            Reset
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90"
            @click="shareLink"
          >
            Share link
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
Dyna 5$
Kakada : 10$
John 4
Minea: 0
Bopha: 0
Koy: 38$"
          />

          <div class="flex gap-2 mt-3">
            <button
              class="px-4 py-2 rounded-lg bg-gray-900 text-white hover:opacity-90"
              @click="loadExample"
            >
              Load example
            </button>
            <button
              class="px-4 py-2 rounded-lg bg-white border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="copyResult"
              :disabled="settlements.length === 0"
            >
              Copy result
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

// ✅ SEO Meta (for Google + social share)
useSeoMeta({
  title: "PayBack Calculator | ChlatWork",
  description:
    "Split group spending and calculate who pays who. Paste names + amounts and get minimal payback transfers instantly.",

  ogTitle: "PayBack Calculator | ChlatWork",
  ogDescription:
    "Split group spending and calculate who pays who. Minimal transfers, instant results.",
  ogType: "website",
  // ogImage: "https://chlatwork.com/og.png",

  twitterCard: "summary_large_image",
  twitterTitle: "PayBack Calculator | ChlatWork",
  twitterDescription:
    "Split group spending and calculate who pays who. Minimal transfers, instant results.",
  // twitterImage: "https://chlatwork.com/og.png",
});

useHead({
  link: [
    {
      rel: "canonical",
      href: "https://chlatwork.com/tools/payback-calculator",
    },
  ],
});

const currency = ref<"USD" | "KHR">("USD");
const raw = ref("");
const error = ref<string>("");

// ---------- Helpers ----------
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function fmt(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (currency.value === "KHR") {
    // no decimals for riel typically
    return `${sign}${abs.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}៛`;
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
    // Accept: "Name 10", "Name: 10$", "Name = 10", "Name - 10"
    const cleaned = line.replace(/\$/g, "").replace(/៛/g, "");
    const match = cleaned.match(/^(.+?)[\s:=-]+(-?\d+(\.\d+)?)\s*$/);

    if (!match) {
      throw new Error(`Invalid line: "${line}"`);
    }

    const name = match[1].trim();
    const paid = Number(match[2]);

    if (!name) throw new Error(`Missing name in line: "${line}"`);
    if (Number.isNaN(paid))
      throw new Error(`Invalid amount in line: "${line}"`);

    out.push({ name, paid });
  }

  return out;
}

/**
 * Minimal settlement algorithm:
 * - compute balance = paid - avg
 * - debtors: negative balance (owe)
 * - creditors: positive balance (receive)
 * - greedy match until both lists settled
 */
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

// ---------- Computed ----------
const people = computed<Person[]>(() => {
  error.value = "";

  if (!raw.value.trim()) return [];

  try {
    const entries = parseLines(raw.value);

    // Merge duplicates by name (if user repeats same person)
    const map = new Map<string, number>();
    for (const e of entries) {
      map.set(e.name, round2((map.get(e.name) || 0) + e.paid));
    }

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

// ---------- Actions ----------
function loadExample() {
  raw.value = `Dyna 5$
Kakada : 10$
John: 4$
Minea: 0
Reak: 0
Daya: 38$`;
}

function reset() {
  raw.value = "";
  error.value = "";
}

function buildSharePayload() {
  // keep it simple: json -> base64url
  const payload = {
    c: currency.value,
    t: raw.value,
  };
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return b64;
}

function readSharePayload(b64: string) {
  // base64url -> json
  const padded =
    b64.replaceAll("-", "+").replaceAll("_", "/") +
    "=".repeat((4 - (b64.length % 4)) % 4);

  const json = decodeURIComponent(escape(atob(padded)));
  const payload = JSON.parse(json) as { c?: "USD" | "KHR"; t?: string };
  if (payload.c) currency.value = payload.c;
  if (payload.t) raw.value = payload.t;
}

async function shareLink() {
  const s = buildSharePayload();
  await router.replace({ query: { s } });

  const url = `${window.location.origin}${route.path}?s=${encodeURIComponent(s)}`;
  await navigator.clipboard.writeText(url);
  alert("✅ Share link copied!");
}

async function copyResult() {
  if (settlements.value.length === 0) return;

  const lines: string[] = [];
  lines.push(`PayBack Calculator`);
  lines.push(`People: ${people.value.length}`);
  lines.push(`Total: ${fmt(total.value)}`);
  lines.push(`Average: ${fmt(avg.value)}`);
  lines.push(``);
  lines.push(`Who pays who:`);
  for (const s of settlements.value) {
    lines.push(`- ${s.from} -> ${s.to}: ${fmt(s.amount)}`);
  }

  await navigator.clipboard.writeText(lines.join("\n"));
  alert("✅ Result copied!");
}

// ---------- Load from share link ----------
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
