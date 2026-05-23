<script setup lang="ts">
const route = useRoute();
const { isKhmer } = useLanguage();
const siteUrl = "https://chlatwork.com";
const pageUrl = computed(() => `${siteUrl}${route.path === "/" ? "" : route.path}`);
const heading = computed(() =>
  isKhmer.value ? "សំណួរអំពី ChlatWork" : "Questions about ChlatWork",
);
const faqs = computed(() =>
  isKhmer.value
    ? [
        {
          question: "ChlatWork ជាអ្វី?",
          answer:
            "ChlatWork គឺជាសំណុំឧបករណ៍អនឡាញសាមញ្ញៗសម្រាប់ឯកសារ រូបភាព QR code barcode កាលបរិច្ឆេទ ការគណនា productivity និងការងារ developer។",
        },
        {
          question: "ឧបករណ៍ប្រើឥតគិតថ្លៃមែនទេ?",
          answer:
            "មែន។ ឧបករណ៍ ChlatWork អាចបើកប្រើបានដោយផ្ទាល់នៅក្នុង browser សម្រាប់ការងារប្រចាំថ្ងៃ។",
        },
        {
          question: "ឯកសារត្រូវ upload ទៅ server ទេ?",
          answer:
            "ឧបករណ៍ជាច្រើនដំណើរការឯកសារនៅក្នុង browser របស់អ្នកនៅពេលអាចធ្វើបាន។ មុខងារខ្លះអាចប្រើ server នៅពេល browser-only មិនអាចធ្វើបានល្អ។",
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
            "ChlatWork is a collection of simple online tools for documents, images, QR codes, barcodes, dates, calculators, productivity, and developer tasks.",
        },
        {
          question: "Are the tools free to use?",
          answer:
            "Yes. ChlatWork tools are available directly in the browser for everyday work.",
        },
        {
          question: "Do files upload to a server?",
          answer:
            "Many tools process files in your browser where possible. Some features may use a server when browser-only processing is not practical.",
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
  <section class="px-5 py-14 sm:px-8 lg:px-12" id="faq">
    <div class="mx-auto max-w-7xl">
      <div class="max-w-2xl">
        <p class="text-sm font-semibold uppercase text-sky-600 dark:text-cyan-300">
          FAQ
        </p>
        <h2 class="mt-3 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
          {{ heading }}
        </h2>
      </div>

      <div class="mt-8 grid gap-3 md:grid-cols-2">
        <details
          v-for="faq in faqs"
          :key="faq.question"
          class="rounded-[18px] border border-white/80 bg-white/75 p-4 shadow-lg shadow-sky-100/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20"
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
