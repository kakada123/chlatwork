import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import * as serverRenderer from "vue/server-renderer";
import {
  compileScript,
  compileStyle,
  compileTemplate,
  parse,
} from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";

const { renderToString } = serverRenderer;

const filename = "app/pages/most-annoying.vue";
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });

// Run the actual page handlers with controlled browser events, timers and audio.
function pageHarness() {
  const mounts: (() => void)[] = [];
  const unmounts: (() => void)[] = [];
  const intervals = new Map<number, () => void>();
  const listeners = new Map<string, () => void>();
  const document = {
    hidden: false,
    activeElement: null as unknown,
    addEventListener: (name: string, fn: () => void) => listeners.set(name, fn),
    removeEventListener: (name: string) => listeners.delete(name),
  };
  const media = {
    matches: false,
    addEventListener: (name: string, fn: () => void) =>
      listeners.set(`media:${name}`, fn),
    removeEventListener: (name: string) => listeners.delete(`media:${name}`),
  };
  const audio = { created: 0, played: 0, disposed: 0 };
  const confetti = { created: 0, fired: 0, reset: 0, fail: false };
  let intervalId = 0;
  const globals = {
    ref: vue.ref,
    shallowRef: vue.shallowRef,
    computed: vue.computed,
    nextTick: vue.nextTick,
    definePageMeta() {},
    useSeoMeta() {},
    useHead() {},
    onMounted: (fn: () => void) => mounts.push(fn),
    onBeforeUnmount: (fn: () => void) => unmounts.push(fn),
    document,
    window: {
      matchMedia: () => media,
      addEventListener: (name: string, fn: () => void) =>
        listeners.set(name, fn),
      removeEventListener: (name: string) => listeners.delete(name),
    },
    setInterval(fn: () => void) {
      const id = ++intervalId;
      intervals.set(id, fn);
      return id;
    },
    clearInterval: (id: number) => intervals.delete(id),
  };
  const module = { exports: {} as any };
  const script = compileScript(descriptor, { id: "annoying-test" });
  const source = ts.transpileModule(script.content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", ...Object.keys(globals), source)(
    (name: string) => {
      if (name === "vue") return vue;
      if (name === "canvas-confetti")
        return {
          __esModule: true,
          default: {
            create() {
              if (confetti.fail) throw new Error("Canvas unavailable");
              confetti.created++;
              const fire = () => {
                confetti.fired++;
                return Promise.resolve();
              };
              fire.reset = () => {
                confetti.reset++;
              };
              return fire;
            },
          },
        };
      if (name === "~/lib/cockroach-sound")
        return {
          createSwatSoundPlayer() {
            audio.created++;
            return {
              play() {
                audio.played++;
              },
              dispose() {
                audio.disposed++;
              },
            };
          },
        };
      throw new Error(`Unexpected import: ${name}`);
    },
    module,
    module.exports,
    ...Object.values(globals),
  );
  const state = module.exports.default.setup({}, { expose() {} });
  mounts.forEach((fn) => fn());
  return {
    state,
    intervals,
    listeners,
    document,
    media,
    audio,
    confetti,
    tick(count = 1) {
      for (let index = 0; index < count; index++)
        [...intervals.values()].forEach((fn) => fn());
    },
    dispose() {
      unmounts.forEach((fn) => fn());
    },
  };
}

function reachCaptcha(page: ReturnType<typeof pageHarness>) {
  page.state.startTest();
  page.state.answerPatience({ detail: 0 });
  for (let tick = 0; tick < 100 && page.state.phase.value !== "captcha"; tick++)
    page.tick();
  assert.equal(page.state.phase.value, "captcha");
}
function selectTarget(page: ReturnType<typeof pageHarness>) {
  page.state.selectCaptcha(
    page.state.captchaTiles.value.findIndex(
      (tile: { id: string }) => tile.id === page.state.captchaTarget.value.id,
    ),
  );
}
function reachPopup(page: ReturnType<typeof pageHarness>) {
  reachCaptcha(page);
  for (let step = 0; step < 3; step++) selectTarget(page);
  completeExtraTests(page);
  completeNewChallenges(page);
  assert.equal(page.state.phase.value, "annoyed");
}

function completeExtraTests(page: ReturnType<typeof pageHarness>) {
  const { state } = page;
  assert.equal(state.phase.value, "consent");
  state.consentChecked.value = true;
  state.checkConsent();
  assert.equal(state.consentChecked.value, false);
  state.consentChecked.value = true;
  state.checkConsent();
  state.submitConsent();
  assert.equal(state.phase.value, "color");
  state.selectColor("blue");
  assert.equal(state.phase.value, "slider");
  state.sliderValue.value = 70;
  state.submitSlider();
  assert.equal(state.sliderTarget.value, 73);
  state.sliderValue.value = 73;
  state.submitSlider();
  assert.equal(state.phase.value, "sequence");
  for (const number of [3, 2, 1]) state.selectSequence(number);
}

function completeNewChallenges(page: ReturnType<typeof pageHarness>) {
  const { state } = page;
  assert.equal(state.phase.value, "typing");
  state.typedPhrase.value = state.requiredPhrase;
  state.submitPhrase();
  assert.equal(state.typedPhrase.value, "");
  state.typedPhrase.value = state.requiredPhrase;
  state.submitPhrase();
  assert.equal(state.phase.value, "counter");
  for (let click = 0; click < 8; click++) state.clickCounter();
  assert.equal(state.phase.value, "opposite");
  for (const direction of ["down", "left", "up"])
    state.selectOpposite(direction);
  assert.equal(state.phase.value, "memory");
  state.beginMemory();
  for (const fruit of state.memoryPattern) state.selectMemory(fruit.id);
  assert.equal(state.phase.value, "size");
  state.selectLargest(42);
}

test("START asks about patience, loads from zero to 99, fails and restarts before captcha", () => {
  const page = pageHarness(),
    { state } = page;
  try {
    assert.equal(state.phase.value, "start");
    assert.equal(page.intervals.size, 0);
    state.startTest();
    assert.equal(state.phase.value, "question");
    assert.equal(state.stageTitle.value, "តើអ្នកអត់ធ្មត់មែនទេ?");
    assert.equal(page.intervals.size, 0);
    state.answerPatience({ detail: 0 });
    assert.equal(state.phase.value, "loading");
    assert.equal(state.progress.value, 0);
    page.tick(33);
    assert.equal(state.progress.value, 99);
    assert.equal(state.phase.value, "loading");
    page.tick();
    assert.equal(state.phase.value, "unstable");
    assert.equal(state.stageTitle.value, "ការតភ្ជាប់មិនស្ថិតស្ថេរ");
    page.tick(8);
    assert.equal(state.phase.value, "retry-loading");
    assert.equal(state.progress.value, 0);
    page.tick(9);
    assert.equal(state.progress.value, 99);
    page.tick();
    assert.equal(state.phase.value, "captcha");
    assert.equal(state.captchaStep.value, 1);
    assert.equal(state.captchaTotal, 3);
    assert.equal(page.intervals.size, 0);
    assert.equal(page.audio.created, 0);
  } finally {
    page.dispose();
  }
});

test("captcha rejects wrong tiles and ends after exactly three accepted answers", () => {
  const page = pageHarness(),
    { state } = page;
  try {
    reachCaptcha(page);
    state.selectCaptcha(-1);
    state.selectCaptcha(
      state.captchaTiles.value.findIndex(
        (tile: { id: string }) => tile.id !== state.captchaTarget.value.id,
      ),
    );
    assert.equal(state.captchaStep.value, 1);
    assert.equal(state.captchaTotal, 3);
    for (let step = 1; step <= 3; step++) {
      assert.equal(state.captchaStep.value, step);
      selectTarget(page);
    }
    assert.equal(state.phase.value, "consent");
    state.selectCaptcha(0);
    assert.equal(state.phase.value, "consent");
  } finally {
    page.dispose();
  }
});

test("captcha rotates the requested insect after every accepted answer and resets on restart", () => {
  const page = pageHarness(),
    { state } = page;
  try {
    reachCaptcha(page);
    const seen = new Set<string>();
    for (let round = 0; round < 3; round++) {
      const target = state.captchaTarget.value;
      seen.add(target.id);
      assert.equal(state.stageIcon.value, target.icon);
      assert.equal(
        state.captchaTiles.value.filter(
          (tile: { id: string }) => tile.id === target.id,
        ).length,
        1,
      );
      const previousStep = state.captchaStep.value;
      state.selectCaptcha(
        state.captchaTiles.value.findIndex(
          (tile: { id: string }) => tile.id !== target.id,
        ),
      );
      assert.equal(state.captchaTarget.value.id, target.id);
      assert.equal(state.captchaStep.value, previousStep);
      assert.ok(state.status.value.includes(target.label));
      selectTarget(page);
      if (state.phase.value === "captcha")
        assert.notEqual(state.captchaTarget.value.id, target.id);
    }
    assert.equal(seen.size, 3);
    assert.equal(state.phase.value, "consent");
    reachCaptcha(page);
    assert.equal(state.captchaTarget.value.id, "cockroach");
    assert.equal(state.captchaTotal, 3);
  } finally {
    page.dispose();
  }
});

test("four extra tests reject wrong answers, spring each trick once and finish in order", () => {
  const page = pageHarness(),
    { state } = page;
  try {
    reachCaptcha(page);
    for (let step = 0; step < 3; step++) selectTarget(page);
    state.submitConsent();
    assert.equal(state.phase.value, "consent");
    state.consentChecked.value = true;
    state.checkConsent();
    assert.equal(state.consentChecked.value, false);
    assert.equal(state.consentTricked.value, true);
    state.consentChecked.value = true;
    state.checkConsent();
    assert.equal(state.consentChecked.value, true);
    state.submitConsent();
    assert.equal(state.phase.value, "color");
    state.selectColor("red");
    state.selectColor("invalid");
    assert.equal(state.phase.value, "color");
    state.selectColor("blue");
    assert.equal(state.phase.value, "slider");
    for (const invalid of [NaN, Infinity, 69, 70.5]) {
      state.sliderValue.value = invalid;
      state.submitSlider();
      assert.equal(state.sliderTarget.value, 70);
    }
    state.sliderValue.value = 70;
    state.submitSlider();
    assert.equal(state.phase.value, "slider");
    assert.equal(state.sliderTarget.value, 73);
    state.submitSlider();
    assert.equal(state.phase.value, "slider");
    state.sliderValue.value = 73;
    state.submitSlider();
    assert.equal(state.phase.value, "sequence");
    state.selectSequence(1);
    assert.equal(state.sequenceStep.value, 0);
    state.selectSequence(3);
    assert.equal(state.sequenceStep.value, 1);
    assert.deepEqual([...state.sequenceChoices.value].sort(), [1, 2, 3]);
    state.selectSequence(3);
    assert.equal(state.sequenceStep.value, 0);
    for (const number of [3, 2, 1]) state.selectSequence(number);
    assert.equal(state.phase.value, "typing");
    assert.equal(page.intervals.size, 0);
  } finally {
    page.dispose();
  }
});

test("extra tests preserve progress while paused or hidden and reset every trick on restart", () => {
  const page = pageHarness(),
    { state } = page;
  try {
    for (const blocked of ["paused", "hidden"]) {
      const setBlocked = (value: boolean) => {
        if (blocked === "paused") state.togglePause();
        else {
          page.document.hidden = value;
          page.listeners.get("visibilitychange")!();
        }
      };
      reachCaptcha(page);
      for (let step = 0; step < 3; step++) selectTarget(page);
      state.consentChecked.value = true;
      setBlocked(true);
      state.checkConsent();
      assert.equal(state.consentTricked.value, false);
      setBlocked(false);
      state.checkConsent();
      state.consentChecked.value = true;
      state.checkConsent();
      setBlocked(true);
      state.submitConsent();
      assert.equal(state.phase.value, "consent");
      setBlocked(false);
      state.submitConsent();
      setBlocked(true);
      state.selectColor("blue");
      assert.equal(state.phase.value, "color");
      setBlocked(false);
      state.selectColor("blue");
      state.sliderValue.value = 70;
      state.submitSlider();
      state.sliderValue.value = 73;
      setBlocked(true);
      state.submitSlider();
      assert.equal(state.phase.value, "slider");
      assert.equal(state.sliderTarget.value, 73);
      setBlocked(false);
      state.submitSlider();
      state.selectSequence(3);
      const choices = [...state.sequenceChoices.value];
      setBlocked(true);
      state.selectSequence(2);
      assert.equal(state.sequenceStep.value, 1);
      assert.deepEqual(state.sequenceChoices.value, choices);
      setBlocked(false);
      state.selectSequence(2);
      assert.equal(state.sequenceStep.value, 2);
      state.startTest();
      assert.equal(state.consentChecked.value, false);
      assert.equal(state.consentTricked.value, false);
      assert.equal(state.sliderValue.value, 50);
      assert.equal(state.sliderTarget.value, 70);
      assert.equal(state.sliderTricked.value, false);
      assert.equal(state.sequenceStep.value, 0);
    }
  } finally {
    page.dispose();
  }
});

test("five new challenges enforce their answers and spring typing and counter tricks only once", () => {
  const page = pageHarness(),
    { state } = page;
  try {
    reachCaptcha(page);
    for (let step = 0; step < 3; step++) selectTarget(page);
    completeExtraTests(page);
    state.typedPhrase.value = "wrong";
    state.submitPhrase();
    assert.equal(state.typingTricked.value, false);
    assert.equal(state.phase.value, "typing");
    state.typedPhrase.value = state.requiredPhrase;
    state.submitPhrase();
    assert.equal(state.typingTricked.value, true);
    assert.equal(state.typedPhrase.value, "");
    state.typedPhrase.value = ` ${state.requiredPhrase} `;
    state.submitPhrase();
    assert.equal(state.phase.value, "counter");
    page.tick(100);
    assert.equal(state.counterClicks.value, 0);
    state.clickCounter();
    state.clickCounter();
    assert.equal(state.counterClicks.value, 2);
    state.clickCounter();
    assert.equal(state.counterClicks.value, 0);
    assert.equal(state.counterTricked.value, true);
    for (let click = 0; click < 5; click++) state.clickCounter();
    assert.equal(state.phase.value, "opposite");
    state.selectOpposite("up");
    state.selectOpposite("invalid");
    assert.equal(state.oppositeStep.value, 0);
    for (const direction of ["down", "left", "up"])
      state.selectOpposite(direction);
    assert.equal(state.phase.value, "memory");
    state.selectMemory("apple");
    assert.equal(state.memoryStep.value, 0);
    state.beginMemory();
    state.selectMemory("orange");
    assert.equal(state.memoryStep.value, 0);
    state.selectMemory("apple");
    assert.equal(state.memoryStep.value, 1);
    state.selectMemory("banana");
    assert.equal(state.memoryStep.value, 0);
    state.showMemory();
    assert.equal(state.memoryRevealed.value, true);
    state.beginMemory();
    for (const fruit of state.memoryPattern) state.selectMemory(fruit.id);
    assert.equal(state.phase.value, "size");
    for (const wrong of [9, 7, NaN, 99]) state.selectLargest(wrong);
    assert.equal(state.phase.value, "size");
    state.selectLargest(42);
    assert.equal(state.phase.value, "annoyed");
    state.selectLargest(42);
    assert.equal(page.intervals.size, 0);
  } finally {
    page.dispose();
  }
});

test("new challenges reject paused and hidden actions and reset all new progress on restart", () => {
  const page = pageHarness(),
    { state } = page;
  try {
    for (const blocked of ["paused", "hidden"]) {
      const setBlocked = (value: boolean) => {
        if (blocked === "paused") state.togglePause();
        else {
          page.document.hidden = value;
          page.listeners.get("visibilitychange")!();
        }
      };
      reachCaptcha(page);
      for (let step = 0; step < 3; step++) selectTarget(page);
      completeExtraTests(page);
      state.typedPhrase.value = state.requiredPhrase;
      setBlocked(true);
      state.submitPhrase();
      assert.equal(state.typingTricked.value, false);
      assert.equal(state.typedPhrase.value, state.requiredPhrase);
      setBlocked(false);
      state.submitPhrase();
      state.typedPhrase.value = state.requiredPhrase;
      state.submitPhrase();
      state.clickCounter();
      setBlocked(true);
      state.clickCounter();
      assert.equal(state.counterClicks.value, 1);
      setBlocked(false);
      for (let click = 0; click < 7; click++) state.clickCounter();
      setBlocked(true);
      state.selectOpposite("down");
      assert.equal(state.oppositeStep.value, 0);
      setBlocked(false);
      for (const direction of ["down", "left", "up"])
        state.selectOpposite(direction);
      setBlocked(true);
      state.beginMemory();
      assert.equal(state.memoryRevealed.value, true);
      setBlocked(false);
      state.beginMemory();
      state.selectMemory("apple");
      setBlocked(true);
      state.selectMemory("grape");
      state.showMemory();
      assert.equal(state.memoryStep.value, 1);
      assert.equal(state.memoryRevealed.value, false);
      setBlocked(false);
      state.selectMemory("grape");
      state.selectMemory("banana");
      setBlocked(true);
      state.selectLargest(42);
      assert.equal(state.phase.value, "size");
      setBlocked(false);
      state.selectLargest(42);
      state.startTest();
      assert.equal(state.typedPhrase.value, "");
      assert.equal(state.typingTricked.value, false);
      assert.equal(state.counterClicks.value, 0);
      assert.equal(state.counterTricked.value, false);
      assert.equal(state.oppositeStep.value, 0);
      assert.equal(state.memoryStep.value, 0);
      assert.equal(state.memoryRevealed.value, true);
    }
    page.dispose();
    state.submitPhrase();
    state.clickCounter();
    state.selectOpposite("down");
    state.beginMemory();
    state.showMemory();
    state.selectMemory("apple");
    state.selectLargest(42);
    assert.equal(state.phase.value, "question");
    assert.equal(state.interruptions.value, 0);
  } finally {
    page.dispose();
  }
});

test("NO escapes without finishing; YES thanks the user, fires confetti and ends with the 2% result", () => {
  const page = pageHarness(),
    { state } = page;
  try {
    reachPopup(page);
    state.playground.value = { clientWidth: 320, clientHeight: 156 };
    state.runaway.value = { offsetWidth: 90, offsetHeight: 48 };
    state.answerNo();
    assert.equal(state.phase.value, "annoyed");
    assert.ok(state.buttonPosition.value);
    state.confettiCanvas.value = {};
    state.answerAnnoyed();
    assert.equal(state.phase.value, "honest");
    assert.equal(state.stageTitle.value, "អរគុណដែលឆ្លើយត្រង់ 😂");
    assert.equal(page.confetti.fired, 1);
    state.answerAnnoyed();
    assert.equal(page.confetti.fired, 1);
    page.tick(10);
    assert.equal(state.phase.value, "result");
    assert.equal(state.stageTitle.value, "ពិន្ទុភាពអត់ធ្មត់របស់អ្នក");
    assert.equal(page.intervals.size, 0);
    assert.equal(state.active.value, false);
  } finally {
    page.dispose();
  }
});

test("runaway YES is bounded, eventually stops, and allows touch, keyboard and reduced-motion completion", () => {
  const page = pageHarness(),
    { state } = page;
  try {
    state.playground.value = { clientWidth: 320, clientHeight: 240 };
    state.runaway.value = { offsetWidth: 90, offsetHeight: 48 };
    state.startTest();
    for (let attempt = 0; attempt < 4; attempt++) {
      state.dodge({ pointerType: "mouse" });
      assert.ok(
        state.buttonPosition.value.x >= 12 &&
          state.buttonPosition.value.x <= 218,
      );
      assert.ok(
        state.buttonPosition.value.y >= 12 &&
          state.buttonPosition.value.y <= 180,
      );
    }
    const position = state.buttonPosition.value;
    state.dodge({ pointerType: "mouse" });
    assert.equal(state.buttonPosition.value, position);
    state.answerPatience({ detail: 1 });
    assert.equal(state.phase.value, "loading");
    state.startTest();
    state.recordPointer({ pointerType: "touch" });
    for (let attempt = 0; attempt < 4; attempt++) {
      state.answerPatience({ detail: 1 });
      assert.equal(state.phase.value, "question");
    }
    state.answerPatience({ detail: 1 });
    assert.equal(state.phase.value, "loading");
    state.startTest();
    state.recordPointer({ pointerType: "touch" });
    state.answerPatience({ detail: 0 });
    assert.equal(state.phase.value, "loading");
    state.startTest();
    page.document.activeElement = state.runaway.value;
    state.dodge({ pointerType: "mouse" });
    assert.equal(state.buttonPosition.value, null);
    page.document.activeElement = null;
    page.media.matches = true;
    page.listeners.get("media:change")!();
    state.recordPointer({ pointerType: "touch" });
    state.answerPatience({ detail: 1 });
    assert.equal(state.phase.value, "loading");
  } finally {
    page.dispose();
  }
});

test("Pause and background tabs preserve progress and stop timers/audio, including queued callbacks", () => {
  const page = pageHarness(),
    { state } = page;
  try {
    state.startTest();
    state.answerPatience({ detail: 0 });
    state.toggleSound();
    assert.equal(page.audio.created, 1);
    page.tick(5);
    const before = state.progress.value;
    const staleTick = [...page.intervals.values()][0]!;
    state.togglePause();
    assert.equal(page.intervals.size, 0);
    assert.equal(state.soundEnabled.value, false);
    staleTick();
    assert.equal(state.progress.value, before);
    state.togglePause();
    assert.equal(page.intervals.size, 1);
    staleTick();
    assert.equal(state.progress.value, before);
    page.tick();
    assert.ok(state.progress.value > before);
    page.document.hidden = true;
    page.listeners.get("visibilitychange")!();
    assert.equal(page.intervals.size, 0);
    const hiddenProgress = state.progress.value;
    page.tick(20);
    assert.equal(state.progress.value, hiddenProgress);
    page.document.hidden = false;
    page.listeners.get("visibilitychange")!();
    assert.equal(page.intervals.size, 1);
    assert.equal(page.audio.disposed, 1);
  } finally {
    page.dispose();
  }
});

test("Restart resets the entire flow and navigation rejects queued work and removes listeners", () => {
  const page = pageHarness(),
    { state } = page;
  reachPopup(page);
  state.confettiCanvas.value = {};
  state.answerAnnoyed();
  const staleTick = [...page.intervals.values()][0]!;
  state.startTest();
  assert.equal(state.phase.value, "question");
  assert.equal(state.captchaTotal, 3);
  assert.equal(state.progress.value, 0);
  assert.equal(state.interruptions.value, 0);
  staleTick();
  assert.equal(state.phase.value, "question");
  state.answerPatience({ detail: 0 });
  const navigationTick = [...page.intervals.values()][0]!;
  page.dispose();
  assert.equal(page.intervals.size, 0);
  assert.equal(page.listeners.size, 0);
  assert.ok(page.confetti.reset >= 2);
  navigationTick();
  assert.equal(state.progress.value, 0);
  state.startTest();
  assert.equal(page.intervals.size, 0);
});

test("reduced motion and a failed confetti canvas still finish the score", () => {
  for (const reduceMotion of [true, false]) {
    const page = pageHarness(),
      { state } = page;
    try {
      page.media.matches = reduceMotion;
      page.listeners.get("media:change")!();
      page.confetti.fail = !reduceMotion;
      reachPopup(page);
      state.confettiCanvas.value = {};
      state.answerAnnoyed();
      page.tick(10);
      assert.equal(state.phase.value, "result");
      assert.equal(page.confetti.created, 0);
    } finally {
      page.dispose();
    }
  }
});

test("the focused test renders every phase and accessible label in Khmer without the old hero", async () => {
  const page = pageHarness();
  const script = compileScript(descriptor, { id: "annoying-render-test" });
  const template = compileTemplate({
    source: descriptor.template!.content,
    filename,
    id: "annoying-render-test",
    ssr: true,
    ssrCssVars: [],
    compilerOptions: { bindingMetadata: script.bindings },
  });
  const exports: Record<string, any> = {};
  new Function(
    "require",
    "exports",
    ts.transpileModule(template.code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  )(
    (name: string) => (name === "vue/server-renderer" ? serverRenderer : vue),
    exports,
  );
  const render = () => {
    const app = vue.createSSRApp({
      setup: () => page.state,
      ssrRender: exports.ssrRender,
    });
    app.component("NuxtLink", {
      props: ["to"],
      setup:
        (props, { slots }) =>
        () =>
          vue.h("a", { href: props.to }, slots.default?.()),
    });
    return renderToString(app).then((html) => {
      assert.match(html, /<main[^>]*lang="km"/);
      assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
      assert.doesNotMatch(html, /THE MOST|ANNOYING|CHAOS LAB|PLEASE WAIT/);
      const text = html
        .replace(/<[^>]+>/g, " ")
        .replace(/&[^;]+;/g, " ")
        .replaceAll("ChlatWork", "");
      assert.doesNotMatch(text, /[A-Za-z]/);
      for (const label of html.matchAll(/aria-label="([^"]*)"/g))
        assert.doesNotMatch(label[1], /[A-Za-z]/);
      return html;
    });
  };
  try {
    assert.match(await render(), /ចាប់ផ្ដើមតេស្ត/);
    page.state.startTest();
    assert.match(await render(), /តើអ្នកអត់ធ្មត់មែនទេ\?/);
    page.state.answerPatience({ detail: 0 });
    assert.match(await render(), /កំពុងតេស្តភាពអត់ធ្មត់/);
    page.tick(34);
    assert.match(await render(), /ការតភ្ជាប់មិនស្ថិតស្ថេរ/);
    page.tick(8);
    assert.match(await render(), /ចាប់ផ្ដើមម្ដងទៀត/);
    page.tick(10);
    const firstCaptcha = await render();
    assert.match(firstCaptcha, /ផ្ទៀងផ្ទាត់ 1\/3/);
    assert.match(firstCaptcha, /សូមជ្រើសរើសកន្លាត។/);
    assert.match(firstCaptcha, /aria-label="ជ្រើសរើសកន្លាត"/);
    selectTarget(page);
    const nextCaptcha = await render();
    assert.match(nextCaptcha, /ផ្ទៀងផ្ទាត់ 2\/3/);
    assert.match(nextCaptcha, /សូមជ្រើសរើសមេអំបៅ។/);
    assert.match(nextCaptcha, /aria-label="ជ្រើសរើសមេអំបៅ"/);
    selectTarget(page);
    assert.match(await render(), /ផ្ទៀងផ្ទាត់ 3\/3/);
    selectTarget(page);
    assert.match(await render(), /តេស្តបន្ថែម 1\/9/);
    page.state.consentChecked.value = true;
    page.state.checkConsent();
    page.state.consentChecked.value = true;
    page.state.checkConsent();
    page.state.submitConsent();
    assert.match(await render(), /តេស្តបន្ថែម 2\/9/);
    assert.match(await render(), /ពាក្យ «ក្រហម» មានពណ៌ខៀវ/);
    page.state.selectColor("blue");
    assert.match(await render(), /តេស្តបន្ថែម 3\/9/);
    assert.match(await render(), /type="range"/);
    page.state.sliderValue.value = 70;
    page.state.submitSlider();
    assert.match(await render(), /<strong>73<\/strong>/);
    page.state.sliderValue.value = 73;
    page.state.submitSlider();
    assert.match(await render(), /តេស្តបន្ថែម 4\/9/);
    for (const number of [3, 2, 1]) page.state.selectSequence(number);
    assert.match(await render(), /តេស្តបន្ថែម 5\/9/);
    page.state.typedPhrase.value = page.state.requiredPhrase;
    page.state.submitPhrase();
    assert.match(await render(), /អក្សរបាត់អស់ហើយ/);
    page.state.typedPhrase.value = page.state.requiredPhrase;
    page.state.submitPhrase();
    assert.match(await render(), /តេស្តបន្ថែម 6\/9/);
    for (let click = 0; click < 8; click++) page.state.clickCounter();
    assert.match(await render(), /តេស្តបន្ថែម 7\/9/);
    for (const direction of ["down", "left", "up"])
      page.state.selectOpposite(direction);
    assert.match(await render(), /តេស្តបន្ថែម 8\/9/);
    assert.match(await render(), /ចងចាំហើយ! លាក់គំរូ/);
    page.state.beginMemory();
    assert.match(await render(), /រូបទី 1 លាក់/);
    assert.match(await render(), /មើលគំរូម្ដងទៀត/);
    for (const fruit of page.state.memoryPattern)
      page.state.selectMemory(fruit.id);
    assert.match(await render(), /តេស្តបន្ថែម 9\/9/);
    assert.match(await render(), /size-small[^>]*aria-label="លេខ 42"/);
    page.state.selectLargest(42);
    assert.match(await render(), /ធុញហើយមែនទេ\?/);
    page.state.answerAnnoyed();
    assert.match(await render(), /អរគុណដែលឆ្លើយត្រង់ 😂/);
    page.tick(10);
    const html = await render();
    assert.match(html, /ពិន្ទុភាពអត់ធ្មត់របស់អ្នក/);
    assert.match(html, /<strong>2%<\/strong>/);
  } finally {
    page.dispose();
  }
});

test("the page compiles client and SSR templates and scoped styles", () => {
  const script = compileScript(descriptor, { id: "annoying-test" });
  for (const ssr of [false, true]) {
    const template = compileTemplate({
      source: descriptor.template!.content,
      filename,
      id: "annoying-test",
      ssr,
      ssrCssVars: [],
      compilerOptions: { bindingMetadata: script.bindings },
    });
    assert.deepEqual(template.errors, []);
  }
  assert.deepEqual(
    compileStyle({
      source: descriptor.styles[0]!.content,
      filename,
      id: "annoying-test",
      scoped: true,
    }).errors,
    [],
  );
});
