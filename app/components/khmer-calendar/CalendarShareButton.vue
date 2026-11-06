<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { Share2 } from "lucide-vue-next";
import { shareCalendarLink } from "~/lib/calendar-sharing";

const props = defineProps<{ path: string; title: string; khmer: boolean }>();
const { t } = useAppI18n(computed(() => props.khmer));
const { config } = useProductDomain();
const url = computed(() => new URL(props.path, config.mainOrigin).href);
const status = ref("");
const busy = ref(false);
watch(url, () => {
  status.value = "";
});

async function share() {
  if (busy.value) return;
  busy.value = true;
  status.value = "";
  try {
    const result = await shareCalendarLink(
      { title: props.title, url: url.value },
      typeof navigator === "undefined" ? {} : navigator,
    );
    if (result === "copied" || result === "unavailable") status.value = result;
  } finally {
    busy.value = false;
  }
}
function selectLink(event: FocusEvent) {
  (event.target as HTMLInputElement).select();
}
</script>

<template>
  <span class="calendar-share">
    <button
      type="button"
      class="share-button"
      :disabled="busy"
      :aria-label="t(&quot;shared.calendar.share_title&quot;, { title })"
      @click="share"
    >
      <Share2 :size="15" aria-hidden="true" />
      {{ t("shared.calendar.share") }}
    </button>
    <span v-if="status" class="share-feedback" role="status">
      <template v-if="status === 'copied'">{{
        t("shared.calendar.link_copied")
      }}</template>
      <label v-else class="share-fallback">
        {{ t("shared.calendar.copy_this_link") }}
        <input
          type="url"
          :value="url"
          readonly
          :aria-label="t(&quot;shared.calendar.shareable_link&quot;)"
          @focus="selectLink"
        />
      </label>
    </span>
  </span>
</template>

<style scoped>
.calendar-share {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  max-width: 100%;
}
.share-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 6px 12px;
  border: 1px solid var(--line, #e9e6df);
  border-radius: 9px;
  background: var(--paper, #fff);
  color: var(--red, #a9323a);
  font-size: 12px;
  font-weight: 650;
}
.share-button:hover {
  background: color-mix(in srgb, var(--red, #a9323a) 7%, var(--paper, #fff));
}
.share-button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.share-button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--gold, #a47926);
  outline-offset: 3px;
}
.share-feedback {
  color: var(--muted, #6e717b);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.share-fallback {
  display: grid;
  gap: 4px;
}
.share-fallback input {
  width: 100%;
  min-width: 0;
  min-height: 36px;
  border: 1px solid var(--line, #e9e6df);
  border-radius: 7px;
  padding: 6px 9px;
  color: var(--ink, #292b31);
  background: var(--paper, #fff);
  font-size: 12px;
}
</style>
