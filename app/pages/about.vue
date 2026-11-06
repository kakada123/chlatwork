<script setup lang="ts">
import { useLanguage } from "~/composables/useLanguage";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";

const { isKhmer } = useLanguage();

const title = computed(() =>
  isKhmer.value
    ? "អំពី ChlatWork - ឧបករណ៍អនឡាញងាយស្រួលប្រើប្រាស់"
    : "About ChlatWork - Simple Online Tools",
);
const description = computed(() =>
  isKhmer.value
    ? "ស្វែងយល់អំពី ChlatWork អ្នកណាខ្លះអាចប្រើប្រាស់បាន និងរបៀបដែលឧបករណ៍រហ័សនៅលើ browser ជួយដល់កិច្ចការឯកសារ រូបភាព QR Code Barcode កាលបរិច្ឆេទ និងការងារការិយាល័យ។"
    : "Learn what ChlatWork is, who it is for, and how its simple privacy-friendly browser tools help with documents, images, QR codes, barcodes, dates, and productivity.",
);
const maintainerName = "Kakada";
const maintainerEmail = "kakada127@gmail.com";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/about",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/about" }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            name: "ChlatWork",
            url: "https://chlatwork.com",
            contactPoint: [
              {
                "@type": "ContactPoint",
                contactType: "customer support",
                email: maintainerEmail,
              },
            ],
          },
          {
            "@type": "Person",
            name: maintainerName,
            email: maintainerEmail,
            worksFor: {
              "@type": "Organization",
              name: "ChlatWork",
            },
          },
        ],
      }),
    },
  ],
});
</script>

<template>
  <main class="content-page mx-auto w-full max-w-[960px] space-y-5">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">
        {{ isKhmer ? "អំពី ChlatWork" : "About ChlatWork" }}
      </h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{ isKhmer
          ? "ChlatWork គឺជាកម្រងឧបករណ៍អនឡាញដំណើរការលើ browser សម្រាប់ជួយសម្រួលការងារប្រចាំថ្ងៃ៖ ឯកសារ PDF, QR Code, ការបង្រួមទំហំរូបភាព, ឧបករណ៍អត្ថបទ, ឧបករណ៍សម្រាប់អ្នកអភិវឌ្ឍន៍ (Developer Tools), ការគណនាចែកប្រាក់ចំណាយ និងកិច្ចការការិយាល័យទូទៅ។"
          : "ChlatWork is an independent collection of focused browser tools for everyday work: PDFs, QR codes, image compression, text utilities, developer helpers, shared expenses, and small office tasks."
        }}
      </p>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{ isKhmer
          ? "គោលបំណងគឺសាមញ្ញ៖ ទំព័រនីមួយៗជួយអ្នកបញ្ចប់កិច្ចការជាក់ស្តែងមួយយ៉ាងរហ័ស ដោយមិនចាំបាច់ដំឡើងកម្មវិធីស្មុគស្មាញ។ ការចូលគណនីតាមរយៈ Google ឬ Telegram ជួយការពារការចូលមើលលទ្ធផល និងទិន្នន័យផ្ទាល់ខ្លួនរបស់អ្នក។ គេហទំព័រនេះយកចិត្តទុកដាក់ជាពិសេសចំពោះតម្រូវការប្រើប្រាស់របស់ប្រជាជនកម្ពុជា ដូចជាការគ្រប់គ្រងអក្សរខ្មែរ Unicode ការចែករំលែកតាម Telegram ម៉ឺនុយហាង QR Code និងការគណនាប្រាក់រៀល (KHR) / ប្រាក់ដុល្លារ (USD)។"
          : "The goal is simple: each page should help you complete one real task without installing heavy software or guessing where to click next. A Google or Telegram login protects result access and account-owned data while still letting you open a tool first. The site gives extra attention to workflows common for Cambodian and Khmer users, such as Khmer text handling, Telegram sharing, restaurant menus, QR codes, and USD/KHR money tasks."
        }}
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        {{ isKhmer ? "ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ថ្ងៃទី ២១ ខែ សីហា ឆ្នាំ ២០២៦" : "Last updated: August 21, 2026" }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ isKhmer ? "អ្នកគ្រប់គ្រង និងអភិវឌ្ឍន៍ ChlatWork" : "Who runs ChlatWork" }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer
          ? `ChlatWork ត្រូវបានបង្កើត និងថែទាំដោយ ${maintainerName} ដែលជាអ្នកអភិវឌ្ឍន៍ឯករាជ្យ ផ្តោតលើការបង្កើតឧបករណ៍គេហទំព័រជាក់ស្តែងសម្រាប់កម្ពុជា និងកិច្ចការជាភាសាខ្មែរ-អង់គ្លេស។`
          : `ChlatWork is maintained by ${maintainerName}, an independent builder focused on practical web tooling for Cambodia and Khmer-English workflows.`
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer
          ? "សម្រាប់មតិកែលម្អ ការរាយការណ៍កំហុស ឬសំណួរផ្សេងៗ អ្នកអាចចូលទៅកាន់ "
          : "For corrections, bug reports, or policy questions, you can use the "
        }}
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ isKhmer ? "ទំព័រទំនាក់ទំនង" : "Contact page" }}
        </NuxtLink>
        {{ isKhmer ? " ឬផ្ញើអ៊ីមែលទៅកាន់ " : " or email " }}
        <a
          :href="`mailto:${maintainerEmail}`"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ maintainerEmail }}</a>.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ isKhmer ? "តើ ChlatWork បង្កើតឡើងសម្រាប់អ្នកណា?" : "Who ChlatWork is for" }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer
          ? "ChlatWork ស័ក្តិសមសម្រាប់សិស្ស-និស្សិត ក្រុមការងារការិយាល័យ អ្នកអភិវឌ្ឍន៍ អ្នកធ្វើការងារឯករាជ្យ ម្ចាស់អាជីវកម្ម និងអ្នកដែលត្រូវការឧបករណ៍រហ័សសម្រាប់កិច្ចការជាក់ស្តែង។ គេហទំព័រនេះត្រូវបានបង្កើតឡើងសម្រាប់ភាពងាយស្រួល៖ បើកទំព័រ បញ្ចប់ការងារ និងអាចត្រឡប់មកប្រើម្តងទៀតគ្រប់ពេល។"
          : "ChlatWork is for students, office teams, developers, freelancers, shop owners, support staff, and anyone who needs a quick tool for a practical task. The site is built for repeat use: open a page, finish the work, and come back when the next small task appears."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ isKhmer ? "ហេតុអ្វីបានជាកិច្ចការបែបកម្ពុជា និងភាសាខ្មែរមានសារៈសំខាន់?" : "Why Cambodia and Khmer workflows matter" }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer
          ? "គេហទំព័រឧបករណ៍ទូទៅភាគច្រើនដំណើរការបាន ប៉ុន្តែមើលរំលងព័ត៌មានលម្អិតក្នុងស្រុក ដូចជា៖ ភាពងាយស្រួលក្នុងការអានអក្សរខ្មែរ អត្ថបទចម្រុះខ្មែរ-អង់គ្លេស ការចែករំលែកតាម Telegram ការទូទាត់ប្រាក់ USD និង KHR និងតម្រូវការឯកសារអាជីវកម្មខ្នាតតូច។ ChlatWork បង្កើតឡើងដើម្បីធ្វើឱ្យកិច្ចការទាំងនេះមានភាពងាយស្រួល និងរលូនបំផុត។"
          : "Many generic tool websites work technically but ignore local details: Khmer text readability, mixed Khmer-English content, Telegram sharing, USD and KHR amounts, QR sharing links for restaurants, and small-business document workflows. ChlatWork is built to make those everyday tasks feel normal, not like edge cases."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer
          ? "ឧបករណ៍ដូចជា QR code, គណនា PayBack, ផ្ទាំង Wi-Fi, អត្ថបទទៅជាសំឡេង និងការកែសម្រួល Unicode ខ្មែរ សុទ្ធតែឆ្លុះបញ្ចាំងពីរបៀបដែលមនុស្សបំពេញការងារជាក់ស្តែងនៅទីនេះ។"
          : "That does not mean every tool forces a Cambodia example. A hash generator should stay technical, while tools such as QR codes, PayBack, Wi-Fi posters, Text to Voice, and Khmer Unicode cleanup should reflect how people actually work here."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ isKhmer ? "អ្វីដែលអ្នកអាចធ្វើបាននៅទីនេះ" : "What you can do here" }}
      </h2>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>
          {{ isKhmer
            ? "បង្កើត Barcode, QR Code និងផ្ទាំង QR ភ្ជាប់ Wi-Fi សម្រាប់ស្លាកផលិតផល ហាង ទំនិញ ស្តុក និងការចែករំលែករហ័ស។"
            : "Generate barcodes, QR codes, and Wi-Fi QR posters for labels, shops, inventory, events, and quick sharing."
          }}
        </li>
        <li>
          {{ isKhmer
            ? "បង្រួមទំហំរូបភាព និងបំប្លែងឯកសារ PDF សម្រាប់ទម្រង់បែបបទ ផ្ញើសារ បោះពុម្ព និងការងារសាលាឬការិយាល័យ។"
            : "Compress images and convert images or PDFs for forms, chat, printing, customer documents, and school or office submissions."
          }}
        </li>
        <li>
          {{ isKhmer
            ? "ប្រើប្រាស់ឧបករណ៍ជំនួយសម្រាប់ Developer ដូចជា JSON formatting, JWT decoding, Base64, URL encoding, regex testing, timestamps, hashes, UUIDs និងបង្កើតពាក្យសម្ងាត់។"
            : "Use developer helpers such as JSON formatting, JWT decoding, Base64, URL encoding, regex testing, timestamps, cron explanations, hashes, UUIDs, and password generation."
          }}
        </li>
        <li>
          {{ isKhmer
            ? "គណនាចែកលុយចំណាយរួមគ្នា តាមដានចំណាយផ្ទាល់ខ្លួន លេងល្បែងកម្សាន្ត កែសម្រួលអក្សរខ្មែរ Unicode និងបំប្លែងអត្ថបទទៅជាសំឡេង។"
            : "Split shared expenses, track personal spending, run simple lucky draws, clean Khmer Unicode text, and convert Khmer or English text to voice."
          }}
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ isKhmer ? "របៀបដែលឧបករណ៍ត្រូវបានបង្កើតឡើង" : "How the tools are built" }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer
          ? "ឧបករណ៍ ChlatWork ត្រូវបានរចនាឡើងយ៉ាងសាមញ្ញ ស្រាល និងច្បាស់លាស់សម្រាប់កិច្ចការនីមួយៗ។ ទំព័រនីមួយៗផ្តោតលើភាពងាយស្រួល ចាប់ពីការបញ្ចូលទិន្នន័យ ការជ្រើសរើសជម្រើស រហូតដល់ការទាញយកលទ្ធផល។"
          : "ChlatWork tools are intentionally small and task-specific. A barcode page focuses on barcode output, a Wi-Fi QR page focuses on connection details and printable posters, and PDF pages focus on clear input, options, preview, and download steps."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer
          ? "គុណភាពនៃខ្លឹមសារត្រូវបានធានាតាមរយៈ "
          : "Content quality and updates follow a documented "
        }}
        <NuxtLink
          to="/editorial-policy"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ isKhmer ? "គោលការណ៍និពន្ធ" : "Editorial Policy" }}
        </NuxtLink>
        {{ isKhmer ? " ដោយយកចិត្តទុកដាក់ជាពិសេសលើទំព័រទាក់ទងនឹងហិរញ្ញវត្ថុ។" : " with extra care for money-related pages." }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ isKhmer ? "គោលការណ៍ចម្បងលើភាពឯកជន (Privacy-first)" : "Privacy-first approach" }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer
          ? "ឧបករណ៍ភាគច្រើននៅលើ ChlatWork ត្រូវបានរចនាឡើងឱ្យដំណើរការក្នុង Browser របស់អ្នកផ្ទាល់។ "
          : "Many ChlatWork tools are designed to run directly in your browser. "
        }}
        {{ LOCAL_PROCESSING_PRIVACY_NOTE }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer
          ? "មុខងារមួយចំនួនតូចដែលតម្រូវឱ្យប្រើប្រាស់ Server ដូចជាការបង្កើតសំឡេងតាម API ត្រូវបានពន្យល់យ៉ាងច្បាស់លាស់នៅក្នុង "
          : "Some features may use a server when browser-only processing is not practical, such as API-backed audio generation or shared result links. In those cases, the site aims to process only what is needed for the feature and explains the behavior in the "
        }}
        <NuxtLink
          to="/privacy-policy"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ isKhmer ? "គោលការណ៍ឯកជនភាព" : "Privacy Policy" }}
        </NuxtLink>.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ isKhmer ? "អត្ថន័យនៃឈ្មោះ ChlatWork" : "Why ChlatWork exists" }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer
          ? "ពាក្យថា \"ឆ្លាត\" (Chlat) មានន័យថាឆ្លាតវៃ រហ័សរហួន—ដូច្នេះ ChlatWork មានន័យថា ធ្វើការងារដោយឆ្លាតវៃ។ គោលដៅគឺផ្តល់ឧបករណ៍ដែលងាយស្រួលប្រើ រហ័ស ទុកចិត្តបាន និងឆ្លើយតបនឹងការងារជាក់ស្តែងប្រចាំថ្ងៃ។"
          : "“Chlat” means smart—so ChlatWork means smart work. The goal is simple: provide tools that are easy to use, fast, reliable, and practical for the kinds of documents, links, labels, dates, and text that people deal with every day."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer
          ? "ប្រសិនបើឧបករណ៍ណាមួយមានបញ្ហា ឬខ្វះមុខងារសំខាន់ណាមួយ អ្នកអាចផ្ញើមតិកែលម្អតាមរយៈ "
          : "The site is updated as new practical needs appear. If a tool is unclear, broken, or missing a common workflow, you can send feedback through the "
        }}
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ isKhmer ? "ទំព័រទំនាក់ទំនង" : "Contact page" }}
        </NuxtLink>.
      </p>
    </section>
  </main>
</template>
