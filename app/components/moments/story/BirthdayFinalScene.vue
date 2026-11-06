<script setup lang="ts">import { computed } from "vue";

import { useAppI18n } from "~/composables/useAppI18n";


const props = withDefaults(defineProps<{ recipient: string; reactions: boolean; reaction: string; shareStatus: string; shareUrl: string; locale?: "en" | "km" }>(), { locale: "en" });
const { t } = useAppI18n(computed(() => props.locale === "km"));
defineEmits<{ react: [value: string]; share: []; celebrate: [] }>();
</script>

<template>
  <div class="final-scene">
    <div class="final-heart" aria-hidden="true">🎉</div>
    <p class="final-greeting">{{ t("products.moments.happy_birthday_recipient", { recipient: recipient }) }}</p>
    <p class="story-description">{{ t("products.moments.heres_to_a_year_full_of_love_and_beautiful_memories") }}</p>
    <button type="button" class="story-action" data-action="celebrate" @click="$emit('celebrate')">{{ t("products.moments.final_scene.celebrate") }}</button>
    <div v-if="reactions" class="story-reactions" :aria-label="t(&quot;products.moments.your_reaction&quot;)" role="group">
      <button v-for="item in [{ id: 'heart', emoji: '❤️', en: 'Love it', km: 'ស្រឡាញ់' }, { id: 'smile', emoji: '🥰', en: 'Feeling happy', km: 'រីករាយ' }, { id: 'party', emoji: '🎉', en: 'Celebrate', km: 'អបអរ' }]" :key="item.id" type="button" class="story-action" :data-action="`reaction-${item.id}`" :aria-label="locale === 'km' ? item.km : item.en" :aria-pressed="reaction === item.id" @click="$emit('react', item.id)">{{ item.emoji }}</button>
    </div>
    <p v-if="reactions" class="reaction-note" role="status">{{ t("products.moments.your_reaction_stays_only_on_this_device_for_this_visit_it_isnt_sent_to_the_creator") }}</p>
    <button type="button" class="story-action" data-action="share" @click="$emit('share')">{{ t("products.moments.share_this_birthday") }}</button>
    <p v-if="shareStatus" class="share-status" role="status">{{ shareStatus }}</p>
    <label v-if="shareUrl" class="share-fallback">{{ t("products.moments.copy_this_link") }}<input type="text" :value="shareUrl" readonly @focus="($event.target as HTMLInputElement).select()" /></label>
  </div>
</template>

<style scoped>
.final-heart { margin: 1rem 0; font-size: 4rem; }.final-greeting { margin-bottom: .8rem; font-size: 1.3rem; font-weight: 700; overflow-wrap: anywhere; }.final-scene > .story-action { margin-top: 1rem; }.story-reactions { display: flex; justify-content: center; gap: .65rem; margin-top: 1.5rem; }.story-reactions .story-action { min-width: 3.2rem; font-size: 1.5rem; }.story-reactions [aria-pressed="true"] { outline: 2px solid var(--moment-accent); outline-offset: 3px; }.reaction-note, .share-status { max-width: 28rem; margin: 1rem auto; color: var(--moment-muted); font-size: .8rem; line-height: 1.7; }.share-fallback { display: block; margin-top: .75rem; font-size: .8rem; }.share-fallback input { display: block; width: 100%; min-height: 2.75rem; margin-top: .5rem; padding: .5rem; border: 1px solid var(--moment-border); border-radius: .5rem; color: var(--moment-ink); background: var(--moment-surface); }
</style>
