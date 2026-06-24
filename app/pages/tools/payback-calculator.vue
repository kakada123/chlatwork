<template>
  <div class="mx-auto w-full max-w-[1440px]">
    <PaybackCalculatorHeader
      :share-state="shareState"
      :share-url="lastShareUrl"
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
  PaybackSharePayload,
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
  getPaybackAverage,
  getPaybackExampleRaw,
  getPaybackTotal,
  groupPaybackEntries,
  hasPaybackInput,
  parsePaybackRows,
  parsePaybackSharePayload,
} from "~/lib/payback-calculator";

const route = useRoute();
const router = useRouter();

type PaybackShortLinkResponse = {
  id: string;
  expiresInSeconds: number;
};

type PaybackStoredShareResponse = {
  payload: string;
};

type PaybackShareState =
  | "idle"
  | "busy"
  | "copied"
  | "shared"
  | "ready"
  | "failed";

useSeoMeta({
  title: "Payback Calculator - Split Bills in USD or KHR | ChlatWork",
  description:
    "Split group expenses in USD or KHR, calculate who pays whom, handle Khmer riel rounding, and share the result when needed.",
  ogTitle: "Payback Calculator - Split Bills in USD or KHR | ChlatWork",
  ogDescription:
    "Calculate clear payback transfers for restaurant bills, trips, office spending, and shared purchases.",
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterTitle: "Payback Calculator - Split Bills in USD or KHR | ChlatWork",
  twitterDescription:
    "Split group expenses and calculate who pays whom with USD and KHR support.",
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
const shareState = ref<PaybackShareState>("idle");
const lastShareUrl = ref("");

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

function clearShareTimer() {
  if (shareTimer) {
    clearTimeout(shareTimer);
    shareTimer = null;
  }
}

function setShareState(state: PaybackShareState, ms = 0) {
  clearShareTimer();
  shareState.value = state;

  if (!ms) {
    return;
  }

  shareTimer = setTimeout(() => {
    shareState.value = "idle";
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
      error: hasPaybackInput(rows.value)
        ? error?.message || "Invalid input"
        : "",
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
    const firstName = names[0];

    if (firstName === undefined) {
      khrRemainderPayer.value = "";
      return;
    }

    if (!names.includes(khrRemainderPayer.value)) {
      khrRemainderPayer.value = firstName;
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

const total = computed(() => getPaybackTotal(people.value));
const avg = computed(() => getPaybackAverage(people.value));

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
let routeHydrationReady = false;

function releaseSyncLock() {
  void nextTick(() => {
    syncing = false;
  });
}

function applyRawInput(nextRaw: string) {
  syncing = true;
  syncError.value = "";
  raw.value = nextRaw;

  if (!nextRaw.trim()) {
    rows.value = [createEmptyPaybackRow()];
    releaseSyncLock();
    return;
  }

  try {
    rows.value = buildPaybackRowsFromRaw(nextRaw);
  } catch (error: any) {
    syncError.value = error?.message || "Invalid paste input";
  } finally {
    releaseSyncLock();
  }
}

watch(
  rows,
  () => {
    if (syncing) {
      return;
    }

    syncing = true;
    syncError.value = "";
    raw.value = buildPaybackRawFromRows(rows.value);
    releaseSyncLock();
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
    releaseSyncLock();
  },
  { immediate: true },
);

function loadExample() {
  applyRawInput(getPaybackExampleRaw(currency.value));
}

function loadExampleForCurrency(nextCurrency: PaybackCurrency) {
  currency.value = nextCurrency;
  khrRemainderMode.value = "LEFTOVER_ONLY";
  khrRemainderPayer.value = "";
  applyRawInput(getPaybackExampleRaw(nextCurrency));
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
    lines.push(
      `KHR leftover: ${formatPaybackExactKhr(khrRemainder.value.leftover)}`,
    );

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
    lines.push(
      `- ${settlement.from} -> ${settlement.to}: ${fmt(settlement.amount)}`,
    );
  }

  if (await copyTextToClipboard(lines.join("\n"))) {
    flashCopied();
  }
}

function applyPaybackSharePayload(payload: PaybackSharePayload) {
  if (payload.c) {
    currency.value = payload.c;
  }

  if (payload.t !== undefined) {
    applyRawInput(payload.t);
  }

  if (payload.krm) {
    khrRemainderMode.value = payload.krm;
  }

  if (payload.krp) {
    khrRemainderPayer.value = payload.krp;
  }
}

function isPaybackExampleState() {
  if (currency.value === "KHR" && khrRemainderMode.value !== "LEFTOVER_ONLY") {
    return false;
  }

  return (
    buildPaybackSharePayload({
      c: currency.value,
      t: raw.value,
      krm: khrRemainderMode.value,
      krp: khrRemainderPayer.value,
    }) ===
    buildPaybackSharePayload({
      c: currency.value,
      t: getPaybackExampleRaw(currency.value),
      krm: "LEFTOVER_ONLY",
      krp: "",
    })
  );
}

function buildExampleShareUrl() {
  const query = currency.value === "KHR" ? "?example=1&c=KHR" : "?example=1";

  return `${window.location.origin}${route.path}${query}`;
}

function replaceShareQuery(query: Record<string, string | undefined>) {
  void router.replace({ query }).catch(() => {});
}

function getRouteQueryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

async function hydratePaybackRouteQuery() {
  if (getRouteQueryValue(route.query.example) === "1") {
    loadExampleForCurrency(
      getRouteQueryValue(route.query.c) === "KHR" ? "KHR" : "USD",
    );
    return;
  }

  const id = getRouteQueryValue(route.query.id);

  if (typeof id === "string" && id.trim()) {
    try {
      const response = await $fetch<PaybackStoredShareResponse>(
        `/api/payback-share/${encodeURIComponent(id.trim())}`,
      );

      applyPaybackSharePayload(parsePaybackSharePayload(response.payload));
    } catch {
      // ignore invalid or expired stored links
    }

    return;
  }

  const s =
    getRouteQueryValue(route.query.p) ?? getRouteQueryValue(route.query.s);

  if (typeof s !== "string" || !s.trim()) {
    return;
  }

  try {
    applyPaybackSharePayload(parsePaybackSharePayload(s.trim()));
  } catch {
    // ignore invalid payload
  }
}

function shouldUseNativeShare() {
  if (typeof navigator.share !== "function") {
    return false;
  }

  return (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.("(pointer: coarse)").matches === true
  );
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function copyTextWithSelection(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);

  try {
    textarea.focus({ preventScroll: true });
  } catch {
    textarea.focus();
  }

  textarea.select();
  textarea.setSelectionRange(0, value.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Mobile browsers can reject async clipboard writes after API/link work.
    }
  }

  return copyTextWithSelection(value);
}

async function shareUrlOnDevice(url: string): Promise<PaybackShareState> {
  if (shouldUseNativeShare()) {
    try {
      await navigator.share({
        title: "PayBack Calculator | ChlatWork",
        text: "Open this PayBack Calculator share link.",
        url,
      });
      return "shared";
    } catch (error) {
      if (isAbortError(error)) {
        return "idle";
      }
    }
  }

  return (await copyTextToClipboard(url)) ? "copied" : "ready";
}

function showShareResult(state: PaybackShareState) {
  if (state === "ready") {
    setShareState("ready");
    return;
  }

  setShareState(state, state === "idle" ? 0 : 1500);
}

async function shareLink() {
  if (shareState.value === "busy") {
    return;
  }

  setShareState("busy");
  lastShareUrl.value = "";

  if (isPaybackExampleState()) {
    const query =
      currency.value === "KHR" ? { example: "1", c: "KHR" } : { example: "1" };
    const url = buildExampleShareUrl();

    lastShareUrl.value = url;
    replaceShareQuery(query);
    showShareResult(await shareUrlOnDevice(url));
    return;
  }

  const s = buildPaybackSharePayload({
    c: currency.value,
    t: raw.value,
    krm: khrRemainderMode.value,
    krp: khrRemainderPayer.value,
  });

  try {
    const response = await $fetch<PaybackShortLinkResponse>(
      "/api/payback-share",
      {
        method: "POST",
        body: { payload: s },
      },
    );

    if (response.id) {
      replaceShareQuery({ id: response.id });
      const url = `${window.location.origin}${route.path}?id=${encodeURIComponent(
        response.id,
      )}`;
      lastShareUrl.value = url;
      showShareResult(await shareUrlOnDevice(url));
      return;
    }
  } catch {
    // Short-link storage is required here because long inline fallback URLs were removed.
  }

  setShareState("failed", 2000);
}

watch(
  () => [
    route.query.example,
    route.query.c,
    route.query.id,
    route.query.p,
    route.query.s,
  ],
  () => {
    if (!routeHydrationReady) {
      return;
    }

    void hydratePaybackRouteQuery();
  },
);

onMounted(() => {
  routeHydrationReady = true;
  void hydratePaybackRouteQuery();
});

onBeforeUnmount(() => {
  routeHydrationReady = false;

  if (copiedTimer) {
    clearTimeout(copiedTimer);
  }

  if (shareTimer) {
    clearShareTimer();
  }
});
</script>
