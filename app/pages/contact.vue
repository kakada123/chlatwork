<script setup lang="ts">
import { useLanguage } from "~/composables/useLanguage";

const { isKhmer } = useLanguage();

const title = computed(() =>
  isKhmer.value ? "ទំនាក់ទំនង ChlatWork" : "Contact ChlatWork",
);
const description = computed(() =>
  isKhmer.value
    ? "ទាក់ទងមកកាន់ ChlatWork ដើម្បីរាយការណ៍កំហុស ស្នើសុំឧបករណ៍ថ្មី ចែករំលែកមតិកែលម្អ ឬសាកសួរអំពីភាពឯកជន និង cookie។"
    : "Contact ChlatWork to report bugs, request tools, share feedback, or ask privacy and cookie questions.",
);
const reviewedAt = "2026-06-29";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/contact",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/contact" }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Contact ChlatWork",
        url: "https://chlatwork.com/contact",
        description:
          "Contact ChlatWork to report bugs, request tools, share feedback, or ask privacy and cookie questions.",
        dateModified: reviewedAt,
        publisher: {
          "@type": "Organization",
          name: "ChlatWork",
          url: "https://chlatwork.com",
        },
      }),
    },
  ],
});

const email = "support@chlatwork.com";
</script>

<template>
  <main class="content-page mx-auto w-full max-w-[960px] space-y-5">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">
        {{ isKhmer ? "ទំនាក់ទំនង" : "Contact" }}
      </h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{ isKhmer
          ? "ទំព័រនេះសម្រាប់ផ្ញើមតិកែលម្អ រាយការណ៍កំហុស សំណួរអំពីភាពឯកជន ឬស្នើសុំឧបករណ៍ថ្មីៗសម្រាប់ ChlatWork។ ការរៀបរាប់ច្បាស់លាស់ជួយឱ្យយើងដោះស្រាយបញ្ហាបានកាន់តែលឿន។"
          : "Use this page for ChlatWork feedback, bug reports, privacy questions, and practical tool ideas. Clear reports help us find the right page, reproduce the issue, and improve the tool faster."
        }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ isKhmer ? "អ៊ីមែល" : "Email" }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer ? "អ្នកអាចទាក់ទងមកកាន់យើងតាមរយៈ៖ " : "You can contact us at: " }}
        <a
          :href="`mailto:${email}`"
          class="font-semibold text-gray-900 underline dark:text-white"
        >
          {{ email }}
        </a>
      </p>
      <p class="max-w-3xl text-sm text-gray-500 dark:text-white/55">
        {{ isKhmer
          ? "សូមបញ្ជាក់ឈ្មោះឧបករណ៍ តំណភ្ជាប់ទំព័រ ប្រភេទកម្មវិធីរុករក ឬឧបករណ៍របស់អ្នក និងបញ្ហាដែលបានកើតឡើង។ រូបភាព Screenshot ពិតជាមានប្រយោជន៍ខ្លាំងណាស់។"
          : "Please include the tool name, the page URL, your browser or device, what you expected to happen, and what happened instead. Screenshots are helpful when the issue is visual."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ isKhmer ? "អ្វីដែលយើងអាចជួយបាន" : "What we can help with" }}
      </h2>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>{{ isKhmer ? "ការរាយការណ៍បញ្ហាបច្ចេកទេស និងកំហុសលើឧបករណ៍។" : "Bug reports and broken tool behavior." }}</li>
        <li>
          {{ isKhmer ? "ការស្នើសុំបន្ថែមមុខងារលើឧបករណ៍ PDF, QR, រូបភាព និង Developer tools។" : "Feature requests for PDF, QR, image, utility, and developer tools." }}
        </li>
        <li>{{ isKhmer ? "សំណួរអំពីភាពឯកជន គោលការណ៍ Cookie និងការគ្រប់គ្រងទិន្នន័យ។" : "Privacy, cookie, advertising, and data-handling questions." }}</li>
        <li>{{ isKhmer ? "ការកែតម្រូវខ្លឹមសារណែនាំ ឬឧទាហរណ៍។" : "Corrections for guide pages, tool descriptions, or examples." }}</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ isKhmer ? "មុនពេលផ្ញើព័ត៌មានរសើប" : "Before sending private data" }}
      </h2>
      <p class="max-w-3xl text-gray-700 dark:text-white/75">
        {{ isKhmer
          ? "សូមកុំផ្ញើពាក្យសម្ងាត់ Private key ព័ត៌មានកាតទូទាត់ ឯកសារសម្គាល់ខ្លួន ឬឯកសារសម្ងាត់របស់អតិថិជន។ ប្រសិនបើលទ្ធផលឧបករណ៍មានបញ្ហា សូមពណ៌នាអំពីជំហាន និងប្រើទិន្នន័យគំរូ។"
          : "Do not email passwords, private keys, payment details, identity documents, or confidential customer files. If a tool output looks wrong, describe the steps and use sample data where possible."
        }}
      </p>
    </section>
  </main>
</template>
