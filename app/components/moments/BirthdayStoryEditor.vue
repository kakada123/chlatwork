<script setup lang="ts">
import { computed } from "vue";
import { BIRTHDAY_SCENE_IDS, BIRTHDAY_STORY_THEMES } from "~/lib/birthday-story";
import type { BirthdayCakeDesign, BirthdaySceneId, BirthdayStorySettings } from "~/lib/birthday-story";
import { moveBirthdayScene, toggleBirthdayScene } from "~/lib/birthday-story-editor";

const props = withDefaults(defineProps<{ modelValue: BirthdayStorySettings; locale?: "en" | "km"; section?: "mode" | "theme" | "scenes" | "cake" | "settings" }>(), { locale: "en", section: "settings" });
const emit = defineEmits<{ "update:modelValue": [value: BirthdayStorySettings] }>();
const km = computed(() => props.locale === "km");
const text = (en: string, kh: string) => km.value ? kh : en;
const orderedScenes = computed(() => [...props.modelValue.scenes, ...BIRTHDAY_SCENE_IDS.filter(scene => !props.modelValue.scenes.includes(scene))]);
const sceneNames: Record<BirthdaySceneId, [string, string]> = {
  gift: ["Gift opening", "បើកអំណោយ"], cake: ["Birthday cake", "នំខួបកំណើត"], memories: ["Photo memories", "រូបភាពអនុស្សាវរីយ៍"],
  message: ["Personal message", "សារផ្ទាល់ខ្លួន"], secret: ["Secret surprise", "ការភ្ញាក់ផ្អើលសម្ងាត់"], celebration: ["Final celebration", "ការអបអរចុងក្រោយ"],
};
const cakeDesigns: { value: BirthdayCakeDesign; label: string; km: string }[] = [
  { value: "CLASSIC", label: "Classic", km: "បែបបុរាណ" }, { value: "CHOCOLATE", label: "Chocolate", km: "សូកូឡា" }, { value: "PASTEL", label: "Pastel", km: "ពណ៌ផាស្ទែល" },
];
function update(patch: Partial<BirthdayStorySettings>) { emit("update:modelValue", { ...props.modelValue, ...patch }); }
function move(scene: BirthdaySceneId, direction: -1 | 1) { update({ scenes: moveBirthdayScene(props.modelValue.scenes, scene, direction) }); }
function canMove(scene: BirthdaySceneId, direction: -1 | 1) { return moveBirthdayScene(props.modelValue.scenes, scene, direction).join() !== props.modelValue.scenes.join(); }
function setCandles(event: Event) {
  const count = Number((event.target as HTMLInputElement).value);
  update({ cake: { ...props.modelValue.cake, candles: Number.isFinite(count) ? Math.max(1, Math.min(12, Math.round(count))) : 1 } });
}
</script>

<template>
  <fieldset v-if="section === 'mode'" class="birthday-editor mode-editor">
    <legend>{{ text('Birthday experience', 'បទពិសោធន៍ថ្ងៃកំណើត') }}</legend>
    <div class="mode-grid">
      <label :class="{ selected: !modelValue.enabled }">
        <input type="radio" name="birthday-mode" :checked="!modelValue.enabled" @change="update({ enabled: false })" />
        <span><strong>{{ text('Simple Mode', 'របៀបសាមញ្ញ') }}</strong><small>{{ text('A beautiful birthday page with photos and your message.', 'ទំព័រថ្ងៃកំណើតជាមួយរូបថត និងសាររបស់អ្នក។') }}</small></span>
      </label>
      <label :class="{ selected: modelValue.enabled }">
        <input type="radio" name="birthday-mode" :checked="modelValue.enabled" @change="update({ enabled: true })" />
        <span><strong>{{ text('Story Mode', 'របៀបរឿងរ៉ាវ') }}</strong><small>{{ text('An interactive gift, cake, memories and surprise.', 'អំណោយ នំ អនុស្សាវរីយ៍ និងការភ្ញាក់ផ្អើលអន្តរកម្ម។') }}</small></span>
      </label>
    </div>
  </fieldset>
  <div v-else-if="modelValue.enabled" class="birthday-editor settings-editor">
    <section v-if="section === 'settings' || section === 'theme'" id="birthday-theme" aria-labelledby="birthday-theme-title">
      <h3 id="birthday-theme-title">{{ text('Birthday theme', 'រចនាប័ទ្មថ្ងៃកំណើត') }}</h3>
      <fieldset>
        <legend class="sr-only">{{ text('Birthday theme', 'រចនាប័ទ្មថ្ងៃកំណើត') }}</legend>
        <div class="theme-grid">
          <label v-for="theme in BIRTHDAY_STORY_THEMES" :key="theme.value" :class="{ selected: modelValue.theme === theme.value }">
            <input :id="`story-theme-${theme.value}`" type="radio" name="birthday-story-theme" :checked="modelValue.theme === theme.value" @change="update({ theme: theme.value })" />
            <span><span class="swatches" aria-hidden="true"><i v-for="color in theme.swatches" :key="color" :style="{ background: color }" /></span><strong>{{ km ? theme.labelKm : theme.label }}</strong></span>
          </label>
        </div>
      </fieldset>
      <label for="birthday-teaser" class="input-label">{{ text('Gift teaser (optional)', 'សារខ្លីលើអំណោយ (ជាជម្រើស)') }}</label>
      <textarea id="birthday-teaser" :value="modelValue.teaser" maxlength="160" rows="2" @input="update({ teaser: ($event.target as HTMLTextAreaElement).value })" />
      <p class="help">{{ modelValue.teaser.length }} / 160</p>
    </section>
    <section v-if="section === 'settings' || section === 'scenes'" id="birthday-scenes" aria-labelledby="birthday-scenes-title">
      <h3 id="birthday-scenes-title">{{ text('Story scenes', 'ឈុតរឿងរ៉ាវ') }}</h3>
      <p class="help">{{ text('Choose at least one scene. The gift opens first and the celebration stays last. Empty photo and secret scenes are skipped.', 'ជ្រើសរើសយ៉ាងហោចណាស់មួយឈុត។ អំណោយនៅដើម ហើយការអបអរនៅចុងក្រោយ។ ឈុតរូបថត ឬសារសម្ងាត់ដែលទទេនឹងត្រូវរំលង។') }}</p>
      <ol class="scene-list">
        <li v-for="scene in orderedScenes" :key="scene">
          <label><input :id="`birthday-scene-${scene}`" type="checkbox" :checked="modelValue.scenes.includes(scene)" :disabled="modelValue.scenes.length === 1 && modelValue.scenes.includes(scene)" @change="update({ scenes: toggleBirthdayScene(modelValue.scenes, scene) })" />{{ text(...sceneNames[scene]) }}</label>
          <span v-if="modelValue.scenes.includes(scene) && scene !== 'gift' && scene !== 'celebration'" class="move-actions">
            <button type="button" :disabled="!canMove(scene, -1)" :aria-label="text(`Move ${sceneNames[scene][0]} earlier`, `ផ្លាស់ទី ${sceneNames[scene][1]} ទៅមុន`)" @click="move(scene, -1)">↑</button>
            <button type="button" :disabled="!canMove(scene, 1)" :aria-label="text(`Move ${sceneNames[scene][0]} later`, `ផ្លាស់ទី ${sceneNames[scene][1]} ទៅក្រោយ`)" @click="move(scene, 1)">↓</button>
          </span>
        </li>
      </ol>
      <label class="option"><input type="checkbox" :checked="modelValue.allowReplay" @change="update({ allowReplay: ($event.target as HTMLInputElement).checked })" />{{ text('Allow replay', 'អនុញ្ញាតឱ្យមើលម្ដងទៀត') }}</label>
      <label class="option"><input type="checkbox" :checked="modelValue.allowReactions" @change="update({ allowReactions: ($event.target as HTMLInputElement).checked })" />{{ text('Show reactions on the recipient’s device', 'បង្ហាញប្រតិកម្មនៅលើឧបករណ៍អ្នកទទួល') }}</label>
      <p class="help">{{ text('Reactions are local feedback and are not sent to you or saved.', 'ប្រតិកម្មបង្ហាញតែក្នុងឧបករណ៍នេះ មិនផ្ញើមកអ្នក ឬរក្សាទុកទេ។') }}</p>
    </section>
    <section v-if="section === 'settings' || section === 'cake'" id="birthday-cake" aria-labelledby="birthday-cake-title">
      <h3 id="birthday-cake-title">{{ text('Birthday cake', 'នំខួបកំណើត') }}</h3>
      <fieldset class="cake-designs">
        <legend>{{ text('Cake design', 'រចនាប័ទ្មនំ') }}</legend>
        <label v-for="design in cakeDesigns" :key="design.value"><input type="radio" name="birthday-cake-design" :checked="modelValue.cake.design === design.value" @change="update({ cake: { ...modelValue.cake, design: design.value } })" />{{ km ? design.km : design.label }}</label>
      </fieldset>
      <label for="birthday-candles" class="input-label">{{ text('Candles (1–12)', 'ទៀន (១–១២)') }}</label>
      <input id="birthday-candles" type="number" min="1" max="12" step="1" :value="modelValue.cake.candles" @input="setCandles" />
      <p class="help">{{ text('The recipient can tap each candle to make a wish.', 'អ្នកទទួលអាចចុចលើទៀននីមួយៗដើម្បីបួងសួង។') }}</p>
    </section>
  </div>
</template>

<style scoped>
.birthday-editor { --birthday-border: #d9dce5; --birthday-selected-bg: #fff0f5; --birthday-selected-ink: #831843; --birthday-selected-border: #e05287; --birthday-muted: #667085; --birthday-field-bg: #fff; color: inherit; min-width: 0; }
.birthday-editor legend, h3, h4 { font-weight: 700; }
.mode-editor { margin-top: 1.75rem; }
.mode-grid, .theme-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; margin-top: .75rem; }
.mode-grid > label, .theme-grid > label { display: flex; align-items: flex-start; gap: .65rem; padding: 1rem; border: 1px solid var(--birthday-border); border-radius: 1rem; cursor: pointer; }
.mode-grid > label.selected, .theme-grid > label.selected { border-color: var(--birthday-selected-border); background: var(--birthday-selected-bg); color: var(--birthday-selected-ink); }
input[type=radio], input[type=checkbox] { accent-color: #be185d; flex-shrink: 0; margin-top: .25rem; }
small { display: block; margin-top: .35rem; font-size: .78rem; line-height: 1.6; color: var(--birthday-muted); }
.settings-editor { display: grid; gap: 2rem; }
section { scroll-margin-top: 2rem; }
h3 { font-size: 1.1rem; margin-bottom: 1rem; }
h4 { margin-top: 1.25rem; }
.input-label { display: block; margin-top: 1.1rem; margin-bottom: .5rem; font-weight: 600; font-size: .88rem; }
textarea, input[type=number] { width: 100%; border: 1px solid var(--birthday-border); border-radius: .8rem; padding: .75rem; background: var(--birthday-field-bg); color: inherit; }
input[type=number] { max-width: 8rem; }
textarea { resize: vertical; }
.swatches { display: flex; gap: .3rem; margin-bottom: .45rem; }
.swatches i { width: 1.25rem; height: 1.25rem; border: 1px solid #8885; border-radius: 50%; }
.help { color: var(--birthday-muted); font-size: .78rem; line-height: 1.7; margin-top: .5rem; }
.scene-list { display: grid; gap: .5rem; margin-top: .75rem; }
.scene-list li { display: flex; justify-content: space-between; align-items: center; min-height: 2.8rem; gap: .5rem; border: 1px solid var(--birthday-border); border-radius: .7rem; padding: .4rem .65rem; }
.scene-list label, .option, .cake-designs label { display: flex; align-items: baseline; gap: .6rem; font-size: .85rem; }
.move-actions { display: flex; gap: .35rem; }
button { border: 1px solid var(--birthday-border); border-radius: .5rem; min-height: 2.25rem; min-width: 2.25rem; font-weight: 700; }
button:disabled { opacity: .35; cursor: not-allowed; }
button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid #be185d; outline-offset: 3px; }
.option { margin-top: 1rem; }
.cake-designs { display: flex; gap: 1rem; flex-wrap: wrap; }
.cake-designs legend { margin-bottom: .75rem; font-size: .88rem; }
:global(html.dark .birthday-editor) { --birthday-border: #4b4450; --birthday-selected-bg: #422434; --birthday-selected-ink: #ffe4ef; --birthday-selected-border: #f08baa; --birthday-muted: #c9becf; --birthday-field-bg: #211e29; }
@media (max-width: 480px) { .mode-grid { grid-template-columns: 1fr; } .theme-grid > label { padding: .7rem; font-size: .8rem; } }
</style>
