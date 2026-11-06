<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import {
  saveBotQr,
  removeBotQr,
  type BotUserDetails,
} from "~/services/bot-admin.service";
import { creatorCreditRequestError } from "~/lib/creator-credit-display";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();
const props = defineProps<{ details: BotUserDetails }>();
const emit = defineEmits<{ saved: [] }>();
const file = shallowRef<File | null>(null);
const preview = ref("");
const removing = ref(false);
const saving = ref(false);
const error = ref("");
function reset() {
  if (preview.value) URL.revokeObjectURL(preview.value);
  preview.value = "";
  file.value = null;
  removing.value = false;
  error.value = "";
}
watch(() => props.details.profile.userId, reset);
onBeforeUnmount(reset);
function choose(event: Event) {
  reset();
  const selected = (event.target as HTMLInputElement).files?.[0];
  if (!selected) return;
  if (
    !["image/png", "image/jpeg"].includes(selected.type) ||
    selected.size > 2 * 1024 * 1024
  ) {
    error.value = t("shared.components_admin_bot_user_khqr.choose_a_png_or_jpeg_up_to_2_mb");
    return;
  }
  file.value = selected;
  preview.value = URL.createObjectURL(selected);
}
async function save() {
  if (saving.value || (!file.value && !removing.value)) return;
  saving.value = true;
  try {
    if (removing.value) await removeBotQr(props.details.profile.userId);
    else await saveBotQr(props.details.profile.userId, file.value!);
    reset();
    emit("saved");
  } catch (cause) {
    error.value = creatorCreditRequestError(
      cause,
      t("shared.components_admin_bot_user_khqr.khqr_change_failed_the_existing_image_is_preserved"),
    );
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <div class="space-y-5">
    <p class="text-sm text-slate-500">
      {{ t("shared.components_admin_bot_user_khqr.user_provided_payment_image_bank_ownership_has_not_been") }}
    </p>
    <img
      v-if="preview || details.qrUrl"
      :src="preview || details.qrUrl!"
      :alt="preview ? t(&quot;shared.components_admin_bot_user_khqr.new_khqr_preview&quot;) : t(&quot;shared.components_admin_bot_user_khqr.saved_khqr&quot;)"
      class="max-h-80 max-w-full rounded-xl border border-slate-200 bg-white object-contain p-3 dark:border-white/10"
    />
    <p
      v-else
      class="rounded-xl bg-slate-50 p-6 text-sm text-slate-500 dark:bg-white/5"
    >
      {{ t("shared.components_admin_bot_user_khqr.no_saved_khqr") }}
    </p>
    <fieldset :disabled="saving" class="space-y-4 disabled:opacity-50">
      <label class="block text-sm font-medium"
        >{{ t("shared.components_admin_bot_user_khqr.upload_replace_khqr") }}<input
          type="file"
          accept="image/png,image/jpeg"
          class="mt-2 block w-full text-sm"
          @change="choose"
      /></label>
      <button
        v-if="details.qrUrl && !file"
        type="button"
        class="text-sm font-semibold text-red-600"
        @click="removing = true"
      >
        {{ t("shared.components_admin_bot_user_khqr.remove_saved_khqr") }}
      </button>
      <div
        v-if="file || removing"
        class="space-y-3 rounded-xl bg-violet-50 p-4 text-sm dark:bg-violet-400/10"
      >
        <p>
          {{
            removing
              ? t("shared.components_admin_bot_user_khqr.remove_this_saved_khqr")
              : t("shared.components_admin_bot_user_khqr.save_the_preview_above_as_this_user_s_public")
          }}
        </p>
        <button
          type="button"
          class="rounded-lg bg-violet-600 px-3 py-2 font-semibold text-white"
          @click="save"
        >
          {{ saving ? t("shared.common.saving") : t("shared.common.confirm") }}
        </button>
        <button type="button" class="ml-3 px-3 py-2" @click="reset">
          {{ t("shared.common.cancel") }}
        </button>
      </div>
    </fieldset>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template>
