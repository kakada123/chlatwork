<script setup lang="ts">
import { openPrivacyCookieSettings } from "~/lib/cookie-notice";

const { isKhmer } = useLanguage();

const title = "Cookie Policy - ChlatWork";
const description =
  "How ChlatWork uses cookies, local storage, analytics, advertising cookies, and similar technologies.";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/cookies",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/cookies" }],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">{{ isKhmer ? "គោលការណ៍ខូឃី (Cookie Policy)" : "Cookie Policy" }}</h1>
      <p class="text-gray-600 dark:text-white/70">
        {{
          isKhmer
            ? "ទំព័រនេះពន្យល់អំពីរបៀបដែល ChlatWork អាចប្រើប្រាស់ខូឃី (cookies) និងបច្ចេកវិទ្យាស្រដៀងគ្នា សម្រាប់ដំណើរការមុខងារ ការវិភាគស្ថិតិ សុវត្ថិភាព និងការផ្សព្វផ្សាយពាណិជ្ជកម្ម។"
            : "This page explains how ChlatWork may use cookies and similar technologies for functionality, analytics, security, and advertising."
        }}
      </p>
      <p class="text-sm text-gray-500 dark:text-white/50">
        {{ isKhmer ? "កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ថ្ងៃទី ១ ខែតុលា ឆ្នាំ ២០២៦" : "Last updated: October 1, 2026" }}
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "តើខូឃីជាអ្វី?" : "What cookies are" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ខូឃី គឺជាឯកសារតូចៗដែលត្រូវបានរក្សាទុកនៅលើឧបករណ៍របស់អ្នកដោយកម្មវិធីរុករក (browser)។ បច្ចេកវិទ្យាស្រដៀងគ្នានេះរួមមាន local storage ភីកសែល វេបប៊ីខន អាសយដ្ឋាន IP និងឧបករណ៍កំណត់អត្តសញ្ញាណដទៃទៀត។"
            : "Cookies are small files stored on your device by your browser. Similar technologies include local storage, pixels, web beacons, IP addresses, and other identifiers."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "របៀបដែលយើងប្រើប្រាស់ខូឃី" : "How we use cookies" }}</h2>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>{{ isKhmer ? "ដើម្បីរក្សាឱ្យមុខងារគេហទំព័រដំណើរការបានត្រឹមត្រូវ។" : "To keep site features working correctly." }}</li>
        <li>{{ isKhmer ? "ដើម្បីចងចាំចំណូលចិត្តមូលដ្ឋាននៅពេលចាំបាច់។" : "To remember basic preferences where needed." }}</li>
        <li>{{ isKhmer ? "ដើម្បីស្វែងយល់ពីការប្រើប្រាស់គេហទំព័រ និងកែលម្អស្ថិរភាព។" : "To understand site usage and improve reliability." }}</li>
        <li>{{ isKhmer ? "ដើម្បីជួយការពារការបំពាន ការបន្លំ ឬបញ្ហាសុវត្ថិភាព។" : "To help detect abuse, fraud, or security issues." }}</li>
        <li>{{ isKhmer ? "ដើម្បីបង្ហាញ វាស់វែង និងកែលម្អការផ្សព្វផ្សាយពាណិជ្ជកម្ម។" : "To display, measure, and improve ads." }}</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ខូឃីផ្ទាល់ និងការផ្ទុកទិន្នន័យ (First-party cookies)" : "First-party cookies and storage" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork អាចរក្សាទុកចំណូលចិត្តតូចៗដោយផ្ទាល់នៅក្នុង browser របស់អ្នក ដើម្បីឱ្យគេហទំព័រមានភាពស៊ីសង្វាក់គ្នានៅពេលអ្នកត្រឡប់មកវិញ។"
            : "ChlatWork may store small preferences directly in your browser so the site feels consistent when you return."
        }}
      </p>
      <ul class="list-disc space-y-1 pl-5 text-gray-700 dark:text-white/75">
        <li>
          <code>app-locale</code>: {{ isKhmer ? "ចងចាំភាសាដែលអ្នកបានជ្រើសរើស (ខ្មែរ ឬ អង់គ្លេស)។" : "remembers your selected language." }}
        </li>
        <li>
          <code>chlatwork-color-mode</code>: {{ isKhmer ? "ចងចាំមុខងារពន្លឺ (light) ឬងងឹត (dark)។" : "remembers light or dark mode." }}
        </li>
        <li>
          <code>chlatwork_cookie_notice_closed</code>: {{ isKhmer ? "ចងចាំថាអ្នកបានបិទផ្ទាំងជូនដំណឹងអំពីខូឃីរួចហើយ។" : "remembers that you closed the cookie notice." }}
        </li>
        <li>
          <code>chlatwork_access_token</code>: {{ isKhmer ? "ជា HttpOnly login cookie ចាំបាច់ដែលផុតកំណត់បន្ទាប់ពីប្រហែល ១៥ នាទី។" : "an essential HttpOnly login cookie that expires after approximately 15 minutes." }}
        </li>
        <li>
          <code>chlatwork_refresh_token</code>: {{ isKhmer ? "ជា HttpOnly session cookie ចាំបាច់ដែលផុតកំណត់បន្ទាប់ពីប្រហែល ៣០ ថ្ងៃ និងគាំទ្រការបន្ត session ដោយសុវត្ថិភាព។" : "an essential HttpOnly session cookie that expires after approximately 30 days and supports secure session renewal." }}
        </li>
        <li>
          {{ isKhmer ? "HttpOnly cookies បណ្តោះអាសន្នសម្រាប់ស្ថានភាព Telegram និង PKCE ការពារ callback ពេលចូលគណនី និងផុតកំណត់បន្ទាប់ពីប្រហែល ១០ នាទី។" : "Temporary HttpOnly Telegram state and PKCE cookies protect the login callback and expire after approximately 10 minutes." }}
        </li>
      </ul>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ខូឃីផ្ទៀងផ្ទាត់គណនី (Authentication cookies) គឺចាំបាច់បំផុតនៅពេលអ្នកជ្រើសរើសចូលគណនី។ ពួកវាមិនអាចអានបានដោយ JavaScript ក្នុង browser ឡើយ ហើយមិនត្រូវបានប្រើសម្រាប់ការផ្សាយពាណិជ្ជកម្មនោះទេ។"
            : "Authentication cookies are strictly necessary when you choose to sign in. They are not available to browser JavaScript and are not used for advertising."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ការជូនដំណឹងអំពីខូឃី" : "Cookie notice" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork បង្ហាញផ្ទាំងជូនដំណឹងអំពីខូឃីតូចមួយ ជាមួយតំណភ្ជាប់ទៅកាន់គោលការណ៍ខូឃីនេះ និងគោលការណ៍ឯកជនភាព។ ការបិទផ្ទាំងជូនដំណឹងនេះនឹងរក្សាទុកតម្លៃ chlatwork_cookie_notice_closed ក្នុង localStorage ដើម្បីកុំឱ្យផ្ទាំងនេះលេចឡើងដដែលៗ។"
            : "ChlatWork shows a small informational cookie notice with links to this Cookie Policy and the Privacy Policy. Closing the notice stores the chlatwork_cookie_notice_closed flag in localStorage so the notice does not keep appearing."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ការជូនដំណឹងនេះគឺសម្រាប់តែព័ត៌មានប៉ុណ្ណោះ ហើយមិនរួមបញ្ចូលការគ្រប់គ្រងចំណូលចិត្តខូឃីឡើយ។"
            : "The notice is informational only and does not include cookie preference controls."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ការវិភាគស្ថិតិ (Analytics)" : "Analytics" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork ប្រើប្រាស់ Vercel Web Analytics ដើម្បីយល់ដឹងពីការប្រើប្រាស់គេហទំព័រ និងកែលម្អស្ថិរភាព។ Vercel Web Analytics ត្រូវបានរចនាឡើងដើម្បីរក្សាទុកទិន្នន័យអនាមិក និងមិនប្រើខូឃីឡើយ។"
            : "ChlatWork uses Vercel Web Analytics to understand site usage and improve reliability. Vercel Web Analytics is designed to store anonymized data and does not use cookies."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork ក៏បានដំឡើង Google tag ជាមួយ Consent Mode ផងដែរ។ ការផ្ទុកទិន្នន័យវិភាគ និងការផ្សាយពាណិជ្ជកម្មត្រូវបានបដិសេធតាមលំនាំដើម។ Google tag អាចទទួលសញ្ញាស្ថានភាពយល់ព្រមដោយមិនចាំបាច់សរសេរខូឃីឡើយ។ ការផ្ទុកទិន្នន័យត្រូវបានបើកដំណើរការតែបន្ទាប់ពីមានការយល់ព្រមត្រឹមត្រូវប៉ុណ្ណោះ។"
            : "ChlatWork also installs the Google tag with Consent Mode. Analytics and advertising storage are denied by default. The tag can receive a consent-state signal without writing analytics or advertising cookies; storage is enabled only after an integrated consent platform sends an appropriate update."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ខូឃីផ្សាយពាណិជ្ជកម្ម (Advertising cookies)" : "Advertising cookies" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ChlatWork អាចប្រើដៃគូផ្សាយពាណិជ្ជកម្មភាគីទីបី។ ក្រុមហ៊ុនទាំងនោះអាចប្រើខូឃី វេបប៊ីខន អាសយដ្ឋាន IP ឬឧបករណ៍កំណត់អត្តសញ្ញាណដទៃទៀត ដើម្បីផ្ដល់ការផ្សាយពាណិជ្ជកម្ម កម្រិតការផ្សាយដដែលៗ វាស់វែងប្រសិទ្ធភាព ការពារការបន្លំ និងបង្ហាញការផ្សាយពាណិជ្ជកម្មផ្ទាល់ខ្លួន ឬទូទៅ។"
            : "ChlatWork may use third-party advertising partners. These vendors may use cookies, web beacons, IP addresses, or other identifiers to serve ads, measure ad performance, limit repeated ads, prevent fraud, and show personalized or non-personalized ads."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ការគ្រប់គ្រងខូឃី" : "Managing cookies" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer ? "អ្នកអាចទប់ស្កាត់ លុប ឬកំណត់កម្រិតខូឃីនៅក្នុងការកំណត់របស់កម្មវិធីរុករករបស់អ្នក។" : "You can block, delete, or limit cookies in your browser settings." }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer ? "ប្រសិនបើអ្នកបិទខូឃី ឬ local storage មុខងារមួយចំនួនរបស់ ChlatWork អាចនឹងមិនដំណើរការដូចការរំពឹងទុកនោះទេ។" : "If you disable cookies or local storage, some ChlatWork features may not work as expected." }}
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
      <h2 class="text-lg font-semibold">{{ isKhmer ? "តម្រូវការការយល់ព្រមតាមតំបន់" : "Regional consent requirements" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "តំបន់មួយចំនួន និងគោលការណ៍ផ្សព្វផ្សាយពាណិជ្ជកម្ម ទាមទារឱ្យមានការគ្រប់គ្រងការយល់ព្រមបន្ថែម មុនពេលខូឃី local storage ឬការផ្សាយពាណិជ្ជកម្មផ្ទាល់ខ្លួនត្រូវបានប្រើប្រាស់។ ដៃគូផ្សព្វផ្សាយអាចផ្ដល់ការគ្រប់គ្រងភាពឯកជនបន្ថែមនៅកន្លែងដែលតម្រូវការទាំងនោះអនុវត្ត។"
            : "Some regions and advertising policies require additional consent controls before certain cookies, local storage, or personalized ads are used. Advertising partners may provide additional privacy controls where those requirements apply."
        }}
      </p>
      <p class="text-gray-700 dark:text-white/75">
        {{
          isKhmer
            ? "ការបិទផ្ទាំងជូនដំណឹងអំពីខូឃីរបស់ ChlatWork មិនមែនជាការយល់ព្រមលើការផ្សាយពាណិជ្ជកម្មឡើយ។"
            : "Closing ChlatWork's informational cookie notice does not grant advertising consent."
        }}
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ isKhmer ? "ទំនាក់ទំនង" : "Contact" }}</h2>
      <p class="text-gray-700 dark:text-white/75">
        {{ isKhmer ? "ប្រសិនបើអ្នកមានចម្ងល់អំពីខូឃី សូមទាក់ទងមកយើងតាមរយៈ " : "If you have questions about cookies, please contact us through the " }}
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
