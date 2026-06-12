<script setup lang="ts">
type PaybackShareState = "idle" | "busy" | "copied" | "shared" | "ready";

const props = defineProps<{
  shareState: PaybackShareState;
  shareUrl: string;
}>();

const emit = defineEmits<{
  (e: "reset"): void;
  (e: "share"): void;
}>();

const shareLabel = computed(() => {
  if (props.shareState === "busy") return "Preparing link";
  if (props.shareState === "copied") return "Link copied";
  if (props.shareState === "shared") return "Link shared";
  if (props.shareState === "ready") return "Link ready";

  return "Share link";
});

const isShareConfirmed = computed(() =>
  ["copied", "shared", "ready"].includes(props.shareState),
);

const isInlineShareUrl = computed(() =>
  props.shareUrl.includes("?p="),
);

function selectShareUrl(event: FocusEvent) {
  const input = event.target as HTMLInputElement | null;
  input?.select();
}
</script>

<template>
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

    <div class="flex flex-col gap-2 sm:items-end">
      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          class="w-full rounded-lg border bg-white px-4 py-2 hover:bg-gray-100 sm:w-auto"
          type="button"
          @click="emit('reset')"
        >
          Reset
        </button>

        <button
          class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
          type="button"
          :aria-busy="shareState === 'busy'"
          :aria-label="shareLabel"
          :disabled="shareState === 'busy'"
          @click="emit('share')"
        >
          <svg
            v-if="!isShareConfirmed"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="h-4 w-4"
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
            class="h-4 w-4"
          >
            <path
              fill="currentColor"
              d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4-9.65 9.65Z"
            />
          </svg>

          <span class="text-sm font-medium">
            {{ shareLabel }}
          </span>
        </button>
      </div>

      <div v-if="shareUrl" class="w-full sm:max-w-xs">
        <label class="sr-only" for="payback-share-url">
          PayBack Calculator share URL
        </label>
        <input
          id="payback-share-url"
          class="h-10 w-full rounded-lg border bg-white px-3 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-black/10"
          readonly
          :value="shareUrl"
          @focus="selectShareUrl"
        />
        <p class="mt-1 text-xs text-gray-500">
          <span v-if="isInlineShareUrl">
            Short links are unavailable here, so this is the full share link.
          </span>
          <span v-else-if="shareState === 'ready'">
            Your browser blocked auto-copy. Tap the field to select the link.
          </span>
          <span v-else>
            The share link stays visible so you can copy it again if needed.
          </span>
        </p>
      </div>
    </div>
  </div>
</template>
