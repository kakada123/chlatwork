<script setup lang="ts">
const { isKhmer } = useLanguage();

const title = "Disclaimer - ChlatWork";
const description =
  "Important information about checking ChlatWork tool outputs, browser processing, no-warranty limits, and professional-use responsibility.";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/disclaimer",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/disclaimer" }],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">{{ isKhmer ? "ការមិនទទួលខុសត្រូវ (Disclaimer)" : "Disclaimer" }}</h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{
          isKhmer
            ? "ChlatWork ផ្ដល់ជូននូវឧបករណ៍សាមញ្ញៗសម្រាប់ភាពងាយស្រួលប្រចាំថ្ងៃ។ សូមអានចំណុចខាងក្រោមកាលពីប្រើប្រាស់គេហទំព័រនេះសម្រាប់ការងារសំខាន់ៗ។"
            : "ChlatWork provides simple tools for convenience. Please read this before using the site for important work."
        }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ព័ត៌មានទូទៅ" : "General information" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ឧបករណ៍ទាំងអស់នៅលើ ChlatWork ត្រូវបានផ្ដល់ជូន «តាមស្ថានភាពជាក់ស្ដែង (as is)» និង «តាមលទ្ធភាពដែលអាចប្រើបាន (as available)»។ យើងព្យាយាមអស់ពីលទ្ធភាពដើម្បីឱ្យឧបករណ៍មានភាពត្រឹមត្រូវ និងអាចទុកចិត្តបាន ប៉ុន្តែយើងមិនធានាថាលទ្ធផលនឹងត្រឹមត្រូវគ្រប់ករណីប្រើប្រាស់ទាំងអស់នោះទេ។"
            : "All tools on ChlatWork are provided “as is” and “as available”. We make best efforts to keep tools accurate and reliable, but we do not guarantee that results will always be correct for every use case."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ការផ្ទៀងផ្ទាត់លទ្ធផល" : "Verify outputs" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "អ្នកត្រូវទទួលខុសត្រូវលើការផ្ទៀងផ្ទាត់លទ្ធផលមុនពេលយកទៅប្រើប្រាស់ក្នុងអាជីវកម្ម ការបោះពុម្ព ការទូទាត់ សន្និធិ ឬកិច្ចការផ្លូវការ។ ឧទាហរណ៍៖ បាកូដ កូដ QR ឯកសារបម្លែង និងអត្ថបទកែសម្រួល គួរតែត្រូវបានពិនិត្យផ្ទៀងផ្ទាត់ឱ្យច្បាស់លាស់។"
            : "You are responsible for verifying any output before using it in production, printing, payments, inventory, or business workflows. For example: barcodes, QR codes, converted files, and formatted text should be checked to ensure they meet your requirements."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ប្រសិនបើរាល់លទ្ធផលត្រូវយកទៅប្រើសម្រាប់អតិថិជន ហិរញ្ញវត្ថុ ការដាក់កិច្ចការសាលា ផ្លាកសញ្ញា ឯកសារសាធារណៈ សូមបើកមើលឯកសារដែលទាញយក ឬលទ្ធផលដែលបានបង្កើតឡើងដើម្បីបញ្ជាក់ឱ្យច្បាស់មុនពេលផ្ញើចេញ។"
            : "If a result will be used for customers, finance, school submission, labels, public documents, or operational work, open the downloaded file or generated output and confirm it before sending it."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ការគ្រប់គ្រងឯកសារ និងភាពឯកជន" : "File handling & privacy" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ឧបករណ៍ជាច្រើនត្រូវបានរចនាឡើងដើម្បីដំណើរការផ្ទាល់នៅក្នុងកម្មវិធីរុករក (browser) របស់អ្នក មានន័យថាឯកសាររបស់អ្នកស្ថិតនៅលើឧបករណ៍របស់អ្នកផ្ទាល់។ ទោះយ៉ាងណា ឧបករណ៍មួយចំនួនអាចទាមទារសេវា server ដើម្បីដំណើរការ។ នៅពេលដំណើរការលើ server យើងកាត់បន្ថយការប្រមូលទិន្នន័យឱ្យនៅកម្រិតទាបបំផុត និងប្រើប្រាស់តែសម្រាប់មុខងារនោះប៉ុណ្ណោះ។"
            : "Many tools are designed to run directly in your browser, meaning your files can stay on your device. However, some tools may require a server component to function. When server processing is required, we aim to minimize data collection and handle data only for the purpose of providing the feature."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer ? "សម្រាប់ព័ត៌មានលម្អិត សូមពិនិត្យមើល " : "For details, please review our " }}
        <NuxtLink
          to="/privacy-policy"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ isKhmer ? "គោលការណ៍ឯកជនភាព (Privacy Policy)" : "Privacy Policy" }}
        </NuxtLink>
        {{ isKhmer ? " របស់យើង។" : "." }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "មិនមែនជាការប្រឹក្សាវិជ្ជាជីវៈ" : "No professional advice" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork មិនផ្ដល់ការប្រឹក្សាផ្នែកច្បាប់ ហិរញ្ញវត្ថុ វេជ្ជសាស្ត្រ ឬវិជ្ជាជីវៈដទៃទៀតឡើយ។ ប្រសិនបើអ្នកត្រូវការការណែនាំពីអ្នកជំនាញ សូមទាក់ទងអ្នកជំនាញដែលមានអាជ្ញាប័ណ្ណត្រឹមត្រូវ។"
            : "ChlatWork does not provide legal, financial, medical, or other professional advice. If you need professional guidance, please consult a qualified expert."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "កម្រិតនៃការទទួលខុសត្រូវ" : "Limitation of liability" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ក្នុងកម្រិតអតិបរមាដែលច្បាប់អនុញ្ញាត ChlatWork និងអ្នកចូលរួមបង្កើត មិនទទួលខុសត្រូវចំពោះការខូចខាត ការបាត់បង់ ឬបញ្ហាដោយផ្ទាល់ ឬដោយប្រយោលដែលកើតឡើងពីការប្រើប្រាស់គេហទំព័រ ឬឧបករណ៍ រួមទាំងការបាត់បង់ទិន្នន័យ ការរអាក់រអួលអាជីវកម្ម ឬលទ្ធផលមិនត្រឹមត្រូវឡើយ។"
            : "To the maximum extent permitted by law, ChlatWork and its contributors are not liable for any direct or indirect damages, losses, or issues arising from the use of the site or tools, including (but not limited to) data loss, business interruption, or incorrect outputs."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ទំនាក់ទំនង" : "Contact" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer ? "ប្រសិនបើអ្នកមានចម្ងល់អំពីការមិនទទួលខុសត្រូវនេះ សូមទាក់ទងយើងតាមរយៈ " : "If you have questions about this disclaimer, please contact us via the " }}
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ isKhmer ? "ទំព័រទំនាក់ទំនង (Contact)" : "Contact page" }}
        </NuxtLink>
        {{ isKhmer ? "។" : "." }}
      </p>
    </section>
  </main>
</template>
