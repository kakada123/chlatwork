import { computed, onScopeDispose, ref, watch } from "vue";

export interface BirthdayWishRequest {
  recipientName: string;
  relationship: string;
  tone: string;
  language: "en" | "km";
  includeEmojis?: boolean;
  context?: string;
}
export interface BirthdayWishResult {
  title: string;
  message: string;
  secretMessage: string;
}
type WishError = "" | "auth" | "rate-limit" | "unavailable";

function validText(value: unknown, maximum: number) {
  return typeof value === "string" && Boolean(value.trim()) && Array.from(value).length <= maximum;
}

function readWish(value: unknown): BirthdayWishResult {
  const result = value as BirthdayWishResult | null;
  if (!result || !validText(result.title, 120) || !validText(result.message, 3000) || !validText(result.secretMessage, 1500)) {
    throw new Error("Invalid birthday wish");
  }
  return { title: result.title.trim(), message: result.message.trim(), secretMessage: result.secretMessage.trim() };
}

export function useBirthdayWishGenerator(options: {
  input: () => BirthdayWishRequest;
  session: () => string | null;
  request?: (body: BirthdayWishRequest, signal: AbortSignal) => Promise<unknown>;
}) {
  const result = ref<BirthdayWishResult | null>(null);
  const loading = ref(false);
  const error = ref<WishError>("");
  const key = computed(() => JSON.stringify([options.session(), options.input()]));
  const canGenerate = computed(() => {
    const input = options.input();
    return Boolean(options.session()) && validText(input.recipientName, 80) &&
      validText(input.relationship, 120) && validText(input.tone, 120) &&
      (input.language === "en" || input.language === "km") &&
      (input.includeEmojis === undefined || typeof input.includeEmojis === "boolean") &&
      Array.from(input.context ?? "").length <= 1000;
  });
  let requestVersion = 0;
  let resultKey = "";
  let controller: AbortController | null = null;
  let disposed = false;

  function invalidate() {
    requestVersion++;
    controller?.abort();
    controller = null;
    loading.value = false;
    result.value = null;
    resultKey = "";
    error.value = "";
  }
  // Invalidate synchronously, including change-and-revert edits, so old output can never be applied.
  watch(key, invalidate, { flush: "sync" });
  onScopeDispose(() => { disposed = true; invalidate(); });

  async function generate() {
    if (disposed || loading.value || !canGenerate.value) return;
    invalidate();
    const version = requestVersion;
    const snapshotKey = key.value;
    const input = { ...options.input() };
    controller = new AbortController();
    const signal = controller.signal;
    const isCurrent = () => !disposed && version === requestVersion && snapshotKey === key.value;
    loading.value = true;
    try {
      const response = options.request
        ? await options.request(input, signal)
        : await $fetch("/api/moments/birthday-wish", { method: "POST", body: input, signal });
      if (!isCurrent()) return;
      result.value = readWish(response);
      resultKey = snapshotKey;
    } catch (failure) {
      if (!isCurrent()) return;
      const status = (failure as { statusCode?: number; response?: { status?: number } })?.statusCode ??
        (failure as { response?: { status?: number } })?.response?.status;
      error.value = status === 401 || status === 403 ? "auth" : status === 429 ? "rate-limit" : "unavailable";
    } finally {
      if (isCurrent()) { loading.value = false; controller = null; }
    }
  }

  function getApplicableWish() {
    if (disposed || resultKey !== key.value || !result.value) return null;
    return { ...result.value };
  }

  return { result, loading, error, canGenerate, generate, getApplicableWish };
}
