<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import BirthdayMusicPlayer from "~/components/moments/BirthdayMusicPlayer.vue";
import BirthdayCelebration from "~/components/moments/BirthdayCelebration.vue";
import BirthdayGiftScene from "~/components/moments/story/BirthdayGiftScene.vue";
import BirthdayCakeScene from "~/components/moments/story/BirthdayCakeScene.vue";
import BirthdayMemoriesScene from "~/components/moments/story/BirthdayMemoriesScene.vue";
import BirthdayLetterScene from "~/components/moments/story/BirthdayLetterScene.vue";
import BirthdayScratchScene from "~/components/moments/story/BirthdayScratchScene.vue";
import BirthdayFinalScene from "~/components/moments/story/BirthdayFinalScene.vue";
import { birthdayStoryThemeStyle, getBirthdayStoryScenes, type BirthdayStorySettings } from "~/lib/birthday-story";
import { readBirthdayAudioClip } from "~/lib/birthday-audio";
import { readMomentBlockText } from "~/lib/moments";
import { MOMENT_COPY } from "~/data/moment-locales";
import type { MomentBlock, ReadyMoment } from "~/types/moment";



const props = withDefaults(defineProps<{
  moment: ReadyMoment;
  settings: BirthdayStorySettings;
  preview?: boolean;
  locale?: "en" | "km";
  externalMusic?: boolean;
}>(), { preview: false, locale: "en", externalMusic: false });
const { t } = useAppI18n(computed(() => props.locale === "km"));
const hero = computed(() => props.moment.blocks.find((block: MomentBlock) => block.type === "HERO"));
const title = computed(() => readMomentBlockText(hero.value, "title") || props.moment.title);
const message = computed(() => readMomentBlockText(props.moment.blocks.find((block: MomentBlock) => block.type === "MESSAGE"), "message"));
const secret = computed(() => readMomentBlockText(props.moment.blocks.find((block: MomentBlock) => block.type === "SECRET"), "message"));
const audio = computed(() => readBirthdayAudioClip(hero.value?.data.birthdayAudio));
const photos = computed(() => [...props.moment.media].sort((left, right) => left.position - right.position));
const scenes = computed(() => getBirthdayStoryScenes(props.settings, { photoCount: photos.value.length, hasSecret: Boolean(secret.value.trim()) }));
const index = ref(0);
const scene = computed(() => scenes.value[index.value] ?? scenes.value[0]!);
const giftOpened = ref(false);
const extinguished = ref<number[]>([]);
const photoIndex = ref(0);
const failedPhotos = ref<string[]>([]);
const letterOpened = ref(false);
const secretRevealed = ref(false);
const reaction = ref("");
const shareStatus = ref("");
const shareUrl = ref("");
const sharing = ref(false);
const replayKey = ref(0);
const heading = ref<HTMLElement | null>(null);
const musicPlayer = ref<{ requestPlay: () => void } | null>(null);
const celebration = ref<{ celebrate: () => void } | null>(null);
let giftTransition: ReturnType<typeof setTimeout> | undefined;
function cancelGiftTransition() { clearTimeout(giftTransition); giftTransition = undefined; }
const canContinue = computed(() => {
  if (scene.value === "gift") return giftOpened.value;
  if (scene.value === "cake") return extinguished.value.length >= props.settings.cake.candles;
  return true;
});
const sceneNames = computed(() => ({
  gift: t("products.moments.birthday_story_experience.gift"), cake: t("products.moments.birthday_story_experience.cake"), memories: t("products.moments.birthday_story_experience.memories"),
  message: t("products.moments.birthday_story_experience.message"), secret: t("products.moments.birthday_story_experience.secret"), celebration: t("products.moments.birthday_story_experience.celebration"),
}));

function openGift() {
  if (giftOpened.value) return;
  // Keep the play request inside the tap, while the browser's audio permission is active.
  musicPlayer.value?.requestPlay();
  giftOpened.value = true;
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // Let the ribbon finish, then continue without requiring a second tap.
  giftTransition = setTimeout(() => {
    giftTransition = undefined;
    if (scene.value === "gift") move(1);
  }, reduced ? 0 : 700);
}
function blowCandle(candle: number) {
  musicPlayer.value?.requestPlay();
  if (candle < 0 || candle >= props.settings.cake.candles || extinguished.value.includes(candle)) return;
  extinguished.value = [...extinguished.value, candle];
  if (extinguished.value.length === props.settings.cake.candles) celebration.value?.celebrate();
}
function move(direction: number) {
  if (direction > 0 && !canContinue.value) return;
  cancelGiftTransition();
  index.value = Math.max(0, Math.min(scenes.value.length - 1, index.value + direction));
}
function replay() {
  cancelGiftTransition();
  giftOpened.value = false;
  extinguished.value = [];
  photoIndex.value = 0;
  failedPhotos.value = [];
  letterOpened.value = false;
  secretRevealed.value = false;
  reaction.value = "";
  shareStatus.value = "";
  shareUrl.value = "";
  index.value = 0;
  replayKey.value++;
  void nextTick(() => heading.value?.focus());
}
function changePhoto(value: number) { photoIndex.value = Math.max(0, Math.min(photos.value.length - 1, value)); }
function photoFailed(id: string) { if (!failedPhotos.value.includes(id)) failedPhotos.value = [...failedPhotos.value, id]; }
async function share() {
  if (sharing.value) return;
  sharing.value = true;
  shareStatus.value = "";
  shareUrl.value = "";
  const url = new URL(`/m/${encodeURIComponent(props.moment.slug)}`, window.location.origin).href;
  try {
    if (navigator.share) {
      try {
        await navigator.share({ title: title.value, url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      shareStatus.value = t("products.moments.link_copied");
    } catch {
      shareUrl.value = url;
      shareStatus.value = t("products.moments.copy_the_link_below_to_share_this_birthday");
    }
  } finally { sharing.value = false; }
}
watch(scene, async (value) => {
  if (value !== "gift") cancelGiftTransition();
  await nextTick();
  heading.value?.focus();
  if (value === "celebration" && !props.preview) celebration.value?.celebrate();
});
watch(scenes, () => { index.value = Math.min(index.value, scenes.value.length - 1); });
onMounted(() => {
  if (scene.value === "celebration" && !props.preview) celebration.value?.celebrate();
});
onBeforeUnmount(cancelGiftTransition);
</script>

<template>
  <article
    class="birthday-story"
    :class="{ 'is-preview': preview, 'is-khmer': locale === 'km' }"
    :data-theme="settings.theme"
    :style="birthdayStoryThemeStyle(settings.theme)"
    :lang="locale"
  >
    <header class="story-header"><p class="story-recipient">{{ moment.recipientName }}</p><h1>{{ title }}</h1></header>
    <nav class="story-progress" :aria-label="t(&quot;products.moments.story_progress&quot;)">
      <ol>
        <li
          v-for="(item, position) in scenes"
          :key="item"
          :class="{ 'is-current': position === index, 'is-complete': position < index }"
          :aria-current="position === index ? 'step' : undefined"
        >
          <span aria-hidden="true">{{ position + 1 }}</span><span class="sr-only">{{ sceneNames[item] }}</span>
        </li>
      </ol>
      <p>{{ index + 1 }} / {{ scenes.length }}</p>
    </nav>
    <section class="story-card" :data-scene="scene" aria-labelledby="birthday-scene-title">
      <h2 id="birthday-scene-title" ref="heading" tabindex="-1">{{ sceneNames[scene] }}</h2>
      <div :key="`${replayKey}-${scene}`" class="story-scene">
        <BirthdayGiftScene
          v-if="scene === 'gift'" :opened="giftOpened" :teaser="settings.teaser" :locale="locale"
          @open="openGift"
        />
        <BirthdayCakeScene
          v-else-if="scene === 'cake'" :design="settings.cake.design" :candles="settings.cake.candles"
          :extinguished="extinguished" :locale="locale" @blow="blowCandle"
        />
        <BirthdayMemoriesScene
          v-else-if="scene === 'memories'" :photos="photos" :memories="settings.memories"
          :index="photoIndex" :failed="failedPhotos" :locale="locale" @change="changePhoto" @error="photoFailed"
        />
        <BirthdayLetterScene
          v-else-if="scene === 'message'" :opened="letterOpened" :message="message" :locale="locale"
          @open="letterOpened = true"
        />
        <BirthdayScratchScene
          v-else-if="scene === 'secret'" :revealed="secretRevealed" :message="secret" :locale="locale"
          @reveal="secretRevealed = true"
        />
        <BirthdayFinalScene
          v-else-if="scene === 'celebration'" :recipient="moment.recipientName" :reactions="settings.allowReactions"
          :reaction="reaction" :share-status="shareStatus" :share-url="shareUrl" :locale="locale"
          @react="reaction = $event" @share="share" @celebrate="celebration?.celebrate()"
        />
      </div>
      <div class="story-navigation">
        <button type="button" class="story-action" data-action="previous" :disabled="index === 0" @click="move(-1)">
          {{ t("products.common.previous") }}
        </button>
        <button v-if="index < scenes.length - 1" type="button" class="story-action story-next" data-action="next" :disabled="!canContinue" @click="move(1)">
          {{ t("products.common.next_to") }}
        </button>
        <button v-else-if="settings.allowReplay" type="button" class="story-action story-next" data-action="replay" @click="replay">
          {{ t("products.moments.replay") }}
        </button>
      </div>
    </section>
    <BirthdayCelebration
      ref="celebration" :key="replayKey" :preview="preview" :locale="locale"
      :auto-celebrate="false" :show-controls="false"
    />
    <BirthdayMusicPlayer v-if="audio && !externalMusic" ref="musicPlayer" :clip="audio" :locale="locale" :auto-play="!preview" />
    <footer class="story-footer">{{ MOMENT_COPY[locale].experience.footer }}</footer>
  </article>
</template>

<style scoped>
.story-recipient { margin-bottom: .6rem; color: var(--moment-accent); font-size: clamp(1rem, 3vw, 1.35rem); font-weight: 700; overflow-wrap: anywhere; }
.birthday-story { position: relative; isolation: isolate; overflow: hidden; min-height: 100svh; padding: clamp(1.5rem,5vw,3rem) 1rem 2.5rem; color: var(--moment-ink); background: radial-gradient(ellipse at top,var(--moment-accent-soft),transparent 65%),var(--moment-bg); font-family: "Hanuman", ui-sans-serif,system-ui,sans-serif; text-align: center; }.birthday-story.is-preview { min-height: 42rem; border-radius: 1.5rem; }.birthday-story.is-khmer { font-family: "Hanuman", "Kantumruy Pro", "Noto Sans Khmer", sans-serif; }.story-header, .story-progress, .story-card { width: min(100%,38rem); margin-inline: auto; }.story-eyebrow { margin-bottom: .75rem; color: var(--moment-muted); font-size: .8rem; letter-spacing: .08em; }.story-header h1 { font-size: clamp(1.8rem,6vw,2.7rem); line-height: 1.45; overflow-wrap: anywhere; }.story-progress { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-block: 1.5rem; }.story-progress ol { display: flex; gap: .6rem; list-style: none; padding: 0; }.story-progress li { display: grid; place-items: center; width: 1.9rem; height: 1.9rem; border: 1px solid var(--moment-border); border-radius: 50%; color: var(--moment-muted); font-size: .75rem; }.story-progress .is-current { background: var(--moment-accent); border-color: var(--moment-accent); color: var(--moment-bg); }.story-progress .is-complete { background: var(--moment-accent-soft); color: var(--moment-ink); }.story-progress > p { font-size: .8rem; color: var(--moment-muted); }.story-card { position: relative; padding: clamp(1.25rem,4vw,2rem); border: 1px solid var(--moment-border); border-radius: 1.5rem; background: var(--moment-surface); box-shadow: 0 1.2rem 3rem var(--moment-shadow); }.story-card h2 { font-size: clamp(1.3rem,4vw,1.7rem); line-height: 1.5; }.story-card h2:focus { outline: none; }.story-scene { min-height: 19rem; animation: story-arrive .35s ease both; }.story-navigation { display: flex; justify-content: space-between; flex-wrap: wrap; gap: .75rem; padding-top: 1.5rem; margin-top: 1rem; border-top: 1px solid var(--moment-border); }.story-card :deep(.story-action) { display: inline-flex; align-items: center; justify-content: center; min-width: 2.75rem; min-height: 2.75rem; padding: .65rem 1rem; border: 1px solid var(--moment-border); border-radius: .8rem; background: var(--moment-accent-soft); color: var(--moment-ink); font: inherit; font-size: .85rem; font-weight: 650; cursor: pointer; }.story-card :deep(.story-action:focus-visible) { outline: 3px solid var(--moment-accent); outline-offset: 3px; }.story-card :deep(.story-action:disabled) { opacity: .5; cursor: default; }.story-card :deep(.story-description) { max-width: 30rem; margin: 1rem auto; color: var(--moment-muted); line-height: 1.8; overflow-wrap: anywhere; }.story-card .story-next { margin-left: auto; }
@keyframes story-arrive { from { opacity: 0; transform: translateY(.5rem); } to { opacity: 1; transform: translateY(0); } }@media (prefers-reduced-motion: reduce) { .story-scene { animation: none; } }
.story-header h1 { font-family: "Hanuman", Georgia, "Times New Roman", serif; font-weight: 500; letter-spacing: -.035em; }.is-khmer .story-header h1 { font-family: inherit; letter-spacing: 0; }.story-header::after { content: ''; display: block; width: 3rem; height: 2px; margin: 1.2rem auto 0; background: var(--moment-accent); opacity: .6; }.story-footer { margin: 2rem 0 0; color: var(--moment-muted); font-size: .7rem; }
[data-theme="LUXURY_GOLD"] { background: radial-gradient(ellipse at top,#65502860,transparent 60%),#15151b; }[data-theme="LUXURY_GOLD"] .story-card { border-radius: .6rem; border-top: 3px solid var(--moment-accent); box-shadow: 0 1.5rem 4rem #0005; }[data-theme="LUXURY_GOLD"] .story-header h1 { color: #f7e5b9; }
[data-theme="CUTE_PASTEL"] { background: radial-gradient(ellipse at top left,#fbcfe8a0,transparent 55%),radial-gradient(ellipse at bottom right,#a7f3d080,transparent 55%),var(--moment-bg); }[data-theme="CUTE_PASTEL"] .story-card { border-radius: 2rem; box-shadow: .6rem .6rem 0 var(--moment-accent-soft); }[data-theme="CUTE_PASTEL"] .story-progress li { border-radius: .65rem; }
[data-theme="MINIMAL_ELEGANT"] { background: var(--moment-bg); }[data-theme="MINIMAL_ELEGANT"] .story-card { border-radius: .4rem; box-shadow: 0 .4rem 1.2rem var(--moment-shadow); }[data-theme="MINIMAL_ELEGANT"] .story-header h1 { font-family: inherit; font-size: clamp(1.8rem,6vw,2.5rem); font-weight: 500; letter-spacing: -.045em; }[data-theme="MINIMAL_ELEGANT"].is-khmer .story-header h1 { letter-spacing: 0; }[data-theme="MINIMAL_ELEGANT"] .story-header::after { height: 1px; width: 5rem; }
</style>
