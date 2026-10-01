<template>
  <section
    class="flex justify-center overflow-hidden py-3"
    :aria-label="isKhmer ? 'ពាណិជ្ជកម្ម' : 'Advertisement'"
  >
    <iframe
      :title="isKhmer ? 'ពាណិជ្ជកម្ម' : 'Advertisement'"
      :srcdoc="adDocument"
      :width="ad.width"
      :height="ad.height"
      class="max-w-full border-0"
      referrerpolicy="strict-origin-when-cross-origin"
      scrolling="no"
    />
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{ placement?: "banner" | "sidebar" }>(),
  { placement: "banner" },
);
const { isKhmer } = useLanguage();
const placements = {
  banner: {
    key: "65b4a045602f9f2c72c3f74f427c7ece",
    width: 320,
    height: 50,
  },
  sidebar: {
    key: "26c46514fdb02ba0f5d67bf09e7eb944",
    width: 160,
    height: 600,
  },
};
const ad = computed(() => placements[props.placement]);

// Keep provider globals and document.write inside the ad's own document.
// A normal iframe origin lets the provider read cookies and create nested frames.
const adDocument = computed(() => `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>html, body { margin: 0; padding: 0; overflow: hidden; }</style>
  </head>
  <body>
    <script>
      var atOptions = ${JSON.stringify({
        ...ad.value,
        format: "iframe",
        params: {},
      })};
    <\/script>
    <script src="https://www.highrevenueformat.com/${ad.value.key}/invoke.js"><\/script>
  </body>
</html>`);
</script>
