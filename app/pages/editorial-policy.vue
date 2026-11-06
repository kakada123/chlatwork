<script setup lang="ts">
const { isKhmer } = useLanguage();

const title = "Editorial Policy - ChlatWork";
const description =
  "How ChlatWork plans, writes, reviews, and updates tool guides, policy pages, and financial workflow content.";
const reviewedAt = "2026-06-29";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/editorial-policy",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/editorial-policy" }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        url: "https://chlatwork.com/editorial-policy",
        description,
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
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">{{ isKhmer ? "គោលការណ៍វិចារណកថា (Editorial Policy)" : "Editorial Policy" }}</h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{
          isKhmer
            ? "ទំព័រនេះពន្យល់អំពីរបៀបដែល ChlatWork បង្កើត និងថែរក្សាមគ្គុទ្ទេសក៍ឧបករណ៍ ឧទាហរណ៍អប់រំ ទំព័រគោលការណ៍ និងមាតិកាដំណើរការការងារជាក់ស្តែង។"
            : "This page explains how ChlatWork creates and maintains tool guides, educational examples, policy pages, and practical workflow content."
        }}
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        {{ isKhmer ? "កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ថ្ងៃទី ២៩ ខែមិថុនា ឆ្នាំ ២០២៦" : "Last updated: June 29, 2026" }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "គោលបំណងនៃមាតិកា" : "Purpose of content" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "មាតិការបស់ ChlatWork ត្រូវបានរចនាឡើងដើម្បីជួយអ្នកប្រើប្រាស់បំពេញកិច្ចការជាក់ស្តែងដោយកាត់បន្ថយភាពស្រពេចស្រពិល។ ទំព័រនានាត្រូវបានសរសេរឡើងដើម្បីភាពច្បាស់លាស់ និងល្បឿនលឿន៖ អំពីអ្វីដែលឧបករណ៍ធ្វើ ពេលណាដែលត្រូវប្រើ របៀបជៀសវាងកំហុស និងអ្វីដែលត្រូវផ្ទៀងផ្ទាត់មុនពេលយកលទ្ធផលទៅប្រើក្នុងការងារជាក់ស្តែង។"
            : "ChlatWork content is designed to help users complete practical tasks with less confusion. Pages are written for clarity and speed: what the tool does, when to use it, how to avoid mistakes, and what to verify before using outputs in real workflows."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "របៀបដែលមាតិកាត្រូវបានបង្កើតឡើង" : "How content is created" }}</h2>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>
          {{
            isKhmer
              ? "មគ្គុទ្ទេសក៍នីមួយៗចាប់ផ្តើមចេញពីមុខងារឧបករណ៍ជាក់ស្តែង និងតម្រូវការដំណើរការការងាររបស់អ្នកប្រើប្រាស់។"
              : "Each guide starts from real tool behavior and user workflow needs."
          }}
        </li>
        <li>
          {{
            isKhmer
              ? "ការពន្យល់ត្រូវបានសរសេរឡើងជាភាសាសាមញ្ញ ងាយយល់ ជាមួយឧទាហរណ៍ជាក់ស្តែងសម្រាប់ការប្រើប្រាស់នៅកម្ពុជា និងភាសាខ្មែរ-អង់គ្លេសស្របតាមបរិបទ។"
              : "Explanations are written in plain language with practical examples for Cambodia and Khmer-English usage where relevant."
          }}
        </li>
        <li>
          {{
            isKhmer
              ? "ឧទាហរណ៍បច្ចេកទេស និងហិរញ្ញវត្ថុ ត្រូវបានត្រួតពិនិត្យជាមួយតក្កវិជ្ជារបស់ឧបករណ៍បច្ចុប្បន្នមុនពេលផ្សព្វផ្សាយ។"
              : "Technical and financial examples are checked against current tool logic before publishing."
          }}
        </li>
        <li>
          {{
            isKhmer
              ? "ទំព័រនានាត្រូវបានធ្វើបច្ចុប្បន្នភាពនៅពេលដែលមុខងារឧបករណ៍ ការគាំទ្ររបស់ browser ឬលក្ខខណ្ឌគោលការណ៍មានការផ្លាស់ប្តូរ។"
              : "Pages are updated when tool behavior, browser support, or policy requirements change."
          }}
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ស្តង់ដារមាតិកាហិរញ្ញវត្ថុ និងប្រធានបទរសើប" : "Financial and YMYL content standard" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ទំព័រដែលទាក់ទងនឹងលុយកាក់ ការចំណាយ ការកំណត់ថវិកា និងការគណនាចែកលុយ (payback) ត្រូវបានចាត់ទុកជាប្រធានបទដែលមានហានិភ័យខ្ពស់។ ទំព័រទាំងនេះរួមបញ្ចូលការបញ្ជាក់ពីកម្រិតកំណត់ ការរំលឹកឱ្យផ្ទៀងផ្ទាត់ និងការត្រួតពិនិត្យជាក់ស្តែងកាន់តែម៉ឺងម៉ាត់។"
            : "Pages related to money, expenses, budgeting, and payback calculations are treated as higher-risk topics. These pages include stronger limitations, validation reminders, and practical checks."
        }}
      </p>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>
          {{
            isKhmer
              ? "ឧបករណ៍ហិរញ្ញវត្ថុគឺជាឧបករណ៍ជំនួយសម្រាប់ជាឯកសារយោង និងការសិក្សា មិនមែនជាការប្រឹក្សាផ្នែកហិរញ្ញវត្ថុឡើយ។"
              : "Financial tools are educational utilities, not financial advice."
          }}
        </li>
        <li>
          {{
            isKhmer
              ? "អ្នកប្រើប្រាស់ត្រូវបានរំលឹកឱ្យផ្ទៀងផ្ទាត់ការសន្មត កម្រៃសេវា និងចំនួនទឹកប្រាក់ទូទាត់ចុងក្រោយ មុនពេលផ្ញើប្រាក់ចេញ។"
              : "Users are reminded to verify assumptions, fees, and final payment amounts before sending money."
          }}
        </li>
        <li>
          {{
            isKhmer
              ? "មាតិកាជៀសវាងការសន្យាលើលទ្ធផលហិរញ្ញវត្ថុ ឬការសន្សំសំចៃដែលធានាទុកជាមុន។"
              : "Content avoids promises of financial outcomes or guaranteed savings."
          }}
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ការកែតម្រូវ និងបច្ចុប្បន្នភាព" : "Corrections and updates" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ប្រសិនបើមាតិកាណាមិនច្បាស់លាស់ ហួសសម័យ ឬមិនត្រឹមត្រូវ ChlatWork នឹងធ្វើបច្ចុប្បន្នភាពទំព័រនោះ និងកែលម្អឧទាហរណ៍ ដើម្បីជៀសវាងការភ័ន្តច្រឡំដដែលៗ។"
            : "If content is unclear, outdated, or incorrect, ChlatWork updates the page and improves examples to prevent repeated confusion."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer ? "អ្នកអាចផ្ញើសំណើរសុំកែតម្រូវបានតាមរយៈ " : "You can send correction requests through the " }}
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ isKhmer ? "ទំព័រទំនាក់ទំនង" : "Contact page" }}
        </NuxtLink>
        {{ isKhmer ? "។" : "." }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ឯករាជ្យភាពនៃវិចារណកថា" : "Editorial independence" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ការសម្រេចចិត្តលើមាតិកាគឺផ្អែកលើអត្ថប្រយោជន៍ និងភាពត្រឹមត្រូវសម្រាប់អ្នកប្រើប្រាស់។ ការផ្សាយពាណិជ្ជកម្មមិនកំណត់ទិសដៅ ឬការពិតនៃមគ្គុទ្ទេសក៍ឧបករណ៍ ឬទំព័រគោលការណ៍ឡើយ។"
            : "Content decisions are based on user usefulness and accuracy. Advertising does not determine the factual direction of tool guides or policy pages."
        }}
      </p>
    </section>
  </main>
</template>
