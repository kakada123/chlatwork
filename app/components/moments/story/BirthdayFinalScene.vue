<script setup lang="ts">
withDefaults(defineProps<{ recipient: string; reactions: boolean; reaction: string; shareStatus: string; shareUrl: string; locale?: "en" | "km" }>(), { locale: "en" });
defineEmits<{ react: [value: string]; share: []; celebrate: [] }>();
</script>

<template>
  <div class="final-scene">
    <div class="final-heart" aria-hidden="true">🎉</div>
    <p class="final-greeting">{{ locale === 'km' ? `រីករាយថ្ងៃកំណើត ${recipient}!` : `Happy birthday, ${recipient}!` }}</p>
    <p class="story-description">{{ locale === 'km' ? 'សូមឱ្យឆ្នាំនេះពោរពេញដោយសេចក្ដីស្រឡាញ់ និងអនុស្សាវរីយ៍ល្អៗ។' : 'Here’s to a year full of love and beautiful memories.' }}</p>
    <button type="button" class="story-action" data-action="celebrate" @click="$emit('celebrate')">{{ locale === 'km' ? 'អបអរ 🎉' : 'Celebrate 🎉' }}</button>
    <div v-if="reactions" class="story-reactions" :aria-label="locale === 'km' ? 'ការឆ្លើយតបរបស់អ្នក' : 'Your reaction'" role="group">
      <button v-for="item in [{ id: 'heart', emoji: '❤️', en: 'Love it', km: 'ស្រឡាញ់' }, { id: 'smile', emoji: '🥰', en: 'Feeling happy', km: 'រីករាយ' }, { id: 'party', emoji: '🎉', en: 'Celebrate', km: 'អបអរ' }]" :key="item.id" type="button" class="story-action" :data-action="`reaction-${item.id}`" :aria-label="locale === 'km' ? item.km : item.en" :aria-pressed="reaction === item.id" @click="$emit('react', item.id)">{{ item.emoji }}</button>
    </div>
    <p v-if="reactions" class="reaction-note" role="status">{{ locale === 'km' ? 'ការឆ្លើយតបនេះបង្ហាញតែលើឧបករណ៍នេះ ហើយមិនផ្ញើទៅម្ចាស់ទេ។' : 'Your reaction stays only on this device for this visit; it isn’t sent to the creator.' }}</p>
    <button type="button" class="story-action" data-action="share" @click="$emit('share')">{{ locale === 'km' ? 'ចែករំលែកថ្ងៃកំណើតនេះ' : 'Share this birthday' }}</button>
    <p v-if="shareStatus" class="share-status" role="status">{{ shareStatus }}</p>
    <label v-if="shareUrl" class="share-fallback">{{ locale === 'km' ? 'ចម្លងតំណនេះ' : 'Copy this link' }}<input type="text" :value="shareUrl" readonly @focus="($event.target as HTMLInputElement).select()" /></label>
  </div>
</template>

<style scoped>
.final-heart { margin: 1rem 0; font-size: 4rem; }.final-greeting { margin-bottom: .8rem; font-size: 1.3rem; font-weight: 700; overflow-wrap: anywhere; }.final-scene > .story-action { margin-top: 1rem; }.story-reactions { display: flex; justify-content: center; gap: .65rem; margin-top: 1.5rem; }.story-reactions .story-action { min-width: 3.2rem; font-size: 1.5rem; }.story-reactions [aria-pressed="true"] { outline: 2px solid var(--moment-accent); outline-offset: 3px; }.reaction-note, .share-status { max-width: 28rem; margin: 1rem auto; color: var(--moment-muted); font-size: .8rem; line-height: 1.7; }.share-fallback { display: block; margin-top: .75rem; font-size: .8rem; }.share-fallback input { display: block; width: 100%; min-height: 2.75rem; margin-top: .5rem; padding: .5rem; border: 1px solid var(--moment-border); border-radius: .5rem; color: var(--moment-ink); background: var(--moment-surface); }
</style>
