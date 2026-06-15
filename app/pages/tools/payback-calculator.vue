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
import type { LocationQueryRaw } from "vue-router";
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

type PaybackShareState = "idle" | "busy" | "copied" | "shared" | "ready";

type PaybackShareTarget = {
  url: string;
  query: LocationQueryRaw;
  payload?: string;
};

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

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getQueryString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return (
      value.find((item): item is string => typeof item === "string") ?? null
    );
  }

  return null;
}

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
  if (!shareTimer) {
    return;
  }

  clearTimeout(shareTimer);
  shareTimer = null;
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

function showShareResult(state: PaybackShareState) {
  if (state === "ready") {
    setShareState("ready");
    return;
  }

  setShareState(state, state === "idle" ? 0 : 1500);
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
  } catch (error: unknown) {
    syncError.value = getErrorMessage(error, "Invalid paste input");
  }
}

const parsedRowsState = computed(() => {
  try {
    return {
      entries: parsePaybackRows(rows.value),
      error: "",
    };
  } catch (error: unknown) {
    return {
      entries: [],
      error: hasPaybackInput(rows.value)
        ? getErrorMessage(error, "Invalid input")
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

function loadExampleForCurrency(nextCurrency: PaybackCurrency) {
  currency.value = nextCurrency;
  khrRemainderMode.value = "LEFTOVER_ONLY";
  khrRemainderPayer.value = "";
  syncError.value = "";
  raw.value = getPaybackExampleRaw(nextCurrency);
}

function replaceShareQuery(query: LocationQueryRaw) {
  void router.replace({ query }).catch(() => undefined);
}

function reset() {
  raw.value = "";
  syncError.value = "";
  rows.value = createPaybackRows();
  khrRemainderMode.value = "LEFTOVER_ONLY";
  khrRemainderPayer.value = "";
  lastShareUrl.value = "";
  setShareState("idle");
  replaceShareQuery({});
}

function copyTextWithSelection(value: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.focus();
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

async function copyText(value: string): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall back for browsers that reject Clipboard API access.
    }
  }

  return copyTextWithSelection(value);
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

  if (await copyText(lines.join("\n"))) {
    flashCopied();
  }
}

function applyPaybackSharePayload(payload: PaybackSharePayload) {
  currency.value = payload.c ?? "USD";
  raw.value = payload.t ?? "";
  khrRemainderMode.value = payload.krm ?? "LEFTOVER_ONLY";
  khrRemainderPayer.value = payload.krp ?? "";
}

function buildUrl(query: Record<string, string>): string {
  const url = new URL(route.path, window.location.origin);

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function buildInlineShareUrl(payload: string): string {
  return buildUrl({ p: payload });
}

function isPaybackExampleState(): boolean {
  if (currency.value === "KHR" && khrRemainderMode.value !== "LEFTOVER_ONLY") {
    return false;
  }

  const currentPayload = buildPaybackSharePayload({
    c: currency.value,
    t: raw.value,
    krm: khrRemainderMode.value,
    krp: khrRemainderPayer.value,
  });

  const examplePayload = buildPaybackSharePayload({
    c: currency.value,
    t: getPaybackExampleRaw(currency.value),
    krm: "LEFTOVER_ONLY",
    krp: "",
  });

  return currentPayload === examplePayload;
}

function buildShareTarget(): PaybackShareTarget {
  if (isPaybackExampleState()) {
    const query: LocationQueryRaw =
      currency.value === "KHR" ? { example: "1", c: "KHR" } : { example: "1" };

    return {
      url: buildUrl(
        currency.value === "KHR"
          ? { example: "1", c: "KHR" }
          : { example: "1" },
      ),
      query,
    };
  }

  const payload = buildPaybackSharePayload({
    c: currency.value,
    t: raw.value,
    krm: khrRemainderMode.value,
    krp: khrRemainderPayer.value,
  });

  return {
    url: buildInlineShareUrl(payload),
    query: { p: payload },
    payload,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function canUseNativeShare(data: ShareData): boolean {
  if (typeof navigator.share !== "function") {
    return false;
  }

  if (typeof navigator.canShare !== "function") {
    return true;
  }

  try {
    return navigator.canShare(data);
  } catch {
    return false;
  }
}

async function shareUrlOnDevice(url: string): Promise<PaybackShareState> {
  const shareData: ShareData = {
    title: "PayBack Calculator | ChlatWork",
    text: "Open this PayBack Calculator share link.",
    url,
  };

  if (canUseNativeShare(shareData)) {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return "idle";
      }

      // Continue to clipboard fallback when native sharing fails.
    }
  }

  return (await copyText(url)) ? "copied" : "ready";
}

async function createShortShareLink(payload: string): Promise<void> {
  try {
    const response = await $fetch<PaybackShortLinkResponse>(
      "/api/payback-share",
      {
        method: "POST",
        body: { payload },
      },
    );

    if (!response.id) {
      return;
    }

    const shortUrl = buildUrl({ id: response.id });
    lastShareUrl.value = shortUrl;
    replaceShareQuery({ id: response.id });
  } catch {
    // The inline share URL remains valid when short-link creation fails.
  }
}

async function shareLink() {
  if (shareState.value === "busy") {
    return;
  }

  setShareState("busy");

  const target = buildShareTarget();
  lastShareUrl.value = target.url;

  // Keep this as the first awaited browser operation. Native share and clipboard
  // require the original button click's transient user activation.
  const result = await shareUrlOnDevice(target.url);

  if (result === "idle") {
    showShareResult("idle");
    return;
  }

  replaceShareQuery(target.query);
  showShareResult(result);

  if (target.payload) {
    await createShortShareLink(target.payload);
  }
}

onMounted(async () => {
  if (getQueryString(route.query.example) === "1") {
    loadExampleForCurrency(
      getQueryString(route.query.c) === "KHR" ? "KHR" : "USD",
    );
    return;
  }

  const id = getQueryString(route.query.id)?.trim();

  if (id) {
    try {
      const response = await $fetch<PaybackStoredShareResponse>(
        `/api/payback-share/${encodeURIComponent(id)}`,
      );

      applyPaybackSharePayload(parsePaybackSharePayload(response.payload));
    } catch {
      // Ignore invalid or expired stored links.
    }

    return;
  }

  const payload =
    getQueryString(route.query.p)?.trim() ||
    getQueryString(route.query.s)?.trim();

  if (!payload) {
    return;
  }

  try {
    applyPaybackSharePayload(parsePaybackSharePayload(payload));
  } catch {
    // Ignore invalid shared payloads.
  }
});

onBeforeUnmount(() => {
  if (copiedTimer) {
    clearTimeout(copiedTimer);
    copiedTimer = null;
  }

  clearShareTimer();
});
</script>
