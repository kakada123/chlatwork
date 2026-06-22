<script setup lang="ts">
const route = useRoute();
const { isKhmer } = useLanguage();
const siteUrl = "https://chlatwork.com";
const pageUrl = computed(() => `${siteUrl}${route.path === "/" ? "" : route.path}`);
const heading = computed(() =>
  isKhmer.value ? "សំណួរអំពី ChlatWork" : "Frequently asked questions",
);
const faqs = computed(() =>
  isKhmer.value
    ? [
        {
          question: "ChlatWork ជាអ្វី?",
          answer:
            "ChlatWork គឺជាគេហទំព័រ free online tools សម្រាប់ PDF រូបភាព QR code ការគណនា Khmer tools និង developer tools។",
        },
        {
          question: "ឧបករណ៍ប្រើឥតគិតថ្លៃមែនទេ?",
          answer:
            "មែន។ ឧបករណ៍ ChlatWork អាចបើកប្រើបានដោយផ្ទាល់នៅក្នុង browser សម្រាប់ការងារប្រចាំថ្ងៃ។",
        },
        {
          question: "ឯកសារត្រូវ upload ទៅ server ទេ?",
          answer:
            "ឧបករណ៍ជាច្រើនដំណើរការឯកសារនៅក្នុង browser នៅពេលអាចធ្វើបាន។ មុខងារខ្លះអាចប្រើ server ប្រសិនបើចាំបាច់។",
        },
        {
          question: "ត្រូវបង្កើតគណនីទេ?",
          answer:
            "មិនចាំបាច់មានគណនីសម្រាប់ឧបករណ៍មូលដ្ឋានដែលមាននៅលើ ChlatWork ពេលនេះទេ។",
        },
        {
          question: "អាចស្នើសុំឧបករណ៍ថ្មីបានទេ?",
          answer:
            "បាន។ ប្រើទំព័រ Contact ដើម្បីរាយការណ៍ bug ស្នើសុំឧបករណ៍ ឬផ្ញើមតិយោបល់។",
        },
      ]
    : [
        {
          question: "What is ChlatWork?",
          answer:
            "ChlatWork is a free online tools website for PDFs, images, QR codes, calculators, Khmer tools, and developer tools.",
        },
        {
          question: "Are the tools free to use?",
          answer:
            "Yes. ChlatWork tools are available directly in the browser for everyday work.",
        },
        {
          question: "Do files upload to a server?",
          answer:
            "Many tools process files in your browser where possible. Some features may use a server only when needed.",
        },
        {
          question: "Do I need to create an account?",
          answer:
            "No account is required for the basic tools currently available on ChlatWork.",
        },
        {
          question: "Can I request a new tool?",
          answer:
            "Yes. Use the Contact page to report bugs, request tools, or send practical feedback.",
        },
      ],
);

useHead(() => ({
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${pageUrl.value}#faq`,
        mainEntity: faqs.value.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }),
    },
  ],
}));
</script>

<template>
  <section class="px-5 pb-12 pt-8 sm:px-8 lg:px-12" id="faq">
    <div class="mx-auto max-w-7xl">
      <div class="max-w-2xl">
        <p class="text-sm font-semibold uppercase text-sky-600 dark:text-cyan-300">
          FAQ
        </p>
        <h2 class="mt-2 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
          {{ heading }}
        </h2>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-2">
        <details
          v-for="faq in faqs"
          :key="faq.question"
          class="rounded-[18px] border border-white/80 bg-white/75 p-3 shadow-lg shadow-sky-100/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20"
        >
          <summary class="cursor-pointer text-sm font-black text-slate-950 dark:text-white">
            {{ faq.question }}
          </summary>
          <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-white/65">
            {{ faq.answer }}
          </p>
        </details>
      </div>
    </div>
  </section>
</template>
