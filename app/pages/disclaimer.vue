<script setup lang="ts">
useSeoMeta({
  title: "Disclaimer — ChlatWork",
  description:
    "Important information about checking ChlatWork tool outputs, browser processing, and professional-use limits.",
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">Disclaimer</h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        ChlatWork provides simple tools for convenience. Please read this before
        using the site for important work.
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">General information</h2>
      <p class="text-gray-700 dark:text-white/75">
        All tools on ChlatWork are provided “as is” and “as available”. We make
        best efforts to keep tools accurate and reliable, but we do not
        guarantee that results will always be correct for every use case.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Verify outputs</h2>
      <p class="text-gray-700 dark:text-white/75">
        You are responsible for verifying any output before using it in
        production, printing, payments, inventory, or business workflows. For
        example: barcodes, QR codes, converted files, and formatted text should
        be checked to ensure they meet your requirements.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        If a result will be used for customers, finance, school submission,
        labels, public documents, or operational work, open the downloaded file
        or generated output and confirm it before sending it.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">File handling & privacy</h2>
      <p class="text-gray-700 dark:text-white/75">
        Many tools are designed to run directly in your browser, meaning your
        files can stay on your device. However, some tools may require a server
        component to function. When server processing is required, we aim to
        minimize data collection and handle data only for the purpose of
        providing the feature.
      </p>
      <p class="text-gray-700 dark:text-white/75">
        For details, please review our
        <NuxtLink
          to="/privacy"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          Privacy Policy </NuxtLink
        >.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">No professional advice</h2>
      <p class="text-gray-700 dark:text-white/75">
        ChlatWork does not provide legal, financial, medical, or other
        professional advice. If you need professional guidance, please consult a
        qualified expert.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Limitation of liability</h2>
      <p class="text-gray-700 dark:text-white/75">
        To the maximum extent permitted by law, ChlatWork and its contributors
        are not liable for any direct or indirect damages, losses, or issues
        arising from the use of the site or tools, including (but not limited
        to) data loss, business interruption, or incorrect outputs.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">Contact</h2>
      <p class="text-gray-700 dark:text-white/75">
        If you have questions about this disclaimer, please contact us via the
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          Contact page </NuxtLink
        >.
      </p>
    </section>
  </main>
</template>
