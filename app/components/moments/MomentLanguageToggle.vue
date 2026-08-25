<script setup lang="ts">
withDefaults(defineProps<{ dark?: boolean }>(), { dark: false });
const { locale, copy, setMomentLocale } = useMomentLanguage();
</script>

<template>
  <div
    class="moment-language-toggle"
    :class="{ 'is-dark': dark }"
    role="group"
    :aria-label="copy.languageLabel"
  >
    <button
      type="button"
      :class="{ active: locale === 'en' }"
      :aria-pressed="locale === 'en'"
      @click="setMomentLocale('en')"
    >
      EN
    </button>
    <button
      type="button"
      :class="{ active: locale === 'km' }"
      :aria-pressed="locale === 'km'"
      @click="setMomentLocale('km')"
    >
      ខ្មែរ
    </button>
  </div>
</template>

<style scoped>
.moment-language-toggle {
  display: inline-flex;
  gap: 0.2rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.2rem;
  font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif;
  box-shadow: 0 0.45rem 1.5rem rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);
}
.moment-language-toggle button {
  min-height: 2rem;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 800;
  transition: 0.15s ease;
}
.moment-language-toggle button:hover,
.moment-language-toggle button:focus-visible {
  color: #9f1239;
}
.moment-language-toggle button:focus-visible {
  outline: 2px solid #fb7185;
  outline-offset: 2px;
}
.moment-language-toggle button.active {
  background: #d13a67;
  color: white;
}
:global(html.dark .moment-language-toggle) {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(17, 19, 24, 0.9);
  box-shadow: none;
}
:global(.moment-language-toggle.is-dark) {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(17, 19, 24, 0.9);
  box-shadow: none;
}
:global(html.dark .moment-language-toggle button) {
  color: #b8bdc7;
}
:global(.moment-language-toggle.is-dark button) {
  color: #b8bdc7;
}
:global(html.dark .moment-language-toggle button:hover),
:global(html.dark .moment-language-toggle button:focus-visible) {
  color: white;
}
:global(.moment-language-toggle.is-dark button:hover),
:global(.moment-language-toggle.is-dark button:focus-visible) {
  color: white;
}
:global(html.dark .moment-language-toggle button.active) {
  background: #d13a67;
  color: white;
}
:global(.moment-language-toggle.is-dark button.active) {
  background: #d13a67;
  color: white;
}
</style>
