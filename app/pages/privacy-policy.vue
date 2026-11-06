<script setup lang="ts">
import { openPrivacyCookieSettings } from "~/lib/cookie-notice";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";

const { isKhmer } = useLanguage();

const title = "Privacy Policy - ChlatWork";
const description =
  "How ChlatWork handles browser-based processing, data collection, cookies, analytics, ads, and third-party services.";
const reviewedAt = "2026-10-01";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/privacy-policy",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/privacy-policy" }],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        url: "https://chlatwork.com/privacy-policy",
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
      <h1 class="text-2xl font-bold">{{ isKhmer ? "គោលការណ៍ឯកជនភាព (Privacy Policy)" : "Privacy Policy" }}</h1>
      <p class="max-w-3xl text-gray-600 dark:text-white/70">
        {{
          isKhmer
            ? "ChlatWork មានគោលបំណងប្រមូលទិន្នន័យឱ្យបានតិចបំផុតតាមដែលអាចធ្វើទៅបាន ខណៈពេលដែលផ្ដល់ជូននូវឧបករណ៍ដំណើរការលើ browser ប្រកបដោយប្រយោជន៍។ ទំព័រនេះពន្យល់អំពីការដំណើរការទិន្នន័យក្នុងឧបករណ៍របស់អ្នក (local processing) ខូឃី (cookies) ការវិភាគស្ថិតិ ការផ្សព្វផ្សាយពាណិជ្ជកម្ម សេវាកម្មភាគីទីបី និងជម្រើសរបស់អ្នក។"
            : "ChlatWork aims to collect as little data as practical while providing useful browser tools. This page explains local processing, cookies, analytics, advertising, third-party services, and your choices."
        }}
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        {{ isKhmer ? "កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ថ្ងៃទី ១ ខែតុលា ឆ្នាំ ២០២៦" : "Last updated: October 1, 2026" }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ទិន្នន័យដែល ChlatWork ប្រមូល" : "What data ChlatWork collects" }}</h2>
      <template v-if="isKhmer">
        <p class="text-gray-700 dark:text-white/75">
          យើងអាចប្រមូលព័ត៌មានទូទៅដែលមិនកំណត់អត្តសញ្ញាណអំពីការប្រើប្រាស់ និងស្ថិរភាពប្រព័ន្ធ ដូចជាចំនួនទំព័រដែលបានមើល ប្រភេទកម្មវិធីរុករក (browser) ប្រភេទឧបករណ៍ ទំព័រយោង ទីតាំងប្រហាក់ប្រហែលចេញពីអាសយដ្ឋាន IP និងព័ត៌មានអំពីបញ្ហាបច្ចេកទេស។ ព័ត៌មាននេះជួយឱ្យយើងយល់ដឹងថាឧបករណ៍ណាខ្លះមានប្រយោជន៍ និងកន្លែងណាដែលគេហទំព័រត្រូវការកែលម្អ។
        </p>
        <p class="text-gray-700 dark:text-white/75">
          ប្រសិនបើអ្នកទាក់ទងមកយើងតាមរយៈអ៊ីមែល យើងនឹងទទួលបានព័ត៌មានដែលអ្នកជ្រើសរើសផ្ញើមក ដូចជាអាសយដ្ឋានអ៊ីមែល សារ រូបថតអេក្រង់ និងព័ត៌មានលម្អិតអំពីកំហុសបច្ចេកទេស។
        </p>
        <p class="text-gray-700 dark:text-white/75">
          ប្រសិនបើអ្នកចូលគណនីតាមរយៈ Google ឬ Telegram យើងនឹងទទួលបាន និងរក្សាទុកលេខសម្គាល់គណនីដែលផ្ដល់ដោយប្រព័ន្ធទាំងនោះ ព្រមទាំងព័ត៌មានប្រវត្តិរូបដែលមាន ដូចជាឈ្មោះ អាសយដ្ឋានអ៊ីមែលដែលបានផ្ទៀងផ្ទាត់ រូបភាពប្រវត្តិរូប និងឈ្មោះអ្នកប្រើប្រាស់។ យើងក៏រក្សាទុកប្រព័ន្ធដែលបានភ្ជាប់ជាមួយគណនី ChlatWork របស់អ្នក ស្ថានភាពគណនី តួនាទី និងកំណត់ត្រាសុវត្ថិភាព session ផងដែរ។ ChlatWork មិនទទួលបាន ឬរក្សាទុកពាក្យសម្ងាត់ Google ឬ Telegram របស់អ្នកឡើយ។
        </p>
        <p class="text-gray-700 dark:text-white/75">
          នៅពេលអ្នកបានចូលគណនី ChlatWork កត់ត្រាលេខសម្គាល់សាធារណៈនៃទំព័រឧបករណ៍នីមួយៗដែលអ្នកបានបើក ប្រភេទព្រឹត្តិការណ៍ និងពេលវេលា។ ប្រវត្តិនេះត្រូវបានភ្ជាប់ជាមួយគណនីដើម្បីបង្ហាញក្នុងផ្នែក «ឧបករណ៍ដែលប្រើច្រើនបំផុត» នៅក្នុងកម្រងព័ត៌មានរបស់អ្នក និងរួមចំណែកដល់ចំណាត់ថ្នាក់រួម «ឧបករណ៍ពេញនិយម»។ ចំណាត់ថ្នាក់សាធារណៈមិនកំណត់អត្តសញ្ញាណគណនីបុគ្គលឡើយ។ ប្រវត្តិប្រើប្រាស់ឧបករណ៍មិនរួមបញ្ចូលទិន្នន័យដែលអ្នកបានបញ្ចូល មាតិកាដែលបានបង្កើត ឈ្មោះឯកសារ ឬតម្លៃ query ក្នុង URL ឡើយ។
        </p>
        <p class="text-gray-700 dark:text-white/75">
          លេខសម្គាល់ឧបករណ៍សំណព្វ និងលេខសម្គាល់ពាក្យបញ្ជា developer សំណព្វ ត្រូវបានរក្សាទុកជាមួយគណនី ChlatWork របស់អ្នក។ កំណត់ត្រាសំណព្វមិនផ្ទុកទិន្នន័យដែលអ្នកបញ្ចូល មាតិកាដែលបានបង្កើត ឬតម្លៃពាក្យបញ្ជាដែលបានកែសម្រួលឡើយ។
        </p>
        <p class="text-gray-700 dark:text-white/75">
          យើងមិនលក់ព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នកជាដាច់ខាត។
        </p>
      </template>
      <template v-else>
        <p class="text-gray-700 dark:text-white/75">
          We may collect basic, non-identifying usage and reliability information
          such as page views, browser type, device type, referring pages,
          approximate location derived from IP address, and error information.
          This helps us understand which tools are useful and where the site needs
          improvement.
        </p>
        <p class="text-gray-700 dark:text-white/75">
          If you contact us by email, we receive the information you choose to
          send, such as your email address, message, screenshots, and bug details.
        </p>
        <p class="text-gray-700 dark:text-white/75">
          If you sign in with Google or Telegram, we receive and store the account
          identifier supplied by that provider and available profile information,
          which may include your name, verified email address, profile image, and
          username. We also store the provider linked to your ChlatWork account,
          account status, role, and security session records. ChlatWork does not
          receive or store your Google or Telegram password.
        </p>
        <p class="text-gray-700 dark:text-white/75">
          While you are signed in, ChlatWork records the public identifier of each
          tool page you open, the event type, and the time. This account-linked
          history powers the Most used tools section in your profile and contributes
          to an aggregate Popular tools ranking. The public ranking does not identify
          individual accounts. Tool usage history does not
          include tool inputs, generated content, filenames, or URL query values.
        </p>
        <p class="text-gray-700 dark:text-white/75">
          Favorite tool keys and favorite developer-command identifiers are stored
          with your signed-in ChlatWork account. Favorite records do not contain
          tool inputs, generated content, or customized command values.
        </p>
        <p class="text-gray-700 dark:text-white/75">
          We do not sell personal information.
        </p>
      </template>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ទិន្នន័យជំនួយការផ្ទាល់ខ្លួន (Personal Assistant)" : "Personal Assistant data" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "នៅពេលអ្នកប្រើប្រាស់ Telegram Personal Assistant ដែលបានចូលគណនី ChlatWork រក្សាទុកការចងចាំ ភារកិច្ច អត្ថបទរំលឹក ប្រធានបទ កាលបរិច្ឆេទ ស្ថានភាព និងព័ត៌មានផ្ញើចេញដែលចាំបាច់សម្រាប់ដំណើរការមុខងារនេះ។ កំណត់ត្រាទាំងនេះត្រូវបានភ្ជាប់ជាមួយគណនី ChlatWork របស់អ្នក ហើយមិនត្រូវបានចែករំលែកជាមួយអ្នកប្រើប្រាស់ដទៃឡើយ។ សារជាភាសាធម្មជាតិត្រូវបានផ្ញើទៅកាន់ AI provider កំណត់រចនាសម្ព័ន្ធសម្រាប់តែចាត់ថ្នាក់ និងស្រង់យកសកម្មភាពដែលបានស្នើសុំប៉ុណ្ណោះ។"
            : "When you use the signed-in Telegram Personal Assistant, ChlatWork stores the memories, tasks, reminder text, subjects, dates, statuses, and delivery information needed to provide the feature. These records are linked to your ChlatWork account and are not shared with other users. Natural-language messages are sent to the configured AI provider only to classify and extract the requested action."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "គណនី និងការផ្ទៀងផ្ទាត់សុវត្ថិភាព" : "Accounts and authentication" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ព័ត៌មានគណនីត្រូវបានប្រើដើម្បីបង្កើត និងការពារគណនី ChlatWork របស់អ្នក រក្សាការចូលប្រើប្រាស់ ការពារការបំពាន អនុញ្ញាតលទ្ធផលដែលត្រូវបានការពារ និងផ្ដល់ជូននូវមុខងារផ្អែកលើគណនី។ Token ចូលប្រើប្រាស់ និង Token ផ្ទុកឡើងវិញ ត្រូវបានរក្សាទុកក្នុង HttpOnly cookies ដែលមានសុវត្ថិភាពខ្ពស់។ Refresh tokens ត្រូវបានរក្សាទុកក្នុងមូលដ្ឋានទិន្នន័យត្រឹមតែជាទម្រង់ hash មួយទិសប៉ុណ្ណោះ ហើយត្រូវបានផ្លាស់ប្តូរថ្មីរាល់ពេលប្រើប្រាស់។"
            : "Account information is used to create and secure your ChlatWork account, keep you signed in, prevent abuse, authorize protected results, and provide account-based features. Access and refresh tokens are stored in secure HttpOnly cookies. Refresh tokens are stored in the database only as one-way hashes and are rotated when used."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "Google និង Telegram ដំណើរការការចូលគណនីក្រោមគោលការណ៍ឯកជនភាពផ្ទាល់ខ្លួនរបស់ពួកគេ។ ChlatWork ផ្ទៀងផ្ទាត់ identity token ដែលប្រគល់មកវិញដោយ provider មុនពេលបង្កើត session។"
            : "Google and Telegram process the sign-in interaction under their own privacy policies. ChlatWork validates the identity token returned by the provider before creating a session."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ isKhmer ? "ឧបករណ៍ដំណើរការលើ Browser និងការដំណើរការក្នុងឧបករណ៍ផ្ទាល់" : "Browser-based tools and local processing" }}
      </h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ឧបករណ៍ ChlatWork ជាច្រើនត្រូវបានរចនាឡើងដើម្បីដំណើរការផ្ទាល់នៅក្នុងកម្មវិធីរុករករបស់អ្នក រួមទាំងឧបករណ៍ PDF, រូបភាព, QR, បាកូដ, ម៉ាស៊ីនគិតលេខ និងឧបករណ៍ developer ផងដែរ។"
            : "Many ChlatWork tools are designed to run directly in your browser, including common PDF, image, QR, barcode, calculator, and developer tools."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer ? "ទិន្នន័យរបស់អ្នកត្រូវបានដំណើរការក្នុងកម្មវិធីរុករកផ្ទាល់ខ្លួនរបស់អ្នកតាមដែលអាចធ្វើទៅបាន។ យើងមិនមានចេតនារក្សាទុកឯកសារ ឬធាតុចូលរបស់អ្នកនៅលើ server របស់យើងឡើយ។" : LOCAL_PROCESSING_PRIVACY_NOTE }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "មុខងារមួយចំនួនអាចទាមទារការដំណើរការលើ server នៅពេលដែលការដំណើរការលើ browser មិនអាចធ្វើទៅបាន ដូចជាការបង្កើតសំឡេងពីអត្ថបទ (text-to-voice) ឬតំណភ្ជាប់លទ្ធផលចែករំលែក។ ក្នុងករណីទាំងនោះ ChlatWork មានបំណងដំណើរការតែអ្វីដែលចាំបាច់បំផុតដើម្បីផ្ដល់មុខងារនោះប៉ុណ្ណោះ។"
            : "Some features may require server-side processing when browser-only work is not practical, such as online text-to-voice generation or shared result links. In those cases, ChlatWork aims to process only what is needed to provide the feature."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ទិន្នន័យ Expense Tracker និង PayBack" : "Expense Tracker and PayBack data" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "នៅពេលអ្នកប្រើ Expense Tracker ដែលបានចូលគណនី ChlatWork រក្សាទុករូបិយប័ណ្ណ ចន្លោះកាលបរិច្ឆេទ ការកំណត់ថវិកា ទិន្នន័យដែលបានបញ្ចូល និងធាតុចំណាយ ឬចំណូល។ កំណត់ត្រាអាចរួមបញ្ចូលកាលបរិច្ឆេទ ប្រភេទចំណាយ ប្រភេទកំណត់ផ្ទាល់ខ្លួន ចំណាំ ប្រភេទធាតុចូល និងចំនួនទឹកប្រាក់។ ព័ត៌មាននេះត្រូវបានរក្សាទុកក្នុង PostgreSQL និងភ្ជាប់ជាមួយគណនី ChlatWork របស់អ្នក ដើម្បីអាចទាញយកមកវិញបានគ្រប់ពេល។"
            : "When you use the signed-in Expense Tracker, ChlatWork stores your currency, date range, budget settings, pasted input, and expense or income entries. Entries may include dates, categories, custom categories, notes, entry type, and amounts. This information is stored in PostgreSQL and linked to your ChlatWork account so it can be restored across sessions."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "នៅពេលអ្នកប្រើប្រាស់ PayBack Calculator ដែលបានចូលគណនី ChlatWork រក្សាទុករូបិយប័ណ្ណ ឈ្មោះអ្នកចូលរួម ចំនួនទឹកប្រាក់ដែលបានបញ្ចូល និងការកំណត់កាក់រៀលដែលនៅសល់ជាមួយគណនីរបស់អ្នក។ ប្រសិនបើអ្នករក្សាទុកការគណនា ChlatWork ក៏រក្សាទុកចំនួនសរុប ចំនួនអ្នកចូលរួម ចំនួនទឹកប្រាក់របស់បុគ្គលម្នាក់ៗ និងពេលវេលាបង្កើតទុកជាប្រវត្តិគណនាផងដែរ។"
            : "When you use the signed-in PayBack Calculator, ChlatWork stores the currency, participant names, entered amounts, pasted input, and KHR remainder settings with your account so your work can be restored. If you save a calculation, ChlatWork also stores its totals, participant count, participant amounts, and creation time as calculation history."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "តំណភ្ជាប់ចែករំលែកបង្កប់ទិន្នន័យក្នុងតំណភ្ជាប់ផ្ទាល់ ហើយមិនត្រូវបានរក្សាទុកជាកំណត់ត្រាក្នុងមូលដ្ឋានទិន្នន័យរបស់ ChlatWork ឡើយ។ នរណាក៏ដោយដែលមានតំណភ្ជាប់នោះ អាចមើលឃើញមាតិកាបាន ដូច្នេះសូមកុំដាក់ព័ត៌មានសម្ងាត់ ឬព័ត៌មានផ្ទាល់ខ្លួនដែលរសើបខ្លាំង។"
            : "Share links encode their contents in the link itself and are not saved as share records in ChlatWork's database. Anyone who receives such a link can read its contents, so do not include secrets or highly sensitive personal information."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ឯកសារ និងរូបភាពដែលបានបញ្ចូល" : "Uploaded files and images" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "សម្រាប់ឧបករណ៍ដែលដំណើរការឯកសារក្នុងឧបករណ៍ផ្ទាល់ ឯកសារដែលបានជ្រើសរើសត្រូវបានអានដោយ browser របស់អ្នក ដើម្បីបង្កើតលទ្ធផលលើឧបករណ៍របស់អ្នក។ យើងមិនមានចេតនារក្សាទុកឯកសារ ឬធាតុចូលទាំងនោះនៅលើ server របស់យើងឡើយ។"
            : "For tools that process files locally, selected files are read by your browser so the tool can create the result on your device. We do not intentionally store those files or inputs on our server."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "អ្នកនៅតែគួរពិនិត្យផ្ទៀងផ្ទាត់លទ្ធផលដែលទាញយក មុនពេលយកទៅប្រើប្រាស់ក្នុងអាជីវកម្ម សាលារៀន អតិថិជន ការបោះពុម្ព ការទូទាត់ សន្និធិ ឬកិច្ចការសាធារណៈ។"
            : "You should still review downloaded results before using them for business, school, customer, printing, payment, inventory, or public workflows."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ខូឃី ការវិភាគស្ថិតិ និងការផ្សព្វផ្សាយពាណិជ្ជកម្ម" : "Cookies, analytics, and ads" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork អាចប្រើប្រាស់ខូឃី (cookies) ការផ្ទុកទិន្នន័យក្នុងเครื่อง (local storage) ភីកសែល វេបប៊ីខន អាសយដ្ឋាន IP ឬបច្ចេកវិទ្យាស្រដៀងគ្នា សម្រាប់មុខងារគេហទំព័រ សុវត្ថិភាព ការវិភាគ និងការផ្សាយពាណិជ្ជកម្ម។"
            : "ChlatWork may use cookies, local storage, pixels, web beacons, IP addresses, or similar technologies for site functionality, security, analytics, and advertising."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork ប្រើប្រាស់ Vercel Web Analytics ដើម្បីស្វែងយល់ពីការប្រើប្រាស់គេហទំព័រទូទៅ និងភាពអាចទុកចិត្តបាន។ Vercel Web Analytics ត្រូវបានរចនាឡើងដើម្បីផ្ដល់ព័ត៌មានដែលគោរពភាពឯកជន និងមិនប្រើប្រាស់ tracking cookies ឡើយ។"
            : "ChlatWork uses Vercel Web Analytics to understand general site usage and reliability. Vercel Web Analytics is designed to provide privacy-minded usage information and does not use tracking cookies."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork អាចបង្ហាញការផ្សាយពាណិជ្ជកម្មដោយប្រើដៃគូផ្សព្វផ្សាយភាគីទីបី។ ក្រុមហ៊ុនទាំងនោះអាចប្រើខូឃី វេបប៊ីខន អាសយដ្ឋាន IP ឬឧបករណ៍កំណត់អត្តសញ្ញាណដទៃទៀត ដើម្បីផ្ដល់ការផ្សាយពាណិជ្ជកម្ម កម្រិតការផ្សាយដដែលៗ វាស់វែងប្រសិទ្ធភាព ការពារការបន្លំ និងបង្ហាញការផ្សាយពាណិជ្ជកម្មផ្ទាល់ខ្លួន ឬទូទៅ។"
            : "ChlatWork may display ads using third-party advertising partners. These vendors may use cookies, web beacons, IP addresses, or other identifiers to serve ads, limit repeated ads, measure ad performance, prevent fraud, and show personalized or non-personalized ads."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "សេវាកម្មភាគីទីបី" : "Third-party services" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork អាចប្រើសេវាកម្មភាគីទីបីសម្រាប់ការបង្ហោះ (hosting) ការវិភាគស្ថិតិ ការផ្សាយពាណិជ្ជកម្ម បណ្ណាល័យកូដ និងមុខងារឧបករណ៍បន្ថែម។ ក្រុមហ៊ុនទាំងនេះអាចដំណើរការព័ត៌មានបច្ចេកទេសក្នុងកម្រិតកំណត់ ស្របតាមគោលការណ៍ផ្ទាល់ខ្លួនរបស់ពួកគេ។"
            : "ChlatWork may use third-party services for hosting, analytics, advertising, code libraries, and optional tool features. These providers may process limited technical information according to their own policies."
        }}
      </p>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>{{ isKhmer ? "Vercel សម្រាប់ការបង្ហោះគេហទំព័រ និងការវិភាគ web analytics។" : "Vercel for hosting, deployment, and web analytics." }}</li>
        <li>{{ isKhmer ? "ដៃគូផ្សាយពាណិជ្ជកម្មភាគីទីបីសម្រាប់ការបង្ហាញពាណិជ្ជកម្ម។" : "Third-party advertising partners for ads." }}</li>
        <li>{{ isKhmer ? "Google Identity Services និង Telegram សម្រាប់ការចូលគណនី។" : "Google Identity Services and Telegram for optional account login." }}</li>
        <li>
          {{
            isKhmer
              ? "PostgreSQL និងហេដ្ឋារចនាសម្ព័ន្ធបង្ហោះមូលដ្ឋានទិន្នន័យ សម្រាប់កំណត់ត្រាគណនី session ឧបករណ៍សំណព្វ Expense Tracker PayBack និងប្រវត្តិប្រើប្រាស់។"
              : "PostgreSQL and the infrastructure provider hosting the database for account, session, favorites, Expense Tracker, PayBack, and tool-usage records."
          }}
        </li>
        <li>
          {{
            isKhmer
              ? "បណ្ណាល័យកូដ JavaScript លើ browser សម្រាប់ដំណើរការ PDF រូបភាព QR បាកូដ និងឧបករណ៍ទូទៅ។"
              : "Browser-side JavaScript libraries for PDF, image, QR, barcode, and utility processing."
          }}
        </li>
        <li>
          {{
            isKhmer
              ? "API providers តែក្នុងករណីដែលមុខងារជាក់លាក់មិនអាចដំណើរការទាំងស្រុងលើ browser បាន។"
              : "API providers only where a specific feature cannot run fully in the browser."
          }}
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ជម្រើសរបស់អ្នក" : "Your choices" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "អ្នកអាចទប់ស្កាត់ ឬលុបខូឃី និង local storage តាមរយៈការកំណត់របស់កម្មវិធីរុករករបស់អ្នក។ មុខងារពន្លឺ/ងងឹត (color mode) ភាសា និងការជូនដំណឹងអំពីខូឃី ត្រូវបានរក្សាទុកតែនៅក្នុង browser របស់អ្នកប៉ុណ្ណោះ ហើយអាចកំណត់ឡើងវិញបានប្រសិនបើអ្នកលុប local storage។ ឧបករណ៍សំណព្វទាមទារការចូលគណនី ហើយត្រូវបានរក្សាទុកជាមួយគណនី ChlatWork របស់អ្នក។"
            : "You can block or delete cookies and local storage through your browser settings. Color mode, language, and cookie notice state are stored only in your browser and may reset if local storage is cleared. Favorites require sign-in and are stored with your ChlatWork account instead."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "អ្នកអាចស្នើសុំមើល កែតម្រូវ ឬលុបទិន្នន័យគណនី ChlatWork របស់អ្នក ដោយទាក់ទងមកយើងតាមរយៈទំព័រទំនាក់ទំនង។ យើងអាចនឹងត្រូវផ្ទៀងផ្ទាត់ថាការស្នើសុំនេះពិតជាជារបស់ម្ចាស់គណនីពិតប្រាកដមុននឹងចាត់វិធានការ។"
            : "You may ask to access, correct, or delete your ChlatWork account data by contacting us through the Contact page. We may need to verify that the request belongs to the account holder before acting on it."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer ? "សម្រាប់ព័ត៌មានលម្អិតបន្ថែមអំពីខូឃី សូមអាន " : "For more detail about cookies, read the " }}
        <NuxtLink
          to="/cookies"
          class="font-medium text-gray-900 underline dark:text-white"
        >
          {{ isKhmer ? "គោលការណ៍ខូឃី (Cookie Policy)" : "Cookie Policy" }}
        </NuxtLink>
        {{ isKhmer ? "។" : "." }}
      </p>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
        @click="openPrivacyCookieSettings"
      >
        {{ isKhmer ? "ការកំណត់ភាពឯកជន និងខូឃី" : "Privacy & cookie settings" }}
      </button>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "រយៈពេលនៃការរក្សាទុកទិន្នន័យ" : "Data retention" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "សម្រាប់ឧបករណ៍ដែលដំណើរការលើ browser តែមួយគត់ ChlatWork មិនទទួលបានឯកសារ ឬធាតុចូលឡើយ ដូច្នេះមិនមានច្បាប់ចម្លងលើ server ត្រូវរក្សាទុកទេ។ សម្រាប់មុខងារលើ server និងកំណត់ត្រាប្រតិបត្តិការ យើងរក្សាទុកទិន្នន័យត្រឹមតែរយៈពេលដែលចាំបាច់សម្រាប់មុខងារ សុវត្ថិភាព ស្ថិរភាព ឬលក្ខខណ្ឌតម្រូវតាមផ្លូវច្បាប់ប៉ុណ្ណោះ។ Session ផុតកំណត់បន្ទាប់ពី ៣០ ថ្ងៃ លុះត្រាតែត្រូវបានលុបមុនកាលកំណត់។ កំណត់ត្រា Expense Tracker, PayBack, Personal Assistant, ឧបករណ៍សំណព្វ និងគណនី នៅតែមានដរាបណាគណនីនៅតែសកម្ម។"
            : "For browser-only tools, ChlatWork does not receive the files or input, so there is no server copy to retain. For server-based features and operational logs, we retain data only as long as needed for the feature, security, reliability, or legal requirements. Refresh sessions expire after 30 days unless revoked earlier. Expense Tracker records, PayBack records, Personal Assistant records, favorites, account records, and provider links remain while the account is active. They may be retained afterward only where required for security, dispute resolution, backups, or legal compliance."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ប្រវត្តិប្រើប្រាស់ឧបករណ៍ដែលបានចូលគណនី នៅតែមានជាមួយគណនីរបស់អ្នក រហូតទាល់តែអ្នកលុបចេញពីកម្រងព័ត៌មានរបស់អ្នក ឬគណនីត្រូវបានលុប។"
            : "Signed-in tool usage history remains with your account until you clear it from your profile or the account is deleted."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ភាពឯកជនរបស់កុមារ" : "Children's privacy" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork មិនត្រូវបានតម្រង់ទិសដៅសម្រាប់កុមារដែលមានអាយុក្រោម ១៣ ឆ្នាំឡើយ។ យើងមិនប្រមូលព័ត៌មានផ្ទាល់ខ្លួនពីកុមារអាយុក្រោម ១៣ ឆ្នាំដោយចេតនានោះទេ។"
            : "ChlatWork is not directed to children under 13. We do not knowingly collect personal information from children under 13."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ការផ្លាស់ប្តូរគោលការណ៍នេះ" : "Changes to this policy" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "យើងអាចធ្វើបច្ចុប្បន្នភាពគោលការណ៍ឯកជនភាពនេះ នៅពេលដែលគេហទំព័រ ឧបករណ៍ ការផ្សាយពាណិជ្ជកម្ម ឬលក្ខខណ្ឌផ្លូវច្បាប់មានការផ្លាស់ប្តូរ។ កំណែចុងក្រោយបំផុតនឹងត្រូវបានផ្សព្វផ្សាយនៅលើទំព័រនេះជាមួយកាលបរិច្ឆេទដែលបានធ្វើបច្ចុប្បន្នភាព។"
            : "We may update this Privacy Policy as the site, tools, advertising setup, or legal requirements change. The latest version will be posted on this page with an updated date."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ទំនាក់ទំនង" : "Contact" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer ? "ប្រសិនបើអ្នកមានចម្ងល់អំពីភាពឯកជន សូមទាក់ទងមកយើងតាមរយៈ " : "If you have privacy questions, contact us through the " }}
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
