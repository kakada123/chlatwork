<template>
  <div class="mx-auto w-full max-w-[1440px] text-slate-950 dark:text-white">
    <div
      class="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
    >
      <div class="max-w-3xl">
        <p class="text-sm font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-cyan-300">
          Free · Private · No sign-in
        </p>
        <h1 class="mt-2 text-2xl font-black leading-tight sm:text-3xl">Random Winner Picker</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-white/60 sm:text-base">
          Paste your participants, spin the lucky draw wheel, and pick fair winners with no repeats.
          Everything runs in your browser.
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] sm:w-auto"
          @click="reset"
        >
          Reset
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5">
        <div class="mb-2 flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-cyan-300">Step 1</p>
            <h2 class="mt-1 text-lg font-bold">Add participants</h2>
          </div>

          <div class="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200">
            {{ participants.length }} {{ participants.length === 1 ? "person" : "people" }}
          </div>
        </div>

        <label for="lucky-draw-paste" class="mt-5 block text-sm font-semibold">Paste a list</label>
        <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-white/50">
          Use one name per line, or separate names with commas.
        </p>
        <textarea
          id="lucky-draw-paste"
          v-model="raw"
          class="mt-2 h-32 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-black/20 dark:placeholder:text-white/30"
          :disabled="isSpinning"
          placeholder="Vann Mey&#10;Sokha Lim&#10;Sophea Kim&#10;Nita Phan"
        />
        <button
          type="button"
          class="mt-2 inline-flex h-10 items-center justify-center rounded-xl bg-sky-700 px-4 text-sm font-bold text-white transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="isSpinning || !raw.trim()"
          @click="applyRawToRows"
        >
          Use this list
        </button>

        <div
          v-if="duplicateNames.length"
          class="mt-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{{ duplicateNames.length }} duplicate {{ duplicateNames.length === 1 ? "name" : "names" }} found.</span>
          <button type="button" class="font-bold underline underline-offset-4" :disabled="isSpinning" @click="removeDuplicates">
            Remove duplicates
          </button>
        </div>

        <div class="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-white/35">
          <span class="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          Or edit individually
          <span class="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        </div>

        <div class="max-h-[390px] overflow-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table class="w-full text-sm">
            <thead class="sticky top-0 z-10 bg-slate-50 dark:bg-[#17171b]">
              <tr>
                <th class="w-[85%] p-2 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-white/45">Name</th>
                <th class="w-[15%] p-2"></th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, index) in rows"
                :key="index"
                class="align-top border-t border-slate-200 dark:border-white/10"
              >
                <td class="p-2">
                  <input
                    :ref="(element) => setNameInputRef(element, index)"
                    v-model.trim="row.name"
                    class="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-white/15 dark:bg-black/20 dark:disabled:bg-white/[0.03] dark:disabled:text-white/35"
                    :placeholder="`Participant ${index + 1}`"
                    :disabled="isSpinning"
                  />
                </td>

                <td class="p-2 text-right">
                  <button
                    class="rounded-lg border border-slate-200 px-2 py-2 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-white/50 dark:hover:border-red-300/20 dark:hover:bg-red-300/10 dark:hover:text-red-200"
                    @click="removeRow(index)"
                    :aria-label="`Remove row ${index + 1}`"
                    :disabled="isSpinning"
                  >
                    ✕
                  </button>
                </td>
              </tr>

              <tr v-if="rows.length === 0">
                <td colspan="2" class="p-3 text-slate-500 dark:text-white/45">
                  No participants yet. Click “Add row”.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            @click="addRow"
            :disabled="isSpinning"
          >
            <span class="text-base leading-none">＋</span>
            <span class="truncate">Add row</span>
          </button>

          <button
            class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            @click="loadExample"
            :disabled="isSpinning"
          >
            <span class="truncate">Load example</span>
          </button>

        </div>

        <p v-if="error" class="mt-3 text-sm font-medium text-red-600 dark:text-red-300">{{ error }}</p>
        <p class="mt-4 text-xs leading-5 text-slate-500 dark:text-white/45">
          Participants, notes, and winner history are saved only in this browser. Avoid sensitive personal details on shared devices.
        </p>
      </div>

      <div
        ref="wheelStageRef"
        class="wheel-stage"
        :class="[wheelCardClass, { 'has-results': winnerHistory.length > 0 }]"
      >
        <canvas
          ref="confettiCanvasRef"
          class="pointer-events-none inset-0 z-[140] h-full w-full"
          :class="isWinnerDialogOpen ? 'fixed' : 'absolute'"
        />

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="opacity-0"
        >
          <div
            v-if="isWinnerDialogOpen && currentWinnerEntry"
            class="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            @click.self="closeWinnerDialog"
          >
            <div
              ref="winnerDialogRef"
              role="dialog"
              aria-modal="true"
              aria-label="Lucky draw winner"
              class="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl outline-none dark:border-white/15 dark:bg-[#101014] sm:p-8"
              @keydown.esc.prevent="closeWinnerDialog"
              @keydown="keepWinnerDialogFocusInside"
            >
              <button
                ref="winnerDialogCloseRef"
                type="button"
                class="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close winner dialog"
                @click="closeWinnerDialog"
              >
                ✕
              </button>

              <LuckyDrawWinnerResult
                class="pt-5"
                :winner="currentWinnerEntry.name"
                :note="currentWinnerEntry.note"
                :winner-copied="winnerCopied"
                :can-spin="canSpin"
                @copy="copyWinner"
                @spin-again="runLuckyDraw"
              />
            </div>
          </div>
        </Transition>

        <div class="wheel-stage-content relative z-10 flex h-full min-h-0 flex-col">
          <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-cyan-300">Step 2</p>
              <h2 class="mt-1 text-lg font-bold">Spin the wheel</h2>

              <div class="mt-1 text-sm text-slate-500 dark:text-white/50">
                {{ spinStatus }}
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                :aria-label="soundEnabled ? 'Mute wheel sounds' : 'Enable wheel sounds'"
                :title="soundEnabled ? 'Mute sounds' : 'Enable sounds'"
                @click="soundEnabled = !soundEnabled"
              >
                {{ soundEnabled ? "🔊" : "🔇" }}
              </button>

              <button
                v-if="isFullscreenSupported"
                class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                @click="toggleWheelFullscreen"
                :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
                :title="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
              >
                <svg
                  v-if="!isFullscreen"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                  <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>

                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 3H5v4" />
                  <path d="M15 3h4v4" />
                  <path d="M9 21H5v-4" />
                  <path d="M15 21h4v-4" />
                </svg>
              </button>
            </div>
          </div>

          <div
            :class="isFullscreen ? 'mb-3 w-fit max-w-full' : 'mb-4 w-full'"
            class="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.03]"
          >
            <label class="flex items-center gap-2 font-semibold">
              <input v-model="preventRepeatWinners" type="checkbox" class="h-4 w-4 accent-sky-600" :disabled="isSpinning">
              No repeat winners
            </label>
            <label class="flex items-center gap-2 font-semibold">
              <input v-model="showWinnerDialog" type="checkbox" class="h-4 w-4 accent-sky-600" :disabled="isSpinning">
              Show winner in dialog
            </label>
            <label class="flex items-center gap-2 font-semibold">
              Spin speed
              <select
                v-model="spinSpeed"
                class="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-sky-400 dark:border-white/15 dark:bg-[#17171b]"
                :disabled="isSpinning"
              >
                <option value="quick">Quick</option>
                <option value="standard">Standard</option>
                <option value="suspense">Suspense</option>
              </select>
            </label>
            <label class="flex min-w-[min(100%,18rem)] flex-1 items-center gap-2 font-semibold">
              <span class="shrink-0">Note for this spin</span>
              <input
                v-model="drawNote"
                type="text"
                maxlength="120"
                class="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-[#17171b] dark:text-white dark:placeholder:text-white/30"
                placeholder="e.g. Do an exercise"
                :disabled="isSpinning"
              >
            </label>
          </div>

          <div
            class="wheel-layout"
            :class="
              isFullscreen
                ? 'grid min-h-0 flex-1 grid-rows-[auto_auto] gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:grid-rows-1 lg:gap-4'
                : 'flex min-h-0 flex-1 flex-col'
            "
          >
            <div class="wheel-column flex min-h-0 flex-col">
              <div class="wheel-space flex min-h-0 flex-1 items-center justify-center">
                <div
                  class="wheel-box relative mx-auto aspect-square w-full shrink-0"
                >
                  <div class="absolute left-1/2 top-0 z-30 -translate-x-1/2">
                    <div
                      class="h-0 w-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-slate-950 drop-shadow-sm dark:border-t-white"
                    />
                  </div>

                <div
                  class="relative h-full w-full overflow-hidden rounded-full border-[10px] border-white bg-slate-50 shadow-xl dark:border-[#222227] dark:bg-white/[0.04]"
                >
                  <svg
                    viewBox="0 0 100 100"
                    class="h-full w-full"
                    aria-label="Lucky draw wheel"
                  >
                    <g :transform="`rotate(${wheelRotation} 50 50)`">
                      <template v-if="wheelSegments.length > 0">
                        <path
                          v-for="segment in wheelSegments"
                          :key="segment.index"
                          :d="segment.path"
                          :fill="segment.color"
                          stroke="#ffffff"
                          stroke-width="0.8"
                        />

                        <g
                          v-for="segment in wheelSegments"
                          :key="`label-${segment.index}`"
                          :transform="`translate(${segment.labelX} ${segment.labelY}) rotate(${segment.textRotation})`"
                        >
                          <text
                            text-anchor="middle"
                            dominant-baseline="middle"
                            fill="#ffffff"
                            stroke="rgba(0,0,0,0.24)"
                            stroke-width="0.34"
                            paint-order="stroke"
                            font-weight="700"
                            :font-size="wheelLabelFontSize"
                            style="letter-spacing: 0"
                          >
                            <tspan
                              v-for="(line, lineIndex) in segment.labelLines"
                              :key="`${segment.index}-${lineIndex}`"
                              x="0"
                              :dy="
                                getLabelLineDy(
                                  lineIndex,
                                  segment.labelLines.length,
                                )
                              "
                            >
                              {{ line }}
                            </tspan>
                          </text>
                        </g>
                      </template>

                      <circle
                        cx="50"
                        cy="50"
                        r="15"
                        fill="rgba(255,255,255,0.96)"
                        stroke="#e5e7eb"
                        stroke-width="1"
                      />
                    </g>
                  </svg>

                  <div
                    class="absolute inset-0 flex items-center justify-center"
                  >
                    <button
                      class="inline-flex h-20 w-20 items-center justify-center rounded-full bg-sky-700 text-sm font-black tracking-wide text-white shadow-lg ring-4 ring-sky-200/70 transition hover:scale-105 hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 dark:bg-cyan-300 dark:text-slate-950 dark:ring-cyan-300/20 dark:hover:bg-cyan-200"
                      :disabled="!canSpin"
                      @click="runLuckyDraw"
                    >
                      {{ isSpinning ? "..." : "SPIN" }}
                    </button>
                  </div>
                  </div>
                </div>
              </div>

              <p
                :class="isFullscreen ? 'mt-2' : 'mt-4'"
                class="wheel-note text-center text-xs leading-5 text-slate-500 dark:text-white/45"
              >
                Secure browser randomness chooses the winner before the wheel animates.
              </p>
            </div>

            <div
              :class="[
                isFullscreen
                  ? 'rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03] lg:min-h-0 lg:overflow-y-auto lg:p-4'
                  : '',
                isFullscreen && winnerHistory.length === 0 ? 'hidden lg:block' : '',
              ]"
            >
              <LuckyDrawWinnerResult
                v-if="lastWinner && !showWinnerDialog"
                class="mt-3 overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 p-4 text-center dark:border-cyan-300/20 dark:from-sky-300/10 dark:to-cyan-300/10"
                :winner="lastWinner"
                :note="currentWinnerEntry?.note ?? ''"
                :winner-copied="winnerCopied"
                :can-spin="canSpin"
                @copy="copyWinner"
                @spin-again="runLuckyDraw"
              />

            <div v-if="winnerHistory.length" class="mt-4 rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-bold">Winner history</h3>
                <div class="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-50 dark:border-white/15 dark:text-cyan-200 dark:hover:bg-white/[0.06]"
                    @click="copyWinnerList"
                  >
                    {{ winnerListCopied ? "List copied" : "Copy list" }}
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-50 dark:border-white/15 dark:text-cyan-200 dark:hover:bg-white/[0.06]"
                    @click="exportWinnerList"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    class="px-1.5 py-1.5 text-xs font-bold text-slate-500 underline underline-offset-4 hover:text-red-600 dark:text-white/45 dark:hover:text-red-300"
                    @click="clearWinnerHistory"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <ol
                :class="isFullscreen ? 'max-h-32 lg:max-h-48' : 'max-h-48'"
                class="mt-2 space-y-2 overflow-auto pr-1"
              >
                <li v-for="(winner, index) in winnerHistory" :key="`${winner.name}-${index}`" class="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-white/[0.04]">
                  <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-100 text-xs font-black text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200">{{ index + 1 }}</span>
                  <div class="min-w-0 flex-1">
                    <span class="block truncate font-semibold">{{ winner.name }}</span>
                    <span v-if="winner.note" class="mt-1 block break-words text-xs text-slate-600 dark:text-white/55">
                      {{ winner.note }}
                    </span>
                  </div>
                </li>
              </ol>
              </div>

            <div
              :class="
                isFullscreen
                  ? 'mt-4 hidden lg:block'
                  : 'mt-4 max-h-64 overflow-auto'
              "
            >
              <h3 class="mb-2 font-semibold">On this wheel</h3>

              <div
                v-if="participants.length === 0"
                class="text-sm text-slate-500 dark:text-white/45"
              >
                No participants yet.
              </div>

              <div
                v-else
                :class="isFullscreen ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'"
                class="grid gap-2"
              >
                <div
                  v-for="segment in wheelSegments"
                  :key="`${segment.index}-${segment.name}`"
                  class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <span
                    class="h-3 w-3 shrink-0 rounded-full"
                    :style="{ backgroundColor: segment.color }"
                  />
                  <span class="truncate">{{ segment.name }}</span>
                </div>
              </div>
            </div>
            </div>

            <p class="sr-only" aria-live="polite">
              {{ lastWinner ? `Winner is ${lastWinner}` : "No winner yet" }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import type { LuckyDrawSession, WinnerHistoryEntry } from "~/lib/lucky-draw";
import LuckyDrawWinnerResult from "~/components/tools/LuckyDrawWinnerResult.vue";
import {
  deduplicateParticipants,
  findDuplicateParticipantNames,
  formatWinnerListCsv,
  formatWinnerListText,
  getEligibleParticipants,
  normalizeParticipantName,
  parseLuckyDrawSession,
  parseParticipantText,
} from "~/lib/lucky-draw";
import { secureRandomInt } from "~/lib/secure-random";

type InputRow = {
  name: string;
};

type WheelSegment = {
  index: number;
  name: string;
  color: string;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  path: string;
  labelX: number;
  labelY: number;
  textRotation: number;
  labelLines: string[];
};

type ConfettiLauncher = ((options?: Record<string, unknown>) => unknown) | null;
type SpinSpeed = "quick" | "standard" | "suspense";

useSeoMeta({
  title: "Random Winner Picker and Lucky Draw Wheel | ChlatWork",
  description:
    "Paste participants, remove duplicates, spin the lucky draw wheel, and pick random winners without repeats. Free, private, and no sign-in required.",
  ogTitle: "Random Winner Picker and Lucky Draw Wheel | ChlatWork",
  ogDescription:
    "Pick fair, no-repeat winners with a private visual wheel for giveaways, events, classrooms, and staff activities.",
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterTitle: "Random Winner Picker and Lucky Draw Wheel | ChlatWork",
  twitterDescription:
    "Paste names, spin the wheel, and pick no-repeat winners privately in your browser.",
});

useHead({
  link: [
    {
      rel: "canonical",
      href: "https://chlatwork.com/tools/lucky-draw",
    },
  ],
});

const INITIAL_ROWS = (): InputRow[] => [
  { name: "" },
  { name: "" },
  { name: "" },
];

const SEGMENT_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
];

const SPIN_DURATION_MS: Record<SpinSpeed, number> = {
  quick: 2800,
  standard: 5200,
  suspense: 8200,
};
const FULL_TURNS = 12;
const WHEEL_CENTER = 50;
const WHEEL_RADIUS = 49;
const LUCKY_DRAW_SESSION_STORAGE_KEY = "chlatwork:lucky-draw:session:v1";
const DIALOG_CONFETTI_COLORS = ["#0ea5e9", "#22d3ee", "#facc15", "#fb7185", "#ffffff"];

const rows = ref<InputRow[]>(INITIAL_ROWS());
const raw = ref("");
const error = ref("");
const isSpinning = ref(false);
const wheelRotation = ref(0);
const lastWinner = ref("");
const isFullscreen = ref(false);
const activeWheelParticipants = ref<string[]>([]);
const preventRepeatWinners = ref(true);
const showWinnerDialog = ref(false);
const isWinnerDialogOpen = ref(false);
const soundEnabled = ref(true);
const spinSpeed = ref<SpinSpeed>("standard");
const drawNote = ref("");
const winnerHistory = ref<WinnerHistoryEntry[]>([]);
const winnerCopied = ref(false);
const winnerListCopied = ref(false);

const nameInputRefs = ref<(HTMLInputElement | null)[]>([]);
const wheelStageRef = ref<HTMLElement | null>(null);
const confettiCanvasRef = ref<HTMLCanvasElement | null>(null);
const winnerDialogRef = ref<HTMLDivElement | null>(null);
const winnerDialogCloseRef = ref<HTMLButtonElement | null>(null);
const audioContext = ref<AudioContext | null>(null);

let winnerCopyTimer: ReturnType<typeof setTimeout> | null = null;
let winnerListCopyTimer: ReturnType<typeof setTimeout> | null = null;
let spinAnimationFrameId: number | null = null;
let confettiLauncher: ConfettiLauncher = null;
let spinRunId = 0;
let previouslyFocusedElement: HTMLElement | null = null;
let previousBodyOverflow = "";
let previousWheelStageOverflow = "";
let canPersistSession = false;
let isHydratingSession = true;
let isWinnerDialogEnvironmentLocked = false;

function normalizeName(value: string) {
  return normalizeParticipantName(value);
}

function parseRows(inputRows: InputRow[]) {
  return inputRows.map((row) => normalizeName(row.name ?? "")).filter(Boolean);
}

function parseLines(input: string) {
  return parseParticipantText(input);
}

function buildLuckyDrawSession(): LuckyDrawSession {
  return {
    version: 1,
    rows: rows.value.map((row) => row.name),
    raw: raw.value,
    preventRepeatWinners: preventRepeatWinners.value,
    showWinnerDialog: showWinnerDialog.value,
    soundEnabled: soundEnabled.value,
    spinSpeed: spinSpeed.value,
    drawNote: drawNote.value,
    winnerHistory: winnerHistory.value.map((winner) => ({ ...winner })),
    lastWinner: lastWinner.value,
  };
}

function persistLuckyDrawSession() {
  if (!import.meta.client || !canPersistSession) return;

  try {
    localStorage.setItem(
      LUCKY_DRAW_SESSION_STORAGE_KEY,
      JSON.stringify(buildLuckyDrawSession()),
    );
  } catch {
    // The draw remains fully usable when private browsing or storage limits block persistence.
  }
}

function restoreLuckyDrawSession() {
  if (!import.meta.client) return false;

  try {
    const storedValue = localStorage.getItem(LUCKY_DRAW_SESSION_STORAGE_KEY);
    if (!storedValue) return false;

    const session = parseLuckyDrawSession(storedValue);
    if (!session) return false;

    rows.value = session.rows.length
      ? session.rows.map((name) => ({ name }))
      : INITIAL_ROWS();
    raw.value = session.raw;
    preventRepeatWinners.value = session.preventRepeatWinners;
    showWinnerDialog.value = session.showWinnerDialog;
    soundEnabled.value = session.soundEnabled;
    spinSpeed.value = session.spinSpeed;
    drawNote.value = session.drawNote;
    winnerHistory.value = session.winnerHistory.map((winner) => ({ ...winner }));

    const latestWinner = winnerHistory.value.at(-1);
    lastWinner.value = latestWinner?.name === session.lastWinner
      ? session.lastWinner
      : "";
    isWinnerDialogOpen.value = Boolean(
      showWinnerDialog.value && lastWinner.value,
    );
    return true;
  } catch {
    return false;
  }
}

function closeWinnerDialog() {
  isWinnerDialogOpen.value = false;
}

function keepWinnerDialogFocusInside(event: KeyboardEvent) {
  if (event.key !== "Tab" || !winnerDialogRef.value) return;

  const focusable = Array.from(
    winnerDialogRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

function restoreWinnerDialogEnvironment(restoreFocus = true) {
  if (!import.meta.client || !isWinnerDialogEnvironmentLocked) return;

  document.body.style.overflow = previousBodyOverflow;
  if (wheelStageRef.value) {
    wheelStageRef.value.style.overflow = previousWheelStageOverflow;
  }

  const focusTarget = previouslyFocusedElement;
  previouslyFocusedElement = null;
  isWinnerDialogEnvironmentLocked = false;

  if (restoreFocus && focusTarget) {
    nextTick(() => focusTarget.focus());
  }
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
}

function splitNameForWheelLabel(
  value: string,
  maxCharsPerLine: number,
  maxLines = 3,
) {
  const words = normalizeName(value).split(" ").filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (word.length > maxCharsPerLine && !currentLine) {
      lines.push(truncateText(word, maxCharsPerLine));
      continue;
    }

    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxCharsPerLine) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine =
      word.length > maxCharsPerLine
        ? truncateText(word, maxCharsPerLine)
        : word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const visibleLines = lines.slice(0, maxLines - 1);
  const remaining = lines.slice(maxLines - 1).join(" ");
  visibleLines.push(truncateText(remaining, maxCharsPerLine));

  return visibleLines;
}

const participants = computed(() => parseRows(rows.value));

const duplicateNames = computed(() => {
  return findDuplicateParticipantNames(participants.value);
});

const previousWinnerNames = computed(() => {
  // Notes are history metadata; no-repeat eligibility must remain name-based.
  return winnerHistory.value.map((winner) => winner.name);
});

const eligibleParticipants = computed(() => {
  return getEligibleParticipants(
    participants.value,
    previousWinnerNames.value,
    preventRepeatWinners.value,
  );
});

const currentWinnerEntry = computed(() => {
  const entry = winnerHistory.value.at(-1);
  return entry?.name === lastWinner.value ? entry : null;
});

const wheelParticipants = computed(() => {
  return activeWheelParticipants.value.length
    ? activeWheelParticipants.value
    : eligibleParticipants.value;
});

const canSpin = computed(
  () => eligibleParticipants.value.length >= 2 && !isSpinning.value,
);

const spinStatus = computed(() => {
  if (isSpinning.value) return "Picking a winner…";
  if (participants.value.length < 2) return "Add at least 2 people";
  if (eligibleParticipants.value.length === 0) return "Everyone has already won";
  if (eligibleParticipants.value.length === 1) return "Only 1 undrawn participant remains";
  if (preventRepeatWinners.value && winnerHistory.value.length) {
    return `${eligibleParticipants.value.length} people remain`;
  }
  return "Ready to spin";
});

const segmentAngle = computed(() => {
  return getSegmentAngle(wheelParticipants.value.length);
});

const wheelLabelFontSize = computed(() => {
  const count = wheelParticipants.value.length;

  if (count <= 4) return 3.7;
  if (count <= 8) return 3.1;
  if (count <= 14) return 2.45;
  if (count <= 24) return 2.05;
  if (count <= 48) return 1.68;
  return 1.45;
});

const labelRadius = computed(() => {
  const count = wheelParticipants.value.length;

  if (count <= 4) return 31;
  if (count <= 8) return 34;
  if (count <= 18) return 37;
  return 39.5;
});

const labelMaxCharsPerLine = computed(() => {
  const count = wheelParticipants.value.length;

  if (count <= 4) return 14;
  if (count <= 8) return 16;
  if (count <= 18) return 18;
  if (count <= 48) return 19;
  return 16;
});

const labelMaxLines = computed(() => {
  const count = wheelParticipants.value.length;

  if (count <= 4) return 2;
  return 1;
});

const isFullscreenSupported = computed(() => {
  return import.meta.client && typeof document !== "undefined"
    ? document.fullscreenEnabled
    : false;
});

const wheelCardClass = computed(() => {
  return [
    "relative flex min-h-0 flex-col bg-white text-slate-950 dark:bg-[#101014] dark:text-white",
    isFullscreen.value
      ? "fixed inset-0 z-[120] overflow-hidden rounded-none border-0 p-4 sm:p-5 md:p-6"
      : "rounded-2xl border border-slate-200 p-4 shadow-sm dark:border-white/10 sm:p-5",
  ].join(" ");
});

function angleToPoint(angle: number, radius: number) {
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    x: WHEEL_CENTER + radius * Math.cos(radians),
    y: WHEEL_CENTER + radius * Math.sin(radians),
  };
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function getSegmentAngle(count: number) {
  return count > 0 ? 360 / count : 360;
}

function createSlicePath(startAngle: number, endAngle: number) {
  const start = angleToPoint(startAngle, WHEEL_RADIUS);
  const end = angleToPoint(endAngle, WHEEL_RADIUS);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${WHEEL_CENTER} ${WHEEL_CENTER}`,
    `L ${start.x} ${start.y}`,
    `A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function getTextRotation(midAngle: number) {
  let rotation = midAngle - 90;

  if (midAngle > 180 && midAngle < 360) {
    rotation += 180;
  }

  return rotation;
}

function getLabelLineDy(lineIndex: number, totalLines: number) {
  if (lineIndex === 0) {
    return `${-((totalLines - 1) * 0.58)}em`;
  }

  return "1.15em";
}

const wheelSegments = computed<WheelSegment[]>(() => {
  return wheelParticipants.value.map((name, index) => {
    const startAngle = index * segmentAngle.value;
    const endAngle = (index + 1) * segmentAngle.value;
    const midAngle = startAngle + segmentAngle.value / 2;
    const labelPoint = angleToPoint(midAngle, labelRadius.value);

    return {
      index,
      name,
      color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
      startAngle,
      endAngle,
      midAngle,
      path: createSlicePath(startAngle, endAngle),
      labelX: labelPoint.x,
      labelY: labelPoint.y,
      textRotation: getTextRotation(midAngle),
      labelLines: splitNameForWheelLabel(
        name,
        labelMaxCharsPerLine.value,
        labelMaxLines.value,
      ),
    };
  });
});

function setNameInputRef(
  element: Element | ComponentPublicInstance | null,
  index: number,
) {
  nameInputRefs.value[index] = element as HTMLInputElement | null;
}

async function focusRowNameInput(index: number) {
  await nextTick();
  nameInputRefs.value[index]?.focus();
}

async function addRow() {
  rows.value.push({ name: "" });
  await focusRowNameInput(rows.value.length - 1);
}

function removeRow(index: number) {
  rows.value.splice(index, 1);
  nameInputRefs.value.splice(index, 1);

  if (rows.value.length === 0) {
    rows.value = INITIAL_ROWS();
  }
}

function applyRawToRows() {
  error.value = "";

  const names = parseLines(raw.value);

  if (names.length === 0) {
    error.value = "Please paste at least one valid name.";
    return;
  }

  rows.value = names.map((name) => ({ name }));
  raw.value = names.join("\n");
  nameInputRefs.value = [];
}

function removeDuplicates() {
  const uniqueNames = deduplicateParticipants(participants.value);

  rows.value = uniqueNames.map((name) => ({ name }));
  raw.value = uniqueNames.join("\n");
  nameInputRefs.value = [];
}

function loadExample() {
  rows.value = [
    { name: "Vann Mey" },
    { name: "Sokha Lim" },
    { name: "Sophea Kim" },
    { name: "Nita Phan" },
    { name: "Rotha Chan" },
    { name: "Vichea Long" },
  ];
  raw.value = rows.value.map((row) => row.name).join("\n");
  error.value = "";
}

function reset() {
  spinRunId += 1;
  closeWinnerDialog();
  rows.value = INITIAL_ROWS();
  raw.value = "";
  error.value = "";
  isSpinning.value = false;
  wheelRotation.value = 0;
  lastWinner.value = "";
  activeWheelParticipants.value = [];
  drawNote.value = "";
  winnerHistory.value = [];
  winnerCopied.value = false;
  winnerListCopied.value = false;
  nameInputRefs.value = [];

  if (winnerCopyTimer) {
    clearTimeout(winnerCopyTimer);
    winnerCopyTimer = null;
  }

  if (winnerListCopyTimer) {
    clearTimeout(winnerListCopyTimer);
    winnerListCopyTimer = null;
  }

  stopSpinAnimation();
}

async function copyWinner() {
  const winner = currentWinnerEntry.value;
  if (!winner) return;

  try {
    const note = winner.note.trim();
    await navigator.clipboard.writeText(
      `${winner.name}${note ? ` — ${note}` : ""}`,
    );
    winnerCopied.value = true;
    if (winnerCopyTimer) clearTimeout(winnerCopyTimer);
    winnerCopyTimer = setTimeout(() => {
      winnerCopied.value = false;
      winnerCopyTimer = null;
    }, 1500);
  } catch {
    error.value = "This browser blocked copying the winner name.";
  }
}

async function copyWinnerList() {
  if (winnerHistory.value.length === 0) return;

  try {
    await navigator.clipboard.writeText(formatWinnerListText(winnerHistory.value));
    winnerListCopied.value = true;
    if (winnerListCopyTimer) clearTimeout(winnerListCopyTimer);
    winnerListCopyTimer = setTimeout(() => {
      winnerListCopied.value = false;
      winnerListCopyTimer = null;
    }, 1500);
  } catch {
    error.value = "This browser blocked copying the winner list.";
  }
}

function exportWinnerList() {
  if (winnerHistory.value.length === 0) return;

  const csv = `\uFEFF${formatWinnerListCsv(winnerHistory.value)}`;
  const downloadUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `chlatwork-winners-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();

  // Revoke after the click has been handed to the browser so Safari can finish the download.
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
}

function clearWinnerHistory() {
  closeWinnerDialog();
  winnerHistory.value = [];
  lastWinner.value = "";
  winnerCopied.value = false;
  winnerListCopied.value = false;
  activeWheelParticipants.value = [];
  wheelRotation.value = 0;
}

function getTargetRotationForWinner(
  winnerIndex: number,
  totalParticipants: number,
) {
  const winnerCenterAngle =
    winnerIndex * getSegmentAngle(totalParticipants) +
    getSegmentAngle(totalParticipants) / 2;

  return normalizeDegrees(360 - winnerCenterAngle);
}

function getWinningIndexFromRotation(
  rotation: number,
  totalParticipants: number,
) {
  if (totalParticipants === 0) return -1;

  const normalizedRotation = normalizeDegrees(rotation);
  const pointerAngle = (360 - normalizedRotation + 0.0001) % 360;
  const angleSize = getSegmentAngle(totalParticipants);

  return Math.min(totalParticipants - 1, Math.floor(pointerAngle / angleSize));
}

function easeOutQuint(value: number) {
  return 1 - Math.pow(1 - value, 5);
}

function stopSpinAnimation() {
  if (spinAnimationFrameId !== null) {
    cancelAnimationFrame(spinAnimationFrameId);
    spinAnimationFrameId = null;
  }
}

async function ensureAudioContext() {
  if (!import.meta.client) return null;

  if (!audioContext.value) {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return null;

    audioContext.value = new AudioContextClass();
  }

  if (audioContext.value.state === "suspended") {
    await audioContext.value.resume();
  }

  return audioContext.value;
}

function playTone(
  frequency: number,
  durationMs: number,
  options?: {
    volume?: number;
    type?: OscillatorType;
    delayMs?: number;
  },
) {
  if (!soundEnabled.value) return;
  const context = audioContext.value;
  if (!context) return;

  const volume = options?.volume ?? 0.03;
  const type = options?.type ?? "sine";
  const delayMs = options?.delayMs ?? 0;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  const startAt = context.currentTime + delayMs / 1000;
  const endAt = startAt + durationMs / 1000;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(startAt);
  oscillator.stop(endAt + 0.02);
}

function playTickSound() {
  playTone(980, 24, {
    volume: 0.018,
    type: "square",
  });
}

function playWinSound() {
  playTone(659, 130, {
    volume: 0.04,
    type: "triangle",
    delayMs: 0,
  });

  playTone(784, 150, {
    volume: 0.04,
    type: "triangle",
    delayMs: 130,
  });

  playTone(1046, 260, {
    volume: 0.045,
    type: "triangle",
    delayMs: 280,
  });
}

async function getConfettiLauncher() {
  if (!import.meta.client) return null;

  if (confettiLauncher) {
    return confettiLauncher;
  }

  try {
    const module = await import("canvas-confetti");
    const confetti = module.default;

    if (confettiCanvasRef.value) {
      confettiLauncher = confetti.create(confettiCanvasRef.value, {
        resize: true,
        useWorker: true,
      });
    } else {
      confettiLauncher = confetti;
    }

    return confettiLauncher;
  } catch {
    return null;
  }
}

async function launchConfetti() {
  const fire = await getConfettiLauncher();
  if (!fire) return;

  if (isFullscreen.value || isWinnerDialogOpen.value) {
    // Dialog celebrations use the viewport edges so particles frame the centered result.
    const dialogDefaults = {
      colors: DIALOG_CONFETTI_COLORS,
      ticks: 220,
      gravity: 0.9,
      decay: 0.93,
      scalar: 0.55,
    };

    fire({
      ...dialogDefaults,
      particleCount: 70,
      angle: 62,
      spread: 48,
      startVelocity: 44,
      origin: { x: 0.04, y: 0.72 },
    });

    fire({
      ...dialogDefaults,
      particleCount: 70,
      angle: 118,
      spread: 48,
      startVelocity: 44,
      origin: { x: 0.96, y: 0.72 },
    });

    fire({
      ...dialogDefaults,
      particleCount: 45,
      angle: 270,
      spread: 85,
      startVelocity: 24,
      gravity: 0.65,
      scalar: 0.45,
      origin: { x: 0.5, y: 0.04 },
    });
    return;
  }

  fire({
    particleCount: 120,
    spread: 90,
    startVelocity: 38,
    scalar: 0.95,
    origin: { y: 0.42, x: 0.5 },
  });

  fire({
    particleCount: 80,
    spread: 120,
    startVelocity: 30,
    scalar: 0.8,
    origin: { y: 0.42, x: 0.22 },
  });

  fire({
    particleCount: 80,
    spread: 120,
    startVelocity: 30,
    scalar: 0.8,
    origin: { y: 0.42, x: 0.78 },
  });
}

function syncFullscreenState() {
  if (!import.meta.client) return;
  isFullscreen.value = document.fullscreenElement === wheelStageRef.value;
}

async function toggleWheelFullscreen() {
  if (!import.meta.client || !wheelStageRef.value) return;

  try {
    if (document.fullscreenElement === wheelStageRef.value) {
      await document.exitFullscreen();
      return;
    }

    await wheelStageRef.value.requestFullscreen();
  } catch {
    // ignore fullscreen failure
  }
}

async function runLuckyDraw() {
  if (!canSpin.value) return;

  closeWinnerDialog();
  const runId = (spinRunId += 1);
  const people = [...eligibleParticipants.value];
  const totalParticipants = people.length;
  // Capture the assignment before animation so the result cannot be changed after selection.
  const winnerNote = drawNote.value.trim();
  activeWheelParticipants.value = people;
  isSpinning.value = true;
  lastWinner.value = "";
  winnerCopied.value = false;
  error.value = "";

  if (soundEnabled.value) {
    try {
      await ensureAudioContext();
    } catch {
      // Continue without sound if the browser blocks audio setup.
    }
  }

  if (runId !== spinRunId || !isSpinning.value) return;

  let winnerIndex: number;
  try {
    winnerIndex = secureRandomInt(people.length);
  } catch {
    isSpinning.value = false;
    error.value = "Secure random selection is not available in this browser.";
    return;
  }
  const winnerName = people[winnerIndex];
  const spinDuration = import.meta.client
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 700
    : SPIN_DURATION_MS[spinSpeed.value];

  const startRotation = wheelRotation.value;
  const normalizedCurrentRotation = normalizeDegrees(startRotation);
  const targetRotation = getTargetRotationForWinner(
    winnerIndex,
    totalParticipants,
  );
  const rotationDelta =
    FULL_TURNS * 360 +
    ((targetRotation - normalizedCurrentRotation + 360) % 360);

  stopSpinAnimation();

  let animationStartTime: number | null = null;
  let previousIndex = getWinningIndexFromRotation(
    startRotation,
    totalParticipants,
  );

  const animate = (timestamp: number) => {
    if (animationStartTime === null) {
      animationStartTime = timestamp;
    }

    const elapsed = timestamp - animationStartTime;
    const progress = Math.min(elapsed / spinDuration, 1);
    const easedProgress = easeOutQuint(progress);
    const nextRotation = startRotation + rotationDelta * easedProgress;

    wheelRotation.value = nextRotation;

    const currentIndex = getWinningIndexFromRotation(
      nextRotation,
      totalParticipants,
    );
    if (currentIndex !== previousIndex && currentIndex !== -1) {
      playTickSound();
      previousIndex = currentIndex;
    }

    if (progress < 1) {
      spinAnimationFrameId = requestAnimationFrame(animate);
      return;
    }

    wheelRotation.value = targetRotation;
    isSpinning.value = false;
    lastWinner.value = winnerName;
    winnerHistory.value.push({ name: winnerName, note: winnerNote });
    spinAnimationFrameId = null;

    if (showWinnerDialog.value) {
      isWinnerDialogOpen.value = true;
      nextTick(() => {
        playWinSound();
        launchConfetti();
      });
    } else {
      playWinSound();
      launchConfetti();
    }
  };

  spinAnimationFrameId = requestAnimationFrame(animate);
}

watch(
  rows,
  () => {
    if (isHydratingSession) return;

    error.value = "";
    raw.value = participants.value.join("\n");

    if (!isSpinning.value) {
      activeWheelParticipants.value = [];
      lastWinner.value = "";
      closeWinnerDialog();
      wheelRotation.value = 0;
    }
  },
  { deep: true },
);

watch(preventRepeatWinners, () => {
  if (isSpinning.value) return;
  activeWheelParticipants.value = [];
  wheelRotation.value = 0;
});

watch(showWinnerDialog, (enabled) => {
  if (!enabled) closeWinnerDialog();
});

watch(isWinnerDialogOpen, async (open) => {
  if (!import.meta.client) return;

  if (!open) {
    restoreWinnerDialogEnvironment();
    return;
  }

  previouslyFocusedElement = document.activeElement as HTMLElement | null;
  previousBodyOverflow = document.body.style.overflow;
  previousWheelStageOverflow = wheelStageRef.value?.style.overflow ?? "";
  isWinnerDialogEnvironmentLocked = true;
  document.body.style.overflow = "hidden";

  // Fullscreen scrolling belongs to the wheel stage rather than the document body.
  if (wheelStageRef.value) {
    wheelStageRef.value.style.overflow = "hidden";
  }

  await nextTick();
  winnerDialogCloseRef.value?.focus();
});

watch(
  [
    rows,
    raw,
    preventRepeatWinners,
    showWinnerDialog,
    soundEnabled,
    spinSpeed,
    drawNote,
    winnerHistory,
    lastWinner,
  ],
  persistLuckyDrawSession,
  { deep: true },
);

onMounted(async () => {
  restoreLuckyDrawSession();

  await nextTick();
  isHydratingSession = false;
  canPersistSession = true;
  persistLuckyDrawSession();

  if (import.meta.client) {
    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();
  }
});

onBeforeUnmount(() => {
  spinRunId += 1;

  if (winnerCopyTimer) clearTimeout(winnerCopyTimer);
  if (winnerListCopyTimer) clearTimeout(winnerListCopyTimer);
  stopSpinAnimation();
  restoreWinnerDialogEnvironment(false);

  if (import.meta.client) {
    document.removeEventListener("fullscreenchange", syncFullscreenState);
  }

  if (audioContext.value && audioContext.value.state !== "closed") {
    audioContext.value.close();
  }
});
</script>

<style scoped>
.wheel-box {
  max-width: 380px;
}

.wheel-stage:fullscreen .wheel-box {
  width: min(72vh, 100%);
  max-width: 100%;
}

@media (max-width: 1023px) {
  .wheel-stage:fullscreen {
    overflow-y: auto;
  }

  /* Portrait fullscreen scrolls as one document so the square wheel cannot paint over later rows. */
  .wheel-stage:fullscreen .wheel-stage-content {
    height: auto;
    min-height: 100%;
  }

  .wheel-stage:fullscreen .wheel-layout {
    flex: none;
  }

  .wheel-stage:fullscreen .wheel-space {
    flex: none;
    padding-bottom: 0.5rem;
  }

  .wheel-stage:fullscreen .wheel-box {
    width: min(48dvh, calc(100vw - 2rem));
  }

  .wheel-stage:fullscreen.has-results .wheel-box {
    width: min(36dvh, calc(100vw - 5rem));
  }

  .wheel-stage:fullscreen .wheel-note {
    margin-top: 1rem;
  }
}
</style>
