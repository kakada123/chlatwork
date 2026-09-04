<script setup lang="ts">
import { ArrowRight, Clapperboard, Languages, Sparkles } from "lucide-vue-next";
import { CREATOR_TOOLS, getCreatorToolsByCategory } from "~/data/creator-tools";
import { getCreatorCredits } from "~/services/creator-ai.service";

const { items: recentItems, refresh: refreshHistory } = useCreatorHistory();
const creditBalance = useState<number | null>("creator:credit-balance", () => null);
const createTools = getCreatorToolsByCategory("create");
const videoTools = getCreatorToolsByCategory("video");
const khmerTools = getCreatorToolsByCategory("khmer");
const repurposeTools = getCreatorToolsByCategory("repurpose");
const contentPack = CREATOR_TOOLS.find(
  (tool) => tool.id === "video-content-pack",
)!;

useSeoMeta({
  title: "ChlatWork Creator - AI Tools for Cambodian Creators",
  description:
    "Create posts, scripts, hooks, Khmer content, subtitles, and complete social content packs with ChlatWork Creator.",
  ogTitle: "ChlatWork Creator",
  ogDescription:
    "A focused AI content toolkit designed for Cambodian creators.",
  robots: "noindex, follow",
});

onMounted(async () => {
  await Promise.allSettled([
    refreshHistory(),
    getCreatorCredits().then(({ balance }) => {
      creditBalance.value = balance;
    }),
  ]);
});
</script>

<template>
  <main
    class="mx-auto w-full max-w-[1180px] space-y-7 text-slate-950 dark:text-white"
  >
    <header
      class="border-b border-slate-200 pb-5 dark:border-white/10 sm:flex sm:items-end sm:justify-between sm:gap-6 sm:pb-6"
    >
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-[0.14em] text-sky-600 dark:text-cyan-300"
        >
          ChlatWork Creator
        </p>
        <h1 class="mt-2 text-[#082552] dark:text-white">
          What do you want to create?
        </h1>
        <p
          class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-white/60"
        >
          Create platform-ready content and natural Khmer copy without learning
          complicated AI tools.
        </p>
      </div>
      <p class="mt-3 text-xs text-slate-400 dark:text-white/35 sm:mt-0">
        <template v-if="creditBalance !== null"
          >{{ creditBalance }} credits remaining</template
        >
        <template v-else>Sign in to generate · Credits verified by server</template>
      </p>
    </header>

    <section aria-labelledby="creator-create-title">
      <div class="flex items-center gap-2">
        <Sparkles
          class="size-5 text-sky-600 dark:text-cyan-300"
          aria-hidden="true"
        />
        <h2 id="creator-create-title" class="text-lg font-semibold">Create</h2>
      </div>
      <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <NuxtLink
          v-for="tool in createTools"
          :key="tool.id"
          :to="tool.route"
          class="mobile-pressable group flex min-h-28 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/35 dark:hover:bg-white/[0.08]"
        >
          <span
            class="tool-icon-tone tool-icon-tone-blue grid size-10 place-items-center rounded-xl"
            aria-hidden="true"
            ><CreatorIcon :name="tool.icon" class="size-5"
          /></span>
          <span class="mt-4 flex items-end justify-between gap-2">
            <span
              class="text-sm font-semibold text-[#082552] dark:text-white"
              >{{ tool.shortTitle }}</span
            >
            <ArrowRight
              class="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-sky-600 dark:text-white/35 dark:group-hover:text-cyan-300"
              aria-hidden="true"
            />
          </span>
        </NuxtLink>
      </div>
    </section>

    <section aria-labelledby="creator-video-title">
      <div class="flex items-end justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <Clapperboard
              class="size-5 text-violet-600 dark:text-violet-300"
              aria-hidden="true"
            />
            <h2 id="creator-video-title" class="text-lg font-semibold">
              Video AI
            </h2>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-white/45">
            Upload once. Turn the useful parts into content.
          </p>
        </div>
      </div>

      <NuxtLink
        :to="contentPack.route"
        class="mobile-pressable group mt-3 block rounded-3xl border border-violet-200 bg-white p-4 shadow-sm transition hover:border-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-300/20 dark:bg-white/[0.06] dark:hover:border-violet-300/40 sm:p-5"
      >
        <div class="flex items-start gap-4">
          <span
            class="tool-icon-tone tool-icon-tone-violet grid size-12 shrink-0 place-items-center rounded-2xl"
            aria-hidden="true"
            ><CreatorIcon :name="contentPack.icon" class="size-6"
          /></span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3
                class="text-base font-semibold text-[#082552] dark:text-white"
              >
                Video → Content Pack
              </h3>
              <span
                class="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800 dark:bg-amber-300/15 dark:text-amber-200"
                >Flagship</span
              >
            </div>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/60">
              Get Khmer subtitles, captions, hooks, hashtags, a title, CTA, and
              summary from one video.
            </p>
            <span
              class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 dark:text-violet-200"
              >Build a content pack
              <ArrowRight
                class="size-4 transition group-hover:translate-x-0.5"
                aria-hidden="true"
            /></span>
          </div>
        </div>
      </NuxtLink>

      <div class="mt-3 grid gap-2 sm:grid-cols-3">
        <NuxtLink
          v-for="tool in videoTools.filter((item) => !item.featured)"
          :key="tool.id"
          :to="tool.route"
          class="mobile-pressable flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-violet-300/30"
        >
          <span
            class="tool-icon-tone tool-icon-tone-violet grid size-10 shrink-0 place-items-center rounded-xl"
            aria-hidden="true"
            ><CreatorIcon :name="tool.icon" class="size-5"
          /></span>
          <span class="min-w-0"
            ><strong
              class="block truncate text-sm text-slate-900 dark:text-white"
              >{{ tool.shortTitle }}</strong
            ><span
              class="mt-1 block truncate text-xs text-slate-500 dark:text-white/45"
              >{{ tool.submitLabel }}</span
            ></span
          >
        </NuxtLink>
      </div>
    </section>

    <div class="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="creator-khmer-title">
        <div class="flex items-center gap-2">
          <Languages
            class="size-5 text-emerald-600 dark:text-emerald-300"
            aria-hidden="true"
          />
          <h2 id="creator-khmer-title" class="text-lg font-semibold">
            Khmer AI
          </h2>
        </div>
        <div
          class="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.05]"
        >
          <NuxtLink
            v-for="(tool, index) in khmerTools"
            :key="tool.id"
            :to="tool.route"
            class="mobile-pressable flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-emerald-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:hover:bg-emerald-300/[0.06]"
            :class="
              index ? 'border-t border-slate-200 dark:border-white/10' : ''
            "
          >
            <span
              class="tool-icon-tone tool-icon-tone-emerald grid size-10 shrink-0 place-items-center rounded-xl"
              aria-hidden="true"
              ><CreatorIcon :name="tool.icon" class="size-5"
            /></span>
            <span class="min-w-0 flex-1"
              ><strong class="block text-sm text-slate-900 dark:text-white">{{
                tool.shortTitle
              }}</strong
              ><span
                class="mt-1 block truncate text-xs text-slate-500 dark:text-white/45"
                >{{ tool.description }}</span
              ></span
            >
            <ArrowRight
              class="size-4 shrink-0 text-slate-400 dark:text-white/30"
              aria-hidden="true"
            />
          </NuxtLink>
        </div>
      </section>

      <section aria-labelledby="creator-repurpose-title">
        <div class="flex items-center gap-2">
          <CreatorIcon
            name="repurpose"
            class="size-5 text-amber-600 dark:text-amber-300"
            aria-hidden="true"
          />
          <h2 id="creator-repurpose-title" class="text-lg font-semibold">
            Repurpose
          </h2>
        </div>
        <div class="mt-3 grid gap-2">
          <NuxtLink
            v-for="tool in repurposeTools"
            :key="tool.id"
            :to="tool.route"
            class="mobile-pressable flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-amber-300 hover:bg-amber-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-amber-300/30 dark:hover:bg-amber-300/[0.06]"
          >
            <span
              class="tool-icon-tone tool-icon-tone-amber grid size-10 shrink-0 place-items-center rounded-xl"
              aria-hidden="true"
              ><CreatorIcon :name="tool.icon" class="size-5"
            /></span>
            <span class="min-w-0 flex-1"
              ><strong class="block text-sm text-slate-900 dark:text-white">{{
                tool.shortTitle
              }}</strong
              ><span
                class="mt-1 block truncate text-xs text-slate-500 dark:text-white/45"
                >{{ tool.description }}</span
              ></span
            >
            <ArrowRight
              class="size-4 shrink-0 text-slate-400 dark:text-white/30"
              aria-hidden="true"
            />
          </NuxtLink>
        </div>
      </section>
    </div>

    <section aria-labelledby="creator-recent-title">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h2 id="creator-recent-title" class="text-lg font-semibold">
            Recent generations
          </h2>
          <p class="mt-1 text-xs text-slate-500 dark:text-white/45">
            Saved securely to your ChlatWork account for 30 days.
          </p>
        </div>
      </div>
      <div
        v-if="recentItems.length"
        class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      >
        <NuxtLink
          v-for="item in recentItems"
          :key="item.id"
          :to="item.route"
          class="rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-sky-300 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/30"
          ><p class="text-sm font-semibold text-slate-900 dark:text-white">
            {{ item.title }}
          </p>
          <p
            class="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-white/45"
          >
            {{ item.preview }}
          </p></NuxtLink
        >
      </div>
      <div
        v-else
        class="mt-3 rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-white/15"
      >
        <p class="text-sm text-slate-500 dark:text-white/50">
          Your latest Creator results will appear here.
        </p>
        <NuxtLink
          to="/creator/create/hook"
          class="mt-2 inline-flex text-sm font-semibold text-sky-700 dark:text-cyan-300"
          >Try the quick Hook Generator</NuxtLink
        >
      </div>
    </section>
  </main>
</template>
