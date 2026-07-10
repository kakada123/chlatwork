<script setup lang="ts">
const sectionEl = ref<HTMLElement | null>(null);
useLandingReveal(sectionEl);
const { isKhmer } = useLanguage();

const heading = computed(() =>
  isKhmer.value ? "រៀបចំឲ្យប្រើបានលឿន។" : "Built for quick tasks.",
);
const benefits = computed(() =>
  isKhmer.value
    ? [
        {
          title: "ចូលទៅឧបករណ៍ដោយផ្ទាល់",
          description: "គ្រប់ card នាំទៅ tool route ដោយផ្ទាល់។",
        },
        {
          title: "ស្រួលប្រើលើទូរស័ព្ទ",
          description: "Search និង cards ត្រូវបានរៀបចំឲ្យឃើញលឿនលើអេក្រង់តូច។",
        },
        {
          title: "ដំណើរការក្នុង browser ពេលអាចធ្វើបាន",
          description: "ឧបករណ៍ឯកសារ និងរូបភាពជាច្រើនកាត់បន្ថយការរៀបចំបន្ថែម។",
        },
      ]
    : [
        {
          title: "Direct tool access",
          description:
            "Every card opens a real tool route without extra browsing.",
        },
        {
          title: "Mobile-first scanning",
          description:
            "Search and tool cards stay near the top on small screens.",
        },
        {
          title: "Browser-first workflows",
          description:
            "Many document and image tasks run in the browser where practical.",
        },
        {
          title: "Practical guides with local examples",
          description:
            "Guides focus on real Khmer-English and Cambodia workflow examples instead of generic filler text.",
        },
        {
          title: "Reviewed and updated content",
          description:
            "Policy and guide pages are updated when tool behavior or workflow requirements change.",
        },
      ],
);
</script>

<template>
  <section ref="sectionEl" class="py-8">
    <div class="mx-auto w-full">
      <div
        class="relative overflow-hidden rounded-[20px] border border-sky-100/80 bg-sky-50/45 p-4 shadow-sm shadow-sky-100/50 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/20"
        data-reveal
      >
        <div
          class="relative z-10 grid gap-4 lg:grid-cols-[0.55fr_1.45fr] lg:items-center"
        >
          <h2
            class="text-lg font-black text-slate-950 dark:text-white sm:text-xl"
          >
            {{ heading }}
          </h2>

          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <article
              v-for="(benefit, index) in benefits"
              :key="benefit.title"
              class="rounded-2xl border border-sky-100/80 bg-white/45 p-3 shadow-sm shadow-sky-100/40 dark:border-white/10 dark:bg-white/[0.08] dark:shadow-none"
              :style="{ '--reveal-delay': `${index * 60}ms` }"
            >
              <h3 class="text-sm font-black text-slate-950 dark:text-white">
                {{ benefit.title }}
              </h3>
              <p
                class="mt-1 text-xs leading-5 text-slate-600 dark:text-white/[0.62]"
              >
                {{ benefit.description }}
              </p>
            </article>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
