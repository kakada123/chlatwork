<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { computed, ref } from "vue";
import { Heart, LoaderCircle } from "lucide-vue-next";



const props = withDefaults(defineProps<{ recipientName: string; locale?: "en" | "km"; submitting?: boolean; error?: string; preview?: boolean }>(), { locale: "en", submitting: false, error: "", preview: false });
const { t } = useAppI18n(computed(() => props.locale === "km"));
const emit = defineEmits<{ unlock: [value: { day: number; month: number }] }>();
const birthday = ref("");
const invalid = ref(false);
const copy = computed(() => ({ wait: t("products.moments.birthday_unlock_gate.wait", { recipient_name: props.recipientName }), question: t("products.moments.birthday_unlock_gate.question"), label: t("products.moments.birthday_unlock_gate.label"), button: t("products.moments.birthday_unlock_gate.button"), hint: t("products.moments.birthday_unlock_gate.hint"), invalid: t("products.moments.birthday_unlock_gate.invalid"), loading: t("products.moments.birthday_unlock_gate.loading"), footer: t("products.moments.birthday_unlock_gate.footer") }));

function format(event: Event) {
  const input = event.target as HTMLInputElement;
  const digits = input.value.replace(/[០-៩]/g, digit => String(digit.charCodeAt(0) - 0x17e0)).replace(/\D/g, "").slice(0, 4);
  birthday.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  input.value = birthday.value;
  invalid.value = false;
}
function submit() {
  if (props.submitting) return;
  const match = /^(\d{2})\/(\d{2})$/.exec(birthday.value);
  const day = Number(match?.[1]), month = Number(match?.[2]);
  const date = new Date(Date.UTC(2024, month - 1, day));
  if (!match || day < 1 || month < 1 || month > 12 || date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) { invalid.value = true; return; }
  emit("unlock", { day, month });
}
function submitPreview(event?: KeyboardEvent) {
  // The editor owns the publish form; preview interactions must never submit it.
  if (!props.preview) return;
  event?.preventDefault();
  submit();
}
</script>

<template>
  <main class="birthday-entry" :class="{ 'is-preview': preview }" :lang="locale">
    <section class="birthday-entry-card" aria-labelledby="birthday-entry-title">
      <div class="entry-hearts" aria-hidden="true"><span>♥</span><i><Heart :size="33" fill="currentColor" /></i><span>♥</span></div>
      <h1 id="birthday-entry-title">{{ copy.wait }}</h1>
      <p class="entry-question">{{ copy.question }}</p>
      <component :is="preview ? 'div' : 'form'" class="entry-form" novalidate @submit.stop.prevent="submit">
        <label for="birthday-entry-date" class="sr-only">{{ copy.label }}</label>
        <input id="birthday-entry-date" :value="birthday" inputmode="numeric" autocomplete="off" placeholder="DD/MM" maxlength="5" :disabled="submitting" :aria-invalid="invalid || Boolean(error)" aria-describedby="birthday-entry-hint birthday-entry-error" @input="format" @keydown.enter="submitPreview" />
        <button :type="preview ? 'button' : 'submit'" :disabled="submitting" @click="submitPreview()"><LoaderCircle v-if="submitting" class="entry-loading" :size="19" aria-hidden="true" />{{ submitting ? copy.loading : copy.button }}</button>
      </component>
      <p id="birthday-entry-hint" class="entry-hint">{{ copy.hint }}</p>
      <p id="birthday-entry-error" class="entry-error" role="alert">{{ invalid ? copy.invalid : error }}</p>
    </section>
    <footer>{{ copy.footer }}</footer>
  </main>
</template>

<style scoped>
.birthday-entry { min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3.5rem 1.1rem 1.25rem; background: radial-gradient(ellipse at top left, #fff1f6, transparent 60%), linear-gradient(135deg,#fff8fb,#fffaf2); color: #39282e; font-family: "Hanuman", Georgia, serif; }
.birthday-entry-card { position: relative; width: min(100%, 41rem); padding: clamp(2rem,7vw,4.5rem) clamp(1.3rem,6vw,4rem) 1.5rem; border: 1px solid #ffd0e0; border-radius: 2.3rem; background: #fffdfbec; box-shadow: 0 2rem 5rem #6d38451a; text-align: center; }
.birthday-entry-card::before { content: ''; position: absolute; inset: .7rem; border: 1px dashed #f4c8d9; border-radius: 1.8rem; pointer-events: none; }
.birthday-entry.is-preview { min-height: auto; padding: 1.5rem .8rem; }.is-preview .birthday-entry-card { padding: 2rem 1.2rem 1rem; }
.entry-hearts { display: flex; justify-content: center; align-items: center; gap: 1rem; color: #ff94b5; }
.entry-hearts i { display: grid; place-items: center; width: 4.4rem; height: 4.4rem; border-radius: 50%; background: #fb4781; color: white; box-shadow: 0 1rem 2rem #fb47812b; }.entry-hearts > span { font-size: 1.5rem; }
h1 { margin: 1.7rem 0 1.1rem; font-size: clamp(2rem,7vw,3.7rem); line-height: 1.35; font-weight: 600; font-style: italic; overflow-wrap: anywhere; }
.entry-question { margin: 0 auto 1.7rem; max-width: 25rem; color: #816871; font-size: clamp(1.15rem,4vw,1.8rem); font-weight: 600; line-height: 1.65; }
.entry-form { display: grid; justify-items: center; gap: 1.2rem; }input { width: 10.5rem; min-height: 4.3rem; padding: .8rem; border: 2px solid #f4aec7; border-radius: 1.2rem; background: #fff7fa; color: #4c2335; text-align: center; font: 700 1.5rem "Hanuman", ui-sans-serif, sans-serif; letter-spacing: .12em; }input:focus { outline: 4px solid #fde2eb; border-color: #ed3978; }
button { position: relative; display: flex; align-items: center; justify-content: center; gap: .6rem; width: 100%; min-height: 3.6rem; border-radius: 1.2rem; padding: .8rem; background: linear-gradient(110deg,#ff3e7d,#eb578b); color: white; font-family: "Hanuman", ui-sans-serif, sans-serif; font-size: 1rem; font-weight: 700; box-shadow: 0 .8rem 1.8rem #f6477b26; }button:focus-visible { outline: 3px solid #a91b50; outline-offset: 4px; }button:disabled { opacity: .65; cursor: wait; }
.entry-hint,footer { margin-top: 1rem; font-family: "Hanuman", ui-sans-serif, sans-serif; font-size: .75rem; line-height: 1.8; color: #997c87; }.entry-error { min-height: 1.6rem; margin-top: .5rem; color: #b21e51; font-family: "Hanuman", ui-sans-serif, sans-serif; font-size: .85rem; }
.entry-loading { animation: entry-spin 1s linear infinite; }@keyframes entry-spin { to { transform: rotate(360deg); } }@media(prefers-reduced-motion:reduce) { .entry-loading { animation: none; } }
</style>
