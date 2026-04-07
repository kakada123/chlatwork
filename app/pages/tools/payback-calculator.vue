<template>
  <div class="mx-auto max-w-5xl">
    <PaybackCalculatorHeader
      :share-copied="shareCopied"
      @reset="reset"
      @share="shareLink"
    />

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <PaybackCalculatorInputCard
        v-model:currency="currency"
        v-model:rows="rows"
        v-model:raw="raw"
        :copied="copied"
        :can-copy="settlements.length > 0"
        :error="error"
        @copy-result="copyResult"
        @load-example="loadExample"
        @sync-rows-from-raw="syncRowsFromRaw"
      />

      <PaybackCalculatorSummaryCard
        v-model:khr-remainder-mode="khrRemainderMode"
        v-model:khr-remainder-payer="khrRemainderPayer"
        :currency="currency"
        :people="people"
        :total="total"
        :avg="avg"
        :settlements="settlements"
        :khr-remainder="khrRemainder"
        :unique-names="uniqueNames"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  PaybackCurrency,
  PaybackKhrRemainderMode,
} from "~/lib/payback-calculator";
import {
  buildPaybackKhrRemainderMeta,
  buildPaybackPeople,
  buildPaybackRawFromRows,
  buildPaybackRowsFromRaw,
  buildPaybackSharePayload,
  computePaybackSettlements,
  createEmptyPaybackKhrRemainder,
  createEmptyPaybackRow,
  createPaybackRows,
  formatPaybackAmount,
  formatPaybackExactKhr,
  getPaybackExampleRaw,
  groupPaybackEntries,
  hasPaybackInput,
  parsePaybackRows,
  parsePaybackSharePayload,
  roundPayback,
} from "~/lib/payback-calculator";

const route = useRoute();
const router = useRouter();

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

const copied = ref(false);
const shareCopied = ref(false);

let copiedTimer: ReturnType<typeof setTimeout> | null = null;
let shareTimer: ReturnType<typeof setTimeout> | null = null;

const currency = ref<PaybackCurrency>("USD");
const khrRemainderMode = ref<PaybackKhrRemainderMode>("LEFTOVER_ONLY");
const khrRemainderPayer = ref("");
const raw = ref("");
const rows = ref(createPaybackRows());
const syncError = ref("");

function flashCopied(ms = 1500) {
  copied.value = true;
  if (copiedTimer) {
    clearTimeout(copiedTimer);
  }

  copiedTimer = setTimeout(() => {
    copied.value = false;
    copiedTimer = null;
  }, ms);
}

function flashShareCopied(ms = 1500) {
  shareCopied.value = true;
  if (shareTimer) {
    clearTimeout(shareTimer);
  }

  shareTimer = setTimeout(() => {
    shareCopied.value = false;
    shareTimer = null;
  }, ms);
}

function fmt(value: number) {
  return formatPaybackAmount(value, currency.value);
}

function syncRowsFromRaw() {
  syncError.value = "";

  if (!raw.value.trim()) {
    rows.value = [createEmptyPaybackRow()];
    return;
  }

  try {
    rows.value = buildPaybackRowsFromRaw(raw.value);
  } catch (error: any) {
    syncError.value = error?.message || "Invalid paste input";
  }
}

const parsedRowsState = computed(() => {
  try {
    return {
      entries: parsePaybackRows(rows.value),
      error: "",
    };
  } catch (error: any) {
    return {
      entries: [],
      error: hasPaybackInput(rows.value) ? error?.message || "Invalid input" : "",
    };
  }
});

const groupedEntries = computed(() =>
  groupPaybackEntries(parsedRowsState.value.entries),
);

const uniqueNames = computed(() =>
  groupedEntries.value.map((entry) => entry.name),
);

watch(
  uniqueNames,
  (names) => {
    if (!names.length) {
      khrRemainderPayer.value = "";
      return;
    }

    if (!names.includes(khrRemainderPayer.value)) {
      khrRemainderPayer.value = names[0];
    }
  },
  { immediate: true },
);

const people = computed(() =>
  buildPaybackPeople(
    groupedEntries.value,
    currency.value,
    khrRemainderMode.value,
    khrRemainderPayer.value,
  ),
);

const total = computed(() =>
  roundPayback(people.value.reduce((sum, person) => sum + person.paid, 0)),
);

const avg = computed(() =>
  people.value.length ? roundPayback(total.value / people.value.length) : 0,
);

const settlements = computed(() => computePaybackSettlements(people.value));

const khrRemainder = computed(() => {
  if (currency.value !== "KHR") {
    return createEmptyPaybackKhrRemainder();
  }

  return buildPaybackKhrRemainderMeta(
    groupedEntries.value,
    khrRemainderMode.value,
    khrRemainderPayer.value,
  );
});

const error = computed(() => syncError.value || parsedRowsState.value.error);

let syncing = false;

watch(
  rows,
  () => {
    if (syncing) {
      return;
    }

    syncing = true;
    syncError.value = "";
    raw.value = buildPaybackRawFromRows(rows.value);
    syncing = false;
  },
  { deep: true },
);

watch(
  raw,
  () => {
    if (syncing) {
      return;
    }

    syncing = true;
    syncRowsFromRaw();
    syncing = false;
  },
  { immediate: true },
);

function loadExample() {
  raw.value = getPaybackExampleRaw(currency.value);
}

function reset() {
  raw.value = "";
  syncError.value = "";
  rows.value = createPaybackRows();
  khrRemainderMode.value = "LEFTOVER_ONLY";
  khrRemainderPayer.value = "";
}

async function copyResult() {
  if (settlements.value.length === 0) {
    return;
  }

  const lines: string[] = [
    "PayBack Calculator",
    `People: ${people.value.length}`,
    `Total: ${fmt(total.value)}`,
    `Average: ${fmt(avg.value)}`,
  ];

  if (currency.value === "KHR" && khrRemainder.value.leftover > 0) {
    lines.push(`KHR leftover: ${formatPaybackExactKhr(khrRemainder.value.leftover)}`);

    if (
      khrRemainderMode.value === "ASSIGN_TO_PERSON" &&
      khrRemainder.value.assignedTo
    ) {
      lines.push(`Covered by: ${khrRemainder.value.assignedTo}`);
    } else {
      lines.push("Leftover handling: kept separate");
    }
  }

  lines.push("", "Who pays who:");

  for (const settlement of settlements.value) {
    lines.push(`- ${settlement.from} -> ${settlement.to}: ${fmt(settlement.amount)}`);
  }

  await navigator.clipboard.writeText(lines.join("\n"));
  flashCopied();
}

async function shareLink() {
  const s = buildPaybackSharePayload({
    c: currency.value,
    t: raw.value,
    krm: khrRemainderMode.value,
    krp: khrRemainderPayer.value,
  });

  await router.replace({ query: { s } });

  const url = `${window.location.origin}${route.path}?s=${encodeURIComponent(s)}`;
  await navigator.clipboard.writeText(url);
  flashShareCopied();
}

onMounted(() => {
  const s = route.query.s;

  if (typeof s !== "string" || !s.trim()) {
    return;
  }

  try {
    const payload = parsePaybackSharePayload(s.trim());

    if (payload.c) {
      currency.value = payload.c;
    }

    if (payload.t !== undefined) {
      raw.value = payload.t;
    }

    if (payload.krm) {
      khrRemainderMode.value = payload.krm;
    }

    if (payload.krp) {
      khrRemainderPayer.value = payload.krp;
    }
  } catch {
    // ignore invalid payload
  }
});

onBeforeUnmount(() => {
  if (copiedTimer) {
    clearTimeout(copiedTimer);
  }

  if (shareTimer) {
    clearTimeout(shareTimer);
  }
});
</script>
