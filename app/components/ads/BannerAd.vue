<template>
  <section
    class="flex justify-center overflow-hidden py-3"
    :aria-label="isKhmer ? 'ពាណិជ្ជកម្ម' : 'Advertisement'"
  >
    <iframe
      :title="isKhmer ? 'ពាណិជ្ជកម្ម' : 'Advertisement'"
      :srcdoc="adDocument"
      width="320"
      height="50"
      class="max-w-full border-0"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      referrerpolicy="strict-origin-when-cross-origin"
      scrolling="no"
    />
  </section>
</template>

<script setup lang="ts">
const { isKhmer } = useLanguage();

// Keep provider globals and document.write inside the ad's own document.
const adDocument = `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>html, body { margin: 0; padding: 0; overflow: hidden; }</style>
  </head>
  <body>
    <script>
      var atOptions = {
        key: '65b4a045602f9f2c72c3f74f427c7ece',
        format: 'iframe',
        height: 50,
        width: 320,
        params: {}
      };
    <\/script>
    <script src="https://www.highrevenueformat.com/65b4a045602f9f2c72c3f74f427c7ece/invoke.js"><\/script>
  </body>
</html>`;
</script>
