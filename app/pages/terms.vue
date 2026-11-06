<script setup lang="ts">
const { isKhmer } = useLanguage();

const title = "Terms of Use - ChlatWork";
const description =
  "Terms for using ChlatWork online tools, guide pages, generated outputs, advertising, and browser-based workflows.";
const reviewedAt = "2026-10-01";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/terms",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/terms" }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        url: "https://chlatwork.com/terms",
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
      <h1 class="text-2xl font-bold">{{ isKhmer ? "លក្ខខណ្ឌនៃការប្រើប្រាស់ (Terms of Use)" : "Terms of Use" }}</h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{
          isKhmer
            ? "តាមរយៈការប្រើប្រាស់ ChlatWork អ្នកយល់ព្រមតាមលក្ខខណ្ឌទាំងនេះ។ គេហទំព័រនេះផ្ដល់ជូននូវឧបករណ៍ដំណើរការលើ browser និងទំព័រមគ្គុទ្ទេសក៍សម្រាប់ការងារជាក់ស្តែង ប៉ុន្តែអ្នកនៅតែទទួលខុសត្រូវក្នុងការផ្ទៀងផ្ទាត់លទ្ធផលមុនពេលយកទៅប្រើប្រាស់។"
            : "By using ChlatWork, you agree to these terms. The site provides browser tools and guide pages for practical work, but you remain responsible for checking results before using them."
        }}
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        {{ isKhmer ? "កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ថ្ងៃទី ១ ខែតុលា ឆ្នាំ ២០២៦" : "Last updated: October 1, 2026" }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ការប្រើប្រាស់សេវាកម្ម" : "Use of the service" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "អ្នកអាចប្រើប្រាស់ឧបករណ៍ ChlatWork សម្រាប់កិច្ចការផ្ទាល់ខ្លួន និងអាជីវកម្ម ដរាបណាអ្នកមិនប្រើប្រាស់ខុសគោលដៅ ឬព្យាយាមបំផ្លាញ បំពាន ឬធ្វើឱ្យប្រព័ន្ធផ្ទុកលើសទម្ងន់។"
            : "You may use ChlatWork tools for personal and business tasks as long as you do not misuse the service or attempt to break, abuse, or overload the system."
        }}
      </p>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>{{ isKhmer ? "គ្មានមាតិកាខុសច្បាប់ ឬសកម្មភាពដែលបង្កគ្រោះថ្នាក់។" : "No illegal content or harmful activity." }}</li>
        <li>{{ isKhmer ? "គ្មានការព្យាយាមរំលោភសុវត្ថិភាព ឬទាញយកផលពីចន្លោះប្រហោង។" : "No attempts to bypass security or exploit vulnerabilities." }}</li>
        <li>{{ isKhmer ? "គ្មានការទាញទិន្នន័យដោយស្វ័យប្រវត្តិ (scraping) ដែលប៉ះពាល់ដល់ដំណើរការរបស់ប្រព័ន្ធ។" : "No automated scraping that impacts performance." }}</li>
        <li>
          {{ isKhmer ? "គ្មានការប្រើប្រាស់ឧបករណ៍ដើម្បីបំភាន់អ្នកប្រើប្រាស់ អតិថិជន ឬភាគីទីបី។" : "No use of the tools to mislead users, customers, or third parties." }}
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "គណនី" : "Accounts" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "អ្នកអាចចូលប្រើប្រាស់ដោយប្រើគណនី Google ឬ Telegram ដែលគាំទ្រ។ អ្នកទទួលខុសត្រូវក្នុងការគ្រប់គ្រងគណនីទាំងនោះ និងសកម្មភាពនានាដែលបានធ្វើតាមរយៈ session របស់អ្នកនៅលើ ChlatWork។ យើងអាចផ្អាកគណនី ឬលុប session នៅពេលចាំបាច់ដើម្បីដោះស្រាយបញ្ហាបំពាន ហានិភ័យសុវត្ថិភាព ឬការបំពានលក្ខខណ្ឌទាំងនេះ។"
            : "You may sign in using a supported Google or Telegram account. You are responsible for maintaining control of that provider account and for activity performed through your ChlatWork session. We may suspend an account or revoke sessions when reasonably necessary to address abuse, security risks, or violations of these terms."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "អ្នកអាចបើកទំព័រឧបករណ៍ និងបញ្ចូលទិន្នន័យដោយមិនចាំបាច់ចូលគណនីក៏បាន។ ChlatWork អាចទាមទារការផ្ទៀងផ្ទាត់គណនីមុនពេលបង្ហាញលទ្ធផលដែលត្រូវបានការពារ ឬរក្សាទុកទិន្នន័យផ្ទាល់ខ្លួន។ ទំព័រព័ត៌មាន មគ្គុទ្ទេសក៍ ទំនាក់ទំនង និងគោលការណ៍នានា អាចចូលមើលបានដោយសេរី។"
            : "You may open tool pages and enter data without signing in. ChlatWork may require authentication before displaying protected results or saving account-owned data. Public informational, guide, contact, and policy pages may remain available without signing in."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "តំណភ្ជាប់ចែករំលែក និងមាតិកាដែលបានរក្សាទុក" : "Shared links and stored content" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ឧបករណ៍សំណព្វ ទិន្នន័យ Expense Tracker និង PayBack របស់អ្នកប្រើប្រាស់ដែលបានចូលគណនី ត្រូវបានរក្សាទុកជាមួយគណនី ChlatWork របស់អ្នក។ តំណភ្ជាប់ចែករំលែក PayBack និង Expense Tracker បង្កប់ទិន្នន័យក្នុង URL៖ នរណាក៏ដោយដែលមានតំណភ្ជាប់នោះ អាចមើលឃើញមាតិកានោះ។ សូមកុំដាក់ព័ត៌មានសម្ងាត់ ឬព័ត៌មានផ្ទាល់ខ្លួនដែលរសើបខ្លាំងក្នុងកំណត់ចំណាំចំណាយ ឬតំណភ្ជាប់ចែករំលែក។ អ្នកនៅតែទទួលខុសត្រូវលើព័ត៌មានដែលអ្នករក្សាទុក ឬចែករំលែក។"
            : "Signed-in favorites, Expense Tracker, and PayBack data are stored with your ChlatWork account. PayBack and Expense Tracker share links encode their contents in the URL: anyone who receives the link may view that content. Do not place secrets or highly sensitive personal information in expense notes or shared links. You remain responsible for the information you store or share."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ការប្រើប្រាស់ដែលត្រូវបានហាមឃាត់" : "Prohibited usage" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "អ្នកមិនត្រូវប្រើប្រាស់ ChlatWork ដើម្បីបង្កើត ដំណើរការ ចែករំលែក ឬគាំទ្រមាតិកាដែលខុសច្បាប់ បង្កគ្រោះថ្នាក់ បោកបញ្ឆោត ឬរំលោភសិទ្ធិឡើយ។ អ្នកក៏មិនត្រូវប្រើប្រាស់គេហទំព័រនេះក្នុងផ្លូវដែលប៉ះពាល់ដល់ភាពអាចរកបាននៃសេវាកម្ម រំខានដល់អ្នកប្រើប្រាស់ដទៃ ឬបំពានច្បាប់បណ្តាញផ្សព្វផ្សាយពាណិជ្ជកម្មឡើយ។"
            : "You must not use ChlatWork to create, process, share, or support illegal, harmful, deceptive, abusive, or infringing content. You also must not use the site in a way that damages service availability, interferes with other users, or violates advertising network rules."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "លទ្ធផលនៃឧបករណ៍" : "Tool outputs" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "លទ្ធផលដែលបានបង្កើតដោយឧបករណ៍ (បាកូដ កូដ QR ការបម្លែងឯកសារ ។ល។) ត្រូវបានផ្ដល់ជូន «តាមស្ថានភាពជាក់ស្ដែង»។ អ្នកទទួលខុសត្រូវក្នុងការផ្ទៀងផ្ទាត់ភាពត្រឹមត្រូវមុនពេលយកទៅប្រើប្រាស់ក្នុងការផលិត ការបោះពុម្ព ឬដំណើរការអាជីវកម្ម។"
            : "Outputs generated by tools (barcodes, QR codes, conversions, etc.) are provided “as is”. You are responsible for verifying correctness before using them in production, printing, or business workflows."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ឧទាហរណ៍៖ សូមពិនិត្យមើលភាពច្បាស់នៃបាកូដ ប្លង់ PDF គោលដៅនៃកូដ QR ចំនួនទឹកប្រាក់ដែលបានគណនា ពាក្យសម្ងាត់ដែលបានបង្កើត កាលបរិច្ឆេទ និងកូដដែលបានធ្វើទ្រង់ទ្រាយ មុនពេលចែករំលែក ឬពឹងផ្អែកលើពួកវា។"
            : "For example, check barcode readability, PDF layout, QR destination, calculated amounts, generated passwords, dates, and formatted code before sharing or relying on them."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ភាពអាចរកបាននៃសេវាកម្ម" : "Availability" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "យើងអាចកែសម្រួល ដកចេញ ឬផ្លាស់ប្តូរឧបករណ៍គ្រប់ពេលវេលា។ យើងមានបំណងរក្សាសេវាកម្មឱ្យមានស្ថិរភាព ប៉ុន្តែមិនអាចធានាថាគ្មានការរអាក់រអួលទាំងស្រុងនោះទេ។"
            : "We may update, remove, or change tools at any time. We aim to keep the service stable but cannot guarantee uninterrupted availability."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "កម្មសិទ្ធិបញ្ញា" : "Intellectual property" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork ជាម្ចាស់ ឬទទួលបានអាជ្ញាប័ណ្ណលើការរចនាគេហទំព័រ អត្ថបទ កូដប្រភព ម៉ាកសញ្ញា និងមាតិកាមគ្គុទ្ទេសក៍ដើម។ អ្នកនៅតែរក្សាសិទ្ធិ និងការទទួលខុសត្រូវលើឯកសារ អត្ថបទ រូបភាព តំណភ្ជាប់ កូដ និងធាតុចូលដទៃទៀតដែលអ្នកនាំមកកាន់ឧបករណ៍។"
            : "ChlatWork owns or licenses the site design, text, source code, branding, and original guide content. You keep responsibility for the files, text, images, links, codes, and other input you bring to the tools."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "លទ្ធផលនៃឧបករណ៍ត្រូវបានផ្ដល់ជូនសម្រាប់ការប្រើប្រាស់របស់អ្នក ប៉ុន្តែអ្នកត្រូវធានាថាធាតុចូល និងលទ្ធផលរបស់អ្នកមិនរំលោភលើសិទ្ធិរបស់អ្នកដទៃឡើយ។"
            : "Tool outputs are provided for your use, but you are responsible for making sure your input and output do not violate someone else's rights."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ការផ្សព្វផ្សាយពាណិជ្ជកម្ម" : "Advertising" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork អាចបង្ហាញការផ្សាយពាណិជ្ជកម្មពីដៃគូផ្សព្វផ្សាយភាគីទីបី។ អ្នកមិនត្រូវចុចលើការផ្សាយពាណិជ្ជកម្មដដែលៗ លើកទឹកចិត្តអ្នកដទៃឱ្យចុច ប្រើវិធីសាស្ត្រស្វ័យប្រវត្តិដើម្បីបង្កើតចំនួនមើល ឬចំនួនចុច ឬធ្វើអន្តរកម្មជាមួយការផ្សាយពាណិជ្ជកម្មក្នុងផ្លូវដែលបំពានគោលការណ៍បណ្តាញផ្សព្វផ្សាយឡើយ។"
            : "ChlatWork may display ads from third-party advertising partners. You must not click ads repeatedly, encourage others to click ads, use automated methods to generate ad impressions or clicks, or interact with ads in a way that violates advertising network policies."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer ? "ការអនុវត្តការផ្សព្វផ្សាយ និងខូឃី ត្រូវបានពិពណ៌នានៅក្នុង " : "Advertising and cookie practices are described in our " }}
        <NuxtLink
          to="/privacy-policy"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ isKhmer ? "គោលការណ៍ឯកជនភាព" : "Privacy Policy" }}
        </NuxtLink>
        {{ isKhmer ? " និង " : " and " }}
        <NuxtLink
          to="/cookies"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ isKhmer ? "គោលការណ៍ខូឃី" : "Cookie Policy" }}
        </NuxtLink>
        {{ isKhmer ? " របស់យើង។" : "." }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ isKhmer ? "គ្មានការធានា និងកម្រិតនៃការទទួលខុសត្រូវ" : "No warranty and limitation of liability" }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork ត្រូវបានផ្ដល់ជូនដោយគ្មានការធានាប្រភេទណាមួយឡើយ។ ក្នុងកម្រិតអតិបរមាដែលច្បាប់អនុញ្ញាត យើងមិនទទួលខុសត្រូវចំពោះការខូចខាត ឬការបាត់បង់ណាមួយដែលកើតចេញពីការប្រើប្រាស់ឧបករណ៍ទាំងនេះឡើយ។"
            : "ChlatWork is provided without warranties of any kind. To the maximum extent permitted by law, we are not liable for any damages or losses resulting from use of the tools."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer ? "សូមមើល " : "See the " }}
        <NuxtLink
          to="/disclaimer"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ isKhmer ? "ការមិនទទួលខុសត្រូវ (Disclaimer)" : "Disclaimer" }}
        </NuxtLink>
        {{ isKhmer ? " សម្រាប់ព័ត៌មានលម្អិតបន្ថែម។" : " for more detail." }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ទំនាក់ទំនង" : "Contact" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer ? "ប្រសិនបើអ្នកមានចម្ងល់អំពីលក្ខខណ្ឌទាំងនេះ សូមទាក់ទងមកយើងតាមរយៈ " : "If you have questions about these terms, contact us through the " }}
        <NuxtLink
          to="/contact"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ isKhmer ? "ទំព័រទំនាក់ទំនង" : "Contact page" }}
        </NuxtLink>
        {{ isKhmer ? "។" : "." }}
      </p>
    </section>
  </main>
</template>
