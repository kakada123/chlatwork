<script setup lang="ts">
const sectionEl = ref<HTMLElement | null>(null);
useLandingReveal(sectionEl);
const { isKhmer } = useLanguage();

const heading = computed(() =>
  isKhmer.value
    ? "ឧបករណ៍មានប្រយោជន៍ ដោយមិនស្មុគស្មាញ។"
    : "Useful tools without unnecessary friction.",
);
const eyebrow = computed(() =>
  isKhmer.value ? "ហេតុអ្វីប្រើ ChlatWork?" : "Why use ChlatWork?",
);
const reasons = computed(() =>
  isKhmer.value
    ? [
        {
          title: "សាមញ្ញ និងលឿន",
          description:
            "ឧបករណ៍នីមួយៗផ្តោតលើការងារមួយច្បាស់ៗ ដើម្បីឲ្យអ្នកធ្វើការងារឲ្យរួចដោយមិនចាំបាច់រៀបចំច្រើន។",
        },
        {
          title: "ប្រើបានលើទូរស័ព្ទ និងកុំព្យូទ័រ",
          description:
            "Layout ត្រូវបានរៀបចំសម្រាប់ទូរស័ព្ទ tablet laptop និងអេក្រង់ការិយាល័យ។",
        },
        {
          title: "គិតពីភាពឯកជន",
          description:
            "ឧបករណ៍ជាច្រើនដំណើរការឯកសារ ឬ input នៅក្នុង browser របស់អ្នកនៅពេលអាចធ្វើបាន។",
        },
        {
          title: "មិនចាំបាច់ signup សម្រាប់ការងារមូលដ្ឋាន",
          description:
            "ឧបករណ៍មូលដ្ឋានអាចបើកប្រើបានភ្លាមៗ ដោយមិនបង្ខំឲ្យបង្កើតគណនី។",
        },
      ]
    : [
        {
          title: "Simple and fast",
          description:
            "Each tool focuses on one clear task so you can finish work without extra setup.",
        },
        {
          title: "Works on mobile and desktop",
          description:
            "Layouts are built for phones, tablets, laptops, and everyday office screens.",
        },
        {
          title: "Privacy-friendly tools",
          description:
            "Many tools process files or input in your browser where possible, especially for common PDF and image tasks.",
        },
        {
          title: "No unnecessary signup",
          description:
            "Basic tools are available directly, without forcing an account before simple work.",
        },
      ],
);
</script>

<template>
  <section ref="sectionEl" class="px-5 py-14 sm:px-8 lg:px-12">
    <div class="mx-auto max-w-7xl">
      <div class="max-w-2xl" data-reveal>
        <p class="text-sm font-semibold uppercase text-sky-600 dark:text-cyan-300">
          {{ eyebrow }}
        </p>
        <h2 class="mt-3 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
          {{ heading }}
        </h2>
      </div>

      <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="(reason, index) in reasons"
          :key="reason.title"
          class="rounded-[22px] border border-white/80 bg-white/75 p-5 shadow-lg shadow-sky-100/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20"
          data-reveal
          :style="{ '--reveal-delay': `${index * 70}ms` }"
        >
          <h3 class="text-base font-black text-slate-950 dark:text-white">
            {{ reason.title }}
          </h3>
          <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-white/62">
            {{ reason.description }}
          </p>
        </article>
      </div>
    </div>
  </section>
</template>
