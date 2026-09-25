<script setup lang="ts">
const payouts = [
  { dice: "1 រូបត្រូវ", multiplier: "1×", detail: "ទទួលពិន្ទុដែលដាក់វិញ + ឈ្នះ 1×" },
  { dice: "2 រូបត្រូវ", multiplier: "2×", detail: "ទទួលពិន្ទុដែលដាក់វិញ + ឈ្នះ 2×" },
  { dice: "3 រូបត្រូវ", multiplier: "3×", detail: "ទទួលពិន្ទុដែលដាក់វិញ + ឈ្នះ 3×" },
];
</script>

<template>
  <section id="kla-klok-rules" class="px-5 py-14 sm:px-10 lg:px-16">
    <div class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Rules</p>
        <h2 class="mt-3 text-2xl font-bold text-white sm:text-3xl">របៀបគិតពិន្ទុ</h2>
        <p class="mt-4 max-w-xl text-sm leading-7 text-white/60">
          ដាក់ពិន្ទុលើរូបដែលអ្នកជ្រើសរើស រួចចាក់គ្រាប់បី។ បើរូបរបស់អ្នកចេញ អ្នកទទួលពិន្ទុដែលដាក់លើរូបនោះវិញ ហើយឈ្នះបន្ថែមតាមចំនួនគ្រាប់ដែលត្រូវគ្នា។
        </p>
        <p class="mt-3 max-w-xl text-sm leading-7 text-white/45">
          Select symbols and roll three dice. Each matching die awards the selected point value, and a matched symbol’s stake is returned.
        </p>
      </div>

      <div class="overflow-hidden rounded-2xl border border-white/10 bg-[#0e2138]">
        <div
          v-for="payout in payouts"
          :key="payout.multiplier"
          class="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-white/10 p-4 last:border-b-0 sm:p-5"
        >
          <div>
            <strong class="block text-sm text-white">{{ payout.dice }}</strong>
            <span class="mt-1 block text-xs leading-5 text-white/50">{{ payout.detail }}</span>
          </div>
          <span class="rounded-xl bg-amber-300/15 px-4 py-2 text-xl font-black text-amber-300">{{ payout.multiplier }}</span>
        </div>
        <div class="border-t border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100 sm:p-5">
          ឧទាហរណ៍៖ បើខ្លាចេញ ២ គ្រាប់ រូបខ្លាឈ្នះ <strong class="text-amber-300">2×</strong> និងទទួលពិន្ទុដែលដាក់លើខ្លាវិញ។
        </div>
      </div>
    </div>
  </section>
</template>
