<script setup lang="ts">
import confetti from "canvas-confetti";
import { createSwatSoundPlayer } from "~/lib/cockroach-sound";

definePageMeta({ layout: false, blankCanvas: true, pageTransition: false });
useSeoMeta({
  title: "តេស្តភាពអត់ធ្មត់ | ChlatWork",
  description:
    "សាកល្បងភាពអត់ធ្មត់របស់អ្នក ជាមួយប៊ូតុងរត់គេច ការផ្ទុកម្ដងហើយម្ដងទៀត ការផ្ទៀងផ្ទាត់ 3 ជុំ និងតេស្តរំខាន 9 ជំហាន។",
  robots: "noindex, nofollow",
});
useHead({ htmlAttrs: { lang: "km" } });

type Phase =
  | "start"
  | "question"
  | "loading"
  | "unstable"
  | "retry-loading"
  | "captcha"
  | "consent"
  | "color"
  | "slider"
  | "sequence"
  | "typing"
  | "counter"
  | "opposite"
  | "memory"
  | "size"
  | "annoyed"
  | "honest"
  | "result";
const phase = ref<Phase>("start");
const paused = ref(false);
const soundEnabled = ref(false);
const reducedMotion = ref(false);
const tabHidden = ref(false);
const interruptions = ref(0);
const progress = ref(0);
const captchaStep = ref(1);
const captchaTotal = 3;
const consentChecked = ref(false);
const consentTricked = ref(false);
const sliderValue = ref(50);
const sliderTarget = ref(70);
const sliderTricked = ref(false);
const sequenceStep = ref(0);
const sequenceOrder = [3, 2, 1];
const sequenceChoices = computed(() => {
  const choices = [1, 3, 2];
  return choices.map(
    (_, index) => choices[(index + sequenceStep.value) % choices.length]!,
  );
});
const colorChoices = [
  { id: "red", label: "ក្រហម", color: "#ef4444" },
  { id: "blue", label: "ខៀវ", color: "#3b82f6" },
  { id: "green", label: "បៃតង", color: "#22c55e" },
];
const requiredPhrase = "ខ្ញុំអត់ធ្មត់";
const typedPhrase = ref("");
const typingTricked = ref(false);
const phraseInput = ref<HTMLInputElement | null>(null);
const counterClicks = ref(0);
const counterTricked = ref(false);
const counterTotal = 5;
const oppositeStep = ref(0);
const oppositeTotal = 3;
const directionChoices = [
  { id: "up", icon: "↑", label: "ឡើងលើ", opposite: "down" },
  { id: "right", icon: "→", label: "ទៅស្ដាំ", opposite: "left" },
  { id: "down", icon: "↓", label: "ចុះក្រោម", opposite: "up" },
  { id: "left", icon: "←", label: "ទៅឆ្វេង", opposite: "right" },
];
const directionPrompt = computed(
  () => directionChoices[oppositeStep.value % oppositeTotal]!,
);
const fruitChoices = [
  { id: "orange", icon: "🍊", label: "ផ្លែក្រូច" },
  { id: "grape", icon: "🍇", label: "ផ្លែទំពាំងបាយជូរ" },
  { id: "apple", icon: "🍎", label: "ផ្លែប៉ោម" },
  { id: "banana", icon: "🍌", label: "ផ្លែចេក" },
];
// The answer grid differs from the pattern so remembering it requires more than reading across.
const memoryPattern = [fruitChoices[2]!, fruitChoices[1]!, fruitChoices[3]!];
const memoryRevealed = ref(true);
const memoryStep = ref(0);
const sizeChoices = [
  { value: 9, size: "large" },
  { value: 42, size: "small" },
  { value: 7, size: "medium" },
];
const status = ref("តេស្តខ្លីមួយ។ ប្រហែលជាខ្លីមែន។");
const playground = ref<HTMLElement | null>(null);
const runaway = ref<HTMLButtonElement | null>(null);
const stageHeading = ref<HTMLElement | null>(null);
const honestYesButton = ref<HTMLButtonElement | null>(null);
const confettiCanvas = ref<HTMLCanvasElement | null>(null);
const buttonPosition = shallowRef<{ x: number; y: number } | null>(null);
const dodgeCount = ref(0);

const active = computed(
  () =>
    phase.value !== "start" &&
    phase.value !== "result" &&
    !paused.value &&
    !tabHidden.value,
);
const loadingStage = computed(() =>
  ["loading", "unstable", "retry-loading"].includes(phase.value),
);
const stageTitle = computed(
  () =>
    ({
      start: "សាកល្បងភាពអត់ធ្មត់របស់អ្នក",
      question: "តើអ្នកអត់ធ្មត់មែនទេ?",
      loading: "កំពុងតេស្តភាពអត់ធ្មត់…",
      unstable: "ការតភ្ជាប់មិនស្ថិតស្ថេរ",
      "retry-loading": "តោះ! ចាប់ផ្ដើមម្ដងទៀត។",
      captcha: "បញ្ជាក់ថាអ្នកជាមនុស្ស",
      consent: "ធីកតែមួយប៉ុណ្ណោះ",
      color: "អានពណ៌ កុំអានពាក្យ",
      slider: "រំកិលឲ្យចំលេខ",
      sequence: "រាប់ថយក្រោយ",
      typing: "វាយឃ្លាតែម្ដង… ប្រហែល",
      counter: "ចុចតែប្រាំដង",
      opposite: "ជ្រើសទិសផ្ទុយ",
      memory: "ចងចាំរូបទាំងបី",
      size: "លេខធំ អក្សរតូច",
      annoyed: "នៅសល់សំណួរមួយទៀត",
      honest: "អរគុណដែលឆ្លើយត្រង់ 😂",
      result: "ពិន្ទុភាពអត់ធ្មត់របស់អ្នក",
    })[phase.value],
);
const stageIcon = computed(
  () =>
    ({
      start: "🧘",
      question: "🙂",
      loading: "⏳",
      unstable: "😵‍💫",
      "retry-loading": "🔄",
      captcha: captchaTarget.value.icon,
      consent: "☑️",
      color: "🎨",
      slider: "🎚️",
      sequence: "🔢",
      typing: "⌨️",
      counter: "🖱️",
      opposite: "↔️",
      memory: "🧠",
      size: "🔎",
      annoyed: "😏",
      honest: "🎉",
      result: "😅",
    })[phase.value],
);
const stageLabel = computed(
  () =>
    ({
      start: "តោះ! ចាប់ផ្ដើម",
      question: "សំណួរទីមួយ",
      loading: "សូមរង់ចាំ",
      unstable: "អូ៎ មានបញ្ហាហើយ",
      "retry-loading": "ម្ដងទៀតហើយ",
      captcha: "ការផ្ទៀងផ្ទាត់",
      consent: "តេស្តបន្ថែម 1/9",
      color: "តេស្តបន្ថែម 2/9",
      slider: "តេស្តបន្ថែម 3/9",
      sequence: "តេស្តបន្ថែម 4/9",
      typing: "តេស្តបន្ថែម 5/9",
      counter: "តេស្តបន្ថែម 6/9",
      opposite: "តេស្តបន្ថែម 7/9",
      memory: "តេស្តបន្ថែម 8/9",
      size: "តេស្តបន្ថែម 9/9",
      annoyed: "សំណួរចុងក្រោយ",
      honest: "ទីបំផុត!",
      result: "លទ្ធផលរបស់អ្នក",
    })[phase.value],
);
const insects = [
  { id: "cockroach", icon: "🪳", label: "កន្លាត" },
  { id: "butterfly", icon: "🦋", label: "មេអំបៅ" },
  { id: "ladybug", icon: "🐞", label: "សត្វអណ្ដើកមាស" },
  { id: "bee", icon: "🐝", label: "ឃ្មុំ" },
  { id: "ant", icon: "🐜", label: "ស្រមោច" },
  { id: "beetle", icon: "🪲", label: "សត្វស្លាបរឹង" },
  { id: "mosquito", icon: "🦟", label: "មូស" },
  { id: "spider", icon: "🕷️", label: "ពីងពាង" },
  { id: "fly", icon: "🪰", label: "រុយ" },
];
const captchaTarget = computed(() => {
  return insects[(captchaStep.value - 1) % insects.length]!;
});
const captchaTiles = computed(() => {
  const offset = (captchaStep.value * 3) % insects.length;
  return insects.map((_, index) => insects[(index + offset) % insects.length]!);
});
const buttonStyle = computed(() =>
  buttonPosition.value
    ? {
        left: buttonPosition.value.x + "px",
        top: buttonPosition.value.y + "px",
      }
    : undefined,
);
let timer: ReturnType<typeof setInterval> | undefined;
let timerRevision = 0;
let phaseTicks = 0;
let lastPointerType = "";
let media: MediaQueryList | undefined;
let soundPlayer: ReturnType<typeof createSwatSoundPlayer> | undefined;
let celebration: ReturnType<typeof confetti.create> | undefined;
let disposed = false;

function ping() {
  if (!active.value || !soundEnabled.value || disposed) return;
  soundPlayer ??= createSwatSoundPlayer();
  soundPlayer.play(interruptions.value % 2 === 0);
}

function silence() {
  soundEnabled.value = false;
  soundPlayer?.dispose();
  soundPlayer = undefined;
}

function resetTimer() {
  const revision = ++timerRevision;
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
  if (
    !active.value ||
    disposed ||
    !["loading", "unstable", "retry-loading", "honest"].includes(phase.value)
  )
    return;
  // A generation guard also rejects callbacks queued before Pause, a restart or navigation.
  timer = setInterval(() => {
    if (disposed || !active.value || revision !== timerRevision) return;
    phaseTicks++;
    if (phase.value === "loading" || phase.value === "retry-loading") {
      if (progress.value < 99) {
        progress.value = Math.min(
          99,
          progress.value + (phase.value === "loading" ? 3 : 11),
        );
      } else if (phase.value === "loading") {
        interruptions.value++;
        status.value = "ការតភ្ជាប់មិនស្ថិតស្ថេរ។ ចាំយូរហើយ ចាំម្ដងទៀតទៅ!";
        enterPhase("unstable");
        ping();
      } else {
        status.value = "ផ្ទៀងផ្ទាត់តែ 3 ជុំទេ។ លើកនេះមិនបន្ថែមទៀតទេ!";
        enterPhase("captcha");
      }
    } else if (phase.value === "unstable" && phaseTicks >= 8) {
      progress.value = 0;
      status.value = "ត្រូវផ្ទុកម្ដងទៀតពី 0%។";
      enterPhase("retry-loading");
    } else if (phase.value === "honest" && phaseTicks >= 10) {
      status.value = "ពិន្ទុលេងសើចទេ កុំយកជាការពិតណា។";
      enterPhase("result");
      silence();
    }
  }, 200);
}

function enterPhase(next: Phase) {
  phase.value = next;
  phaseTicks = 0;
  buttonPosition.value = null;
  dodgeCount.value = 0;
  lastPointerType = "";
  resetTimer();
  void nextTick(() => {
    if (disposed || phase.value !== next) return;
    (next === "annoyed" ? honestYesButton.value : stageHeading.value)?.focus({
      preventScroll: true,
    });
  });
}

function startTest() {
  if (disposed) return;
  silence();
  celebration?.reset();
  paused.value = false;
  progress.value = 0;
  captchaStep.value = 1;
  consentChecked.value = false;
  consentTricked.value = false;
  sliderValue.value = 50;
  sliderTarget.value = 70;
  sliderTricked.value = false;
  sequenceStep.value = 0;
  typedPhrase.value = "";
  typingTricked.value = false;
  counterClicks.value = 0;
  counterTricked.value = false;
  oppositeStep.value = 0;
  memoryRevealed.value = true;
  memoryStep.value = 0;
  interruptions.value = 0;
  status.value = "តោះ! ចុច «មែនហើយ»។";
  enterPhase("question");
}

function togglePause() {
  if (disposed || phase.value === "start" || phase.value === "result") return;
  paused.value = !paused.value;
  if (paused.value) {
    silence();
    celebration?.reset();
  }
  resetTimer();
}

function toggleSound() {
  if (!active.value || disposed) return;
  if (soundEnabled.value) silence();
  else {
    soundEnabled.value = true;
    ping();
  }
}

function moveRunaway() {
  // The joke is finite: four escapes, then the button stays put so everyone can finish.
  if (
    disposed ||
    !active.value ||
    reducedMotion.value ||
    dodgeCount.value >= 4 ||
    !playground.value ||
    !runaway.value
  )
    return false;
  const width = Math.max(
    0,
    playground.value.clientWidth - runaway.value.offsetWidth - 24,
  );
  const height = Math.max(
    0,
    playground.value.clientHeight - runaway.value.offsetHeight - 24,
  );
  const current = buttonPosition.value ?? {
    x: width / 2 + 12,
    y: height / 2 + 12,
  };
  const x = 12 + Math.random() * width;
  buttonPosition.value = {
    x:
      Math.abs(x - current.x) < width / 3
        ? current.x < width / 2
          ? width + 12
          : 12
        : x,
    y: 12 + Math.random() * height,
  };
  dodgeCount.value++;
  interruptions.value++;
  status.value =
    dodgeCount.value === 4
      ? "បានហើយ! ប៊ូតុងឈប់រត់ហើយ។"
      : "ជិតចុចត្រូវហើយ… តែនៅតែអត់បាន!";
  ping();
  return true;
}

function dodge(event: PointerEvent) {
  if (
    !["question", "annoyed"].includes(phase.value) ||
    event.pointerType === "touch" ||
    document.activeElement === runaway.value
  )
    return;
  moveRunaway();
}

function recordPointer(event: PointerEvent) {
  lastPointerType = event.pointerType;
}

function answerPatience(event: MouseEvent) {
  if (!active.value || phase.value !== "question" || disposed) return;
  // Touch gets the same gag on tap; keyboard and assistive clicks can proceed immediately.
  if (event.detail > 0 && lastPointerType === "touch" && moveRunaway()) return;
  progress.value = 0;
  status.value = "ចុចបានហើយ! នេះទើបតែជាជំហានងាយទេ។";
  ping();
  enterPhase("loading");
}

function selectCaptcha(index: number) {
  if (!active.value || phase.value !== "captcha" || disposed) return;
  if (captchaTiles.value[index]?.id !== captchaTarget.value.id) {
    status.value = `ខុសហើយ។ សូមជ្រើសរើស${captchaTarget.value.label}។`;
    interruptions.value++;
    ping();
    return;
  }
  ping();
  if (captchaStep.value < captchaTotal) {
    captchaStep.value++;
    status.value = "ត្រូវហើយ។ នៅសល់មួយទៀត… ហើយមួយទៀត។";
  } else {
    status.value = "ផ្ទៀងផ្ទាត់រួចហើយ! ឥឡូវសាកតេស្តបន្ថែមបន្តិច។";
    enterPhase("consent");
  }
}

function checkConsent() {
  if (!active.value || phase.value !== "consent" || disposed) return;
  if (consentChecked.value && !consentTricked.value) {
    // Each prank fires once so every test remains possible to finish.
    consentTricked.value = true;
    consentChecked.value = false;
    interruptions.value++;
    status.value = "អូ៎ ធីកបាត់ទៅហើយ! សាកធីកម្ដងទៀត។";
    ping();
  }
}

function submitConsent() {
  if (
    !active.value ||
    phase.value !== "consent" ||
    disposed ||
    !consentChecked.value
  )
    return;
  status.value = "ធីកនៅជាប់ហើយ! តោះ មើលពណ៌បន្ត។";
  ping();
  enterPhase("color");
}

function selectColor(id: string) {
  if (!active.value || phase.value !== "color" || disposed) return;
  if (id !== "blue") {
    interruptions.value++;
    status.value = "មើលពណ៌របស់អក្សរ មិនមែនអត្ថន័យរបស់ពាក្យទេ។";
    ping();
    return;
  }
  status.value = "ភ្នែកមិនចាញ់ពាក្យទេ! ឥឡូវរំកិលឲ្យចំលេខ។";
  ping();
  enterPhase("slider");
}

function submitSlider() {
  if (!active.value || phase.value !== "slider" || disposed) return;
  if (
    !Number.isFinite(sliderValue.value) ||
    sliderValue.value !== sliderTarget.value
  ) {
    interruptions.value++;
    status.value = `មិនទាន់ចំទេ។ ត្រូវរំកិលទៅ ${sliderTarget.value}។`;
    ping();
    return;
  }
  if (!sliderTricked.value) {
    sliderTricked.value = true;
    sliderTarget.value = 73;
    interruptions.value++;
    status.value = "អូ៎ ប្ដូរចិត្តហើយ! សុំលេខ 73 វិញ។ ប្ដូរតែម្ដងនេះទេ។";
    ping();
    return;
  }
  status.value = "ចំលេខហើយ! នៅសល់តេស្តរាប់លេខមួយទៀត។";
  ping();
  enterPhase("sequence");
}

function selectSequence(number: number) {
  if (!active.value || phase.value !== "sequence" || disposed) return;
  if (number !== sequenceOrder[sequenceStep.value]) {
    sequenceStep.value = 0;
    interruptions.value++;
    status.value = "ខុសលំដាប់ហើយ! ចាប់ពី 3 ម្ដងទៀត។";
    ping();
    return;
  }
  sequenceStep.value++;
  ping();
  if (sequenceStep.value === sequenceOrder.length) {
    status.value = "រាប់បានហើយ! ឥឡូវសាកវាយឃ្លាខ្លីមួយ។";
    enterPhase("typing");
  } else {
    status.value = "ត្រូវហើយ! ប៊ូតុងប្ដូរកន្លែង តែលំដាប់នៅដដែល។";
  }
}

function submitPhrase() {
  if (!active.value || phase.value !== "typing" || disposed) return;
  if (
    typedPhrase.value.trim().normalize("NFC") !==
    requiredPhrase.normalize("NFC")
  ) {
    interruptions.value++;
    status.value = "មិនទាន់ត្រូវទេ។ វាយឃ្លាដូចគំរូខាងលើ។";
    ping();
    return;
  }
  if (!typingTricked.value) {
    // Clear only the first correct submission; the second must always let the user proceed.
    typingTricked.value = true;
    typedPhrase.value = "";
    interruptions.value++;
    status.value = "អូ៎ អក្សរបាត់អស់ហើយ! វាយម្ដងទៀត លើកនេះរក្សាទុកឲ្យ។";
    ping();
    void nextTick(() => {
      if (active.value && phase.value === "typing" && !disposed)
        phraseInput.value?.focus({ preventScroll: true });
    });
    return;
  }
  status.value = "រក្សាឃ្លាបានហើយ! ឥឡូវចុចឲ្យបានប្រាំដង។";
  ping();
  enterPhase("counter");
}

function clickCounter() {
  if (!active.value || phase.value !== "counter" || disposed) return;
  counterClicks.value++;
  ping();
  if (counterClicks.value === 3 && !counterTricked.value) {
    counterTricked.value = true;
    counterClicks.value = 0;
    interruptions.value++;
    status.value =
      "អូ៎ ម៉ាស៊ីនភ្លេចរាប់! ចាប់ពីសូន្យម្ដងទៀត។ លើកនេះមិនភ្លេចទេ។";
  } else if (counterClicks.value === counterTotal) {
    status.value = "ចុចគ្រប់ហើយ! តោះ មើលព្រួញបន្ត។";
    enterPhase("opposite");
  } else {
    status.value = `ចុចបាន ${counterClicks.value}/${counterTotal}។ បន្តិចទៀត!`;
  }
}

function selectOpposite(id: string) {
  if (!active.value || phase.value !== "opposite" || disposed) return;
  if (id !== directionPrompt.value.opposite) {
    interruptions.value++;
    status.value = "ត្រូវជ្រើសទិសផ្ទុយពីព្រួញ មិនមែនទិសដូចគ្នាទេ។";
    ping();
    return;
  }
  oppositeStep.value++;
  ping();
  if (oppositeStep.value === oppositeTotal) {
    status.value = "ជ្រើសទិសបានហើយ! ឥឡូវចងចាំលំដាប់រូប។";
    enterPhase("memory");
  } else {
    status.value = "ត្រូវហើយ! ព្រួញបន្ទាប់មកហើយ។";
  }
}

function beginMemory() {
  if (
    !active.value ||
    phase.value !== "memory" ||
    disposed ||
    !memoryRevealed.value
  )
    return;
  memoryRevealed.value = false;
  memoryStep.value = 0;
  status.value = "ចុចរូបតាមលំដាប់ដែលអ្នកបានឃើញ។";
  ping();
}

function showMemory() {
  if (!active.value || phase.value !== "memory" || disposed) return;
  memoryRevealed.value = true;
  memoryStep.value = 0;
  status.value = "មើលម្ដងទៀតបាន។ ចងចាំពីឆ្វេងទៅស្ដាំ។";
}

function selectMemory(id: string) {
  if (
    !active.value ||
    phase.value !== "memory" ||
    disposed ||
    memoryRevealed.value
  )
    return;
  if (id !== memoryPattern[memoryStep.value]?.id) {
    memoryStep.value = 0;
    interruptions.value++;
    status.value = "ខុសលំដាប់ហើយ! ចាប់ពីរូបដំបូង ឬមើលគំរូម្ដងទៀត។";
    ping();
    return;
  }
  memoryStep.value++;
  ping();
  if (memoryStep.value === memoryPattern.length) {
    status.value = "ចងចាំបានហើយ! នៅសល់តេស្តលេខមួយទៀត។";
    enterPhase("size");
  } else {
    status.value = "ត្រូវហើយ! ចុចរូបបន្ទាប់។";
  }
}

function selectLargest(value: number) {
  if (!active.value || phase.value !== "size" || disposed) return;
  if (value !== 42) {
    interruptions.value++;
    status.value = "មើលតម្លៃលេខ មិនមែនទំហំអក្សរទេ។";
    ping();
    return;
  }
  status.value = "តេស្តទាំង 9 ចប់ហើយ! នៅសល់សំណួរចុងក្រោយ។";
  ping();
  enterPhase("annoyed");
}

function answerNo() {
  if (!active.value || phase.value !== "annoyed" || disposed) return;
  if (!moveRunaway()) status.value = "នៅតែអត់ធ្មត់? ចុច «មែនហើយ» ពេលធុញហើយណា។";
}

function answerAnnoyed() {
  if (!active.value || phase.value !== "annoyed" || disposed) return;
  ping();
  status.value = "កំពុងគណនាពិន្ទុ… កុំទាន់ទៅណា!";
  enterPhase("honest");
  if (reducedMotion.value || !confettiCanvas.value) return;
  try {
    celebration ??= confetti.create(confettiCanvas.value, {
      resize: true,
      useWorker: false,
    });
    void celebration({
      particleCount: 120,
      spread: 95,
      ticks: 180,
      origin: { y: 0.65 },
      colors: ["#60a5fa", "#2563eb", "#fbbf24", "#fb7185"],
      disableForReducedMotion: true,
    })?.catch(() => undefined);
  } catch {
    // The score still completes if the browser cannot render the decorative canvas.
  }
}

function visibilityChanged() {
  tabHidden.value = document.hidden;
  if (tabHidden.value) {
    silence();
    celebration?.reset();
  }
  resetTimer();
}

function motionChanged() {
  reducedMotion.value = !!media?.matches;
  if (reducedMotion.value) {
    buttonPosition.value = null;
    celebration?.reset();
  }
}

function resizePlayground() {
  buttonPosition.value = null;
}

onMounted(() => {
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionChanged();
  media.addEventListener("change", motionChanged);
  document.addEventListener("visibilitychange", visibilityChanged);
  window.addEventListener("resize", resizePlayground);
  tabHidden.value = document.hidden;
});

onBeforeUnmount(() => {
  disposed = true;
  ++timerRevision;
  if (timer !== undefined) clearInterval(timer);
  silence();
  celebration?.reset();
  media?.removeEventListener("change", motionChanged);
  document.removeEventListener("visibilitychange", visibilityChanged);
  window.removeEventListener("resize", resizePlayground);
});
</script>

<template>
  <main
    class="patience-page"
    lang="km"
    :class="{ 'test-active': active, 'motion-reduced': reducedMotion }"
  >
    <header class="control-bar">
      <NuxtLink to="/" class="brand"
        >ChlatWork<span>តេស្តភាពអត់ធ្មត់</span></NuxtLink
      >
      <div class="controls">
        <button
          type="button"
          :disabled="!active"
          :aria-pressed="soundEnabled"
          @click="toggleSound"
        >
          {{ soundEnabled ? "បិទសំឡេង" : "បើកសំឡេង" }}
        </button>
        <button
          type="button"
          :disabled="phase === 'start' || phase === 'result'"
          :aria-pressed="paused"
          @click="togglePause"
        >
          {{ paused ? "បន្ត" : "ផ្អាក" }}
        </button>
        <NuxtLink to="/" class="exit"
          >ចាកចេញ <span aria-hidden="true">↗</span></NuxtLink
        >
      </div>
    </header>
    <section class="test-focus" aria-label="តេស្តភាពអត់ធ្មត់">
      <div class="challenge">
        <div class="challenge-body">
          <p class="stage-label">
            {{ paused ? "ផ្អាកសិន យកខ្យល់បន្តិច" : stageLabel }}
          </p>
          <span class="stage-icon" aria-hidden="true">{{ stageIcon }}</span>
          <h1 ref="stageHeading" class="stage-title" tabindex="-1">
            {{ stageTitle }}
          </h1>
          <div v-if="phase === 'start'" class="start-stage">
            <p class="stage-copy">
              ចុចប៊ូតុងខាងក្រោម ដើម្បីសាកល្បង។<br />ចាំមើលថា
              អ្នកអាចអត់ធ្មត់បានប៉ុន្មាន!
            </p>
            <button type="button" class="primary-button" @click="startTest">
              ចាប់ផ្ដើមតេស្ត <span aria-hidden="true">→</span>
            </button>
          </div>
          <div
            v-else-if="phase === 'question'"
            ref="playground"
            class="playground"
          >
            <button
              ref="runaway"
              type="button"
              class="runaway-button"
              :class="{ 'has-position': buttonPosition }"
              :style="buttonStyle"
              :disabled="!active"
              @pointerenter="dodge"
              @pointerdown="recordPointer"
              @click="answerPatience"
            >
              មែនហើយ <span aria-hidden="true">☺</span>
            </button>
            <span class="target-footer">សាកចុចប៊ូតុងខាងលើទៅ!</span>
          </div>
          <div v-else-if="loadingStage" class="loading-stage">
            <div class="loading-label">
              <span>{{
                phase === "retry-loading"
                  ? "ផ្ទុកពីដំបូងឡើងវិញ"
                  : "កំពុងពិនិត្យភាពអត់ធ្មត់"
              }}</span
              ><strong>{{ progress }}%</strong>
            </div>
            <div
              class="progress-track"
              role="progressbar"
              aria-label="កំពុងពិនិត្យភាពអត់ធ្មត់"
              :aria-valuenow="progress"
              :aria-valuemin="0"
              :aria-valuemax="100"
            >
              <div :style="{ width: progress + '%' }" />
            </div>
            <p class="loading-caption">
              {{
                phase === "unstable"
                  ? "សូមរីករាយជាមួយការចាប់ផ្ដើមពីដំបូងវិញ។"
                  : "ពេលវេលានៅសល់៖ បន្តិចទៀត… ប្រហែល។"
              }}
            </p>
            <span class="loading-spinner" aria-hidden="true">✳</span>
          </div>
          <div v-else-if="phase === 'captcha'" class="captcha-stage">
            <p class="captcha-count" aria-live="polite">
              ផ្ទៀងផ្ទាត់ {{ captchaStep }}/{{ captchaTotal }}
            </p>
            <p class="stage-copy">សូមជ្រើសរើស{{ captchaTarget.label }}។</p>
            <div
              class="captcha-grid"
              :aria-label="'ជ្រើសរើស' + captchaTarget.label"
            >
              <button
                v-for="(tile, index) in captchaTiles"
                :key="index"
                type="button"
                :disabled="!active"
                :aria-label="'រូបទី ' + (index + 1) + '៖ ' + tile.label"
                @click="selectCaptcha(index)"
              >
                <span aria-hidden="true">{{ tile.icon }}</span>
              </button>
            </div>
          </div>
          <form
            v-else-if="phase === 'consent'"
            class="extra-stage"
            @submit.prevent="submitConsent"
          >
            <p class="stage-copy">
              ធីកប្រអប់ខាងក្រោម រួចចុចបន្ត។ ងាយណាស់មែនទេ?
            </p>
            <label class="consent-option">
              <input
                v-model="consentChecked"
                type="checkbox"
                :disabled="!active"
                @change="checkConsent"
              />
              <span>ខ្ញុំនៅតែអត់ធ្មត់បាន</span>
            </label>
            <button
              type="submit"
              class="primary-button"
              :disabled="!active || !consentChecked"
            >
              បន្តទៅមុខ
            </button>
          </form>
          <div v-else-if="phase === 'color'" class="extra-stage">
            <p class="stage-copy">សូមជ្រើសរើសពណ៌របស់អក្សរខាងក្រោម។</p>
            <p
              class="color-word"
              role="img"
              aria-label="ពាក្យ «ក្រហម» មានពណ៌ខៀវ"
            >
              ក្រហម
            </p>
            <div
              class="answer-options"
              role="group"
              aria-label="ជ្រើសរើសពណ៌អក្សរ"
            >
              <button
                v-for="choice in colorChoices"
                :key="choice.id"
                type="button"
                :disabled="!active"
                @click="selectColor(choice.id)"
              >
                <span
                  class="color-dot"
                  :style="{ backgroundColor: choice.color }"
                  aria-hidden="true"
                />
                {{ choice.label }}
              </button>
            </div>
          </div>
          <form
            v-else-if="phase === 'slider'"
            class="extra-stage"
            @submit.prevent="submitSlider"
          >
            <label for="precision-slider" class="stage-copy slider-label">
              រំកិលទៅលេខ <strong>{{ sliderTarget }}</strong> រួចចុចបញ្ជាក់។
            </label>
            <output for="precision-slider" class="slider-value">{{
              sliderValue
            }}</output>
            <input
              id="precision-slider"
              v-model.number="sliderValue"
              class="precision-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              :disabled="!active"
            />
            <button type="submit" class="primary-button" :disabled="!active">
              បញ្ជាក់លេខ
            </button>
          </form>
          <div v-else-if="phase === 'sequence'" class="extra-stage">
            <p class="stage-copy">
              ចុចតាមលំដាប់ 3 → 2 → 1។ កុំចាញ់កន្លែងប៊ូតុង!
            </p>
            <p class="captcha-count" aria-live="polite">
              ចុចបាន {{ sequenceStep }}/3
            </p>
            <div
              class="answer-options number-options"
              role="group"
              aria-label="ចុចលេខតាមលំដាប់ថយក្រោយ"
            >
              <button
                v-for="number in sequenceChoices"
                :key="number"
                type="button"
                :disabled="!active"
                :aria-label="'លេខ ' + number"
                @click="selectSequence(number)"
              >
                {{ number }}
              </button>
            </div>
          </div>
          <form
            v-else-if="phase === 'typing'"
            class="extra-stage"
            @submit.prevent="submitPhrase"
          >
            <label for="patience-phrase" class="stage-copy slider-label">
              វាយឃ្លាខាងក្រោមឲ្យដូចគំរូ៖
              <strong class="phrase-sample">{{ requiredPhrase }}</strong>
            </label>
            <input
              id="patience-phrase"
              ref="phraseInput"
              v-model="typedPhrase"
              class="phrase-input"
              type="text"
              maxlength="64"
              autocomplete="off"
              :spellcheck="false"
              :disabled="!active"
            />
            <button type="submit" class="primary-button" :disabled="!active">
              បញ្ជាក់ឃ្លា
            </button>
          </form>
          <div v-else-if="phase === 'counter'" class="extra-stage">
            <p class="stage-copy">
              ចុចប៊ូតុងឲ្យបាន {{ counterTotal }} ដង។ ចុចពិតៗណា!
            </p>
            <p class="captcha-count" aria-live="polite">
              ចុចបាន {{ counterClicks }}/{{ counterTotal }}
            </p>
            <button
              type="button"
              class="primary-button"
              :disabled="!active"
              @click="clickCounter"
            >
              ចុចទីនេះ
            </button>
          </div>
          <div v-else-if="phase === 'opposite'" class="extra-stage">
            <p class="stage-copy">
              ចុចទិសផ្ទុយពីព្រួញខាងក្រោម។ កុំឲ្យដៃចាញ់ភ្នែក!
            </p>
            <p class="captcha-count" aria-live="polite">
              ឆ្លើយបាន {{ oppositeStep }}/{{ oppositeTotal }}
            </p>
            <p
              class="direction-prompt"
              role="img"
              :aria-label="'ព្រួញ ' + directionPrompt.label"
            >
              {{ directionPrompt.icon }}
            </p>
            <div
              class="answer-options direction-options"
              role="group"
              aria-label="ជ្រើសទិសផ្ទុយពីព្រួញ"
            >
              <button
                v-for="choice in directionChoices"
                :key="choice.id"
                type="button"
                :disabled="!active"
                @click="selectOpposite(choice.id)"
              >
                <span class="direction-icon" aria-hidden="true">{{
                  choice.icon
                }}</span>
                {{ choice.label }}
              </button>
            </div>
          </div>
          <div v-else-if="phase === 'memory'" class="extra-stage">
            <p class="stage-copy">
              {{
                memoryRevealed
                  ? "ចងចាំរូបពីឆ្វេងទៅស្ដាំ រួចចុចលាក់គំរូ។"
                  : "ចុចរូបតាមលំដាប់ដើម។ កុំប្ដូរលំដាប់ណា!"
              }}
            </p>
            <div
              class="memory-slots"
              role="group"
              aria-label="លំដាប់រូបដែលត្រូវចងចាំ"
            >
              <span
                v-for="(fruit, index) in memoryPattern"
                :key="fruit.id"
                role="img"
                :aria-label="
                  memoryRevealed || index < memoryStep
                    ? fruit.label
                    : 'រូបទី ' + (index + 1) + ' លាក់'
                "
              >
                {{ memoryRevealed || index < memoryStep ? fruit.icon : "?" }}
              </span>
            </div>
            <button
              v-if="memoryRevealed"
              type="button"
              class="primary-button"
              :disabled="!active"
              @click="beginMemory"
            >
              ចងចាំហើយ! លាក់គំរូ
            </button>
            <template v-else>
              <p class="captcha-count" aria-live="polite">
                ចងចាំបាន {{ memoryStep }}/{{ memoryPattern.length }}
              </p>
              <div
                class="answer-options fruit-options"
                role="group"
                aria-label="ជ្រើសរូបតាមលំដាប់ដែលបានចងចាំ"
              >
                <button
                  v-for="fruit in fruitChoices"
                  :key="fruit.id"
                  type="button"
                  :disabled="!active"
                  :aria-label="fruit.label"
                  @click="selectMemory(fruit.id)"
                >
                  <span aria-hidden="true">{{ fruit.icon }}</span>
                </button>
              </div>
              <button
                type="button"
                class="text-button"
                :disabled="!active"
                @click="showMemory"
              >
                មើលគំរូម្ដងទៀត
              </button>
            </template>
          </div>
          <div v-else-if="phase === 'size'" class="extra-stage">
            <p class="stage-copy">
              ជ្រើសលេខដែលមានតម្លៃធំជាងគេ។ ទំហំអក្សរបោកភ្នែកទេ!
            </p>
            <div
              class="answer-options size-options"
              role="group"
              aria-label="ជ្រើសលេខដែលមានតម្លៃធំបំផុត"
            >
              <button
                v-for="choice in sizeChoices"
                :key="choice.value"
                type="button"
                :class="'size-' + choice.size"
                :disabled="!active"
                :aria-label="'លេខ ' + choice.value"
                @click="selectLargest(choice.value)"
              >
                {{ choice.value }}
              </button>
            </div>
          </div>
          <div v-else-if="phase === 'honest'" class="honest-stage">
            <p class="stage-copy">ទីបំផុត មានចម្លើយដែលអាចជឿបានហើយ!</p>
          </div>
          <div v-else-if="phase === 'result'" class="result-stage">
            <strong>2%</strong>
            <p class="stage-copy">អ្នកបានដល់ចប់ហើយ។ ស៊ូបានល្អណាស់!</p>
            <button type="button" class="primary-button" @click="startTest">
              សាកម្ដងទៀត <span aria-hidden="true">↻</span>
            </button>
          </div>
          <p v-else class="stage-copy">
            សន្យាថា នេះជាសំណួរចុងក្រោយ។<br />យើងធ្លាប់សន្យាបែបនេះរួចហើយ!
          </p>
          <p class="status" role="status" aria-live="polite">
            {{ paused ? "សម្រាកបន្តិចសិន។ ចុច «បន្ត» ពេលរួចរាល់។" : status }}
          </p>
        </div>
        <div v-if="phase !== 'start'" class="challenge-footer">
          <span>រំខាន {{ interruptions }} ដង</span>
          <button v-if="phase !== 'result'" type="button" @click="startTest">
            ចាប់ផ្ដើមឡើងវិញ
          </button>
        </div>
      </div>
    </section>
    <div v-if="phase === 'annoyed'" class="popup-layer">
      <section
        class="annoyance-popup"
        role="dialog"
        aria-labelledby="annoyed-title"
        :aria-describedby="paused ? 'paused-popup' : undefined"
      >
        <p class="stage-label">សំណួរចុងក្រោយហើយណា</p>
        <span class="popup-icon" aria-hidden="true">😏</span>
        <h2 id="annoyed-title">ធុញហើយមែនទេ?</h2>
        <p v-if="paused" id="paused-popup" class="stage-copy">
          ផ្អាកសិន។ ចុច «បន្ត» ពេលរួចរាល់។
        </p>
        <div ref="playground" class="playground no-playground">
          <button
            ref="runaway"
            type="button"
            class="runaway-button"
            :class="{ 'has-position': buttonPosition }"
            :style="buttonStyle"
            :disabled="!active"
            @pointerenter="dodge"
            @click="answerNo"
          >
            អត់ទេ <span aria-hidden="true">🙃</span>
          </button>
          <span class="target-footer">ប៊ូតុង «អត់ទេ» ក៏ចេះរត់ដែរ។</span>
        </div>
        <button
          ref="honestYesButton"
          type="button"
          class="primary-button honest-button"
          :disabled="!active"
          @click="answerAnnoyed"
        >
          មែនហើយ! ធុញណាស់!
        </button>
      </section>
    </div>
    <canvas ref="confettiCanvas" class="confetti-canvas" aria-hidden="true" />
  </main>
</template>

<style scoped>
.patience-page {
  --control-space: calc(96px + env(safe-area-inset-top));
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  background:
    radial-gradient(ellipse at 50% 0, rgb(59 130 246 / 8%), transparent 60%),
    var(--app-color-page-bg);
  color: var(--app-color-text);
  font-family: "Hanuman", var(--app-font);
}
.control-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: min(900px, 100%);
  margin: 0 auto;
  padding: max(18px, env(safe-area-inset-top))
    max(24px, env(safe-area-inset-right)) 18px
    max(24px, env(safe-area-inset-left));
  background: var(--app-color-page-bg);
}
.brand {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: inherit;
  text-decoration: none;
  font-size: 19px;
  font-weight: 700;
  line-height: 1.6;
}
.brand span {
  color: var(--app-color-muted-text);
  font-size: 12px;
  font-weight: 400;
}
.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
button,
a {
  -webkit-tap-highlight-color: transparent;
}
.controls button,
.exit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 9px 14px;
  border: 1px solid var(--app-color-border);
  border-radius: 12px;
  background: var(--app-color-card-bg);
  color: inherit;
  font: inherit;
  font-size: 12px;
  text-decoration: none;
  cursor: pointer;
}
.exit {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
button:disabled {
  opacity: 0.45;
  cursor: default;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid #60a5fa;
  outline-offset: 4px;
}
.test-focus {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 24px 20px max(40px, env(safe-area-inset-bottom));
}
.challenge {
  width: min(560px, 100%);
  overflow: hidden;
  border: 1px solid var(--app-color-border);
  border-radius: 28px;
  background: var(--app-color-card-bg);
  box-shadow: 0 20px 70px rgb(15 23 42 / 8%);
}
.challenge-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 440px;
  padding: 32px;
}
.stage-label {
  margin: 0;
  padding: 5px 13px;
  border-radius: 999px;
  background: rgb(59 130 246 / 10%);
  color: var(--app-color-text);
  font-size: 12px;
  line-height: 1.9;
}
.stage-icon {
  margin: 18px 0 12px;
  font-size: 60px;
  line-height: 1.2;
}
.stage-title {
  margin: 0;
  /* Keep the Khmer heading font when shared heading styles override inheritance. */
  font-family: inherit;
  font-size: clamp(22px, 4vw, 29px);
  font-weight: 700;
  line-height: 1.7;
  text-align: center;
}
.stage-copy {
  margin: 18px 0;
  color: var(--app-color-muted-text);
  font-size: 14px;
  line-height: 2;
  text-align: center;
}
.start-stage,
.loading-stage,
.captcha-stage,
.extra-stage,
.honest-stage,
.result-stage {
  width: 100%;
  text-align: center;
}
.primary-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: min(280px, 100%);
  min-height: 56px;
  margin: 24px auto;
  padding: 12px 20px;
  border: 0;
  border-radius: 16px;
  background: #2563eb;
  color: #fff;
  box-shadow: 0 8px 24px rgb(37 99 235 / 20%);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.8;
  cursor: pointer;
}
.primary-button:hover:not(:disabled) {
  background: #1d4ed8;
}
.primary-button > span {
  font-size: 22px;
}
.playground {
  position: relative;
  width: 100%;
  height: 230px;
  margin: 24px 0;
  overflow: hidden;
  border: 1px dashed var(--app-color-border-strong);
  border-radius: 20px;
  background: radial-gradient(var(--app-color-border) 1px, transparent 1px);
  background-size: 16px 16px;
}
.runaway-button {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transform: translate(-50%, -50%);
  min-height: 52px;
  padding: 12px 22px;
  border: 0;
  border-radius: 14px;
  background: #2563eb;
  color: #fff;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.8;
  white-space: nowrap;
  box-shadow: 0 5px 16px rgb(37 99 235 / 20%);
  cursor: pointer;
}
.runaway-button.has-position {
  transform: none;
}
.runaway-button > span {
  font-size: 22px;
  line-height: 1;
}
.target-footer {
  position: absolute;
  right: 8px;
  bottom: 12px;
  left: 8px;
  pointer-events: none;
  color: var(--app-color-muted-text);
  font-size: 11px;
  line-height: 1.8;
  text-align: center;
}
.loading-stage {
  padding-top: 28px;
}
.loading-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  line-height: 1.9;
  text-align: left;
}
.loading-label strong {
  color: #3b82f6;
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}
.progress-track {
  height: 12px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--app-color-progress-track);
}
.progress-track > div {
  height: 100%;
  border-radius: inherit;
  background: #3b82f6;
  transition: width 180ms ease;
}
.loading-caption {
  margin: 14px 0;
  color: var(--app-color-muted-text);
  font-size: 12px;
  line-height: 1.9;
}
.loading-spinner {
  display: block;
  width: max-content;
  margin: 24px auto;
  color: #3b82f6;
  font-size: 40px;
  line-height: 1;
  animation: loading-turn 3s linear infinite;
  animation-play-state: paused;
}
.test-active .loading-spinner {
  animation-play-state: running;
}
.captcha-count {
  display: inline-block;
  margin: 20px 0 0;
  padding: 6px 12px;
  border: 1px solid var(--app-color-border);
  border-radius: 12px;
  background: var(--app-color-card-muted-bg);
  font-size: 13px;
  line-height: 1.9;
  font-variant-numeric: tabular-nums;
}
.captcha-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: min(300px, 100%);
  margin: 0 auto 24px;
}
.captcha-grid button {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  min-height: 60px;
  border: 1px solid var(--app-color-border);
  border-radius: 16px;
  background: var(--app-color-card-muted-bg);
  font-size: 36px;
  line-height: 1;
  cursor: pointer;
}
.captcha-grid button:hover:not(:disabled) {
  border-color: #3b82f6;
  background: rgb(59 130 246 / 12%);
}
.consent-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 60px;
  padding: 14px;
  border: 1px solid var(--app-color-border);
  border-radius: 14px;
  background: var(--app-color-card-muted-bg);
  font-size: 14px;
  line-height: 1.9;
  cursor: pointer;
}
.consent-option input {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  accent-color: #2563eb;
}
.consent-option input:focus-visible,
.precision-slider:focus-visible {
  outline: 3px solid #60a5fa;
  outline-offset: 4px;
}
.phrase-sample {
  display: block;
  margin-top: 12px;
  color: var(--app-color-text);
  font-size: 20px;
}
.phrase-input {
  width: 100%;
  min-height: 56px;
  padding: 12px 16px;
  border: 1px solid var(--app-color-border);
  border-radius: 14px;
  background: var(--app-color-card-muted-bg);
  color: inherit;
  font: inherit;
  font-size: 16px;
  line-height: 1.9;
}
.phrase-input:focus-visible {
  outline: 3px solid #60a5fa;
  outline-offset: 4px;
}
.direction-prompt {
  margin: 16px 0;
  color: #3b82f6;
  font-size: 64px;
  line-height: 1.2;
}
.direction-options,
.fruit-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.direction-icon {
  font-size: 24px;
}
.memory-slots {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 20px 0;
}
.memory-slots > span {
  display: grid;
  place-items: center;
  width: 68px;
  min-height: 68px;
  border: 1px solid var(--app-color-border);
  border-radius: 14px;
  background: var(--app-color-card-muted-bg);
  font-size: 32px;
  line-height: 1;
}
.fruit-options button {
  font-size: 36px;
}
.text-button {
  min-height: 44px;
  margin: 0 0 20px;
  padding: 10px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  line-height: 1.9;
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
}
.size-options button {
  flex: 1;
  min-width: 72px;
  min-height: 90px;
}
.size-options .size-large {
  font-size: 56px;
}
.size-options .size-medium {
  font-size: 34px;
}
.size-options .size-small {
  font-size: 20px;
}
.color-word {
  margin: 16px 0 24px;
  color: #3b82f6;
  font-size: 40px;
  font-weight: 700;
  line-height: 1.8;
}
.answer-options {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin: 24px 0;
}
.answer-options button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 76px;
  min-height: 56px;
  padding: 12px 16px;
  border: 1px solid var(--app-color-border);
  border-radius: 14px;
  background: var(--app-color-card-muted-bg);
  color: inherit;
  font: inherit;
  font-size: 14px;
  line-height: 1.8;
  cursor: pointer;
}
.answer-options button:hover:not(:disabled) {
  border-color: #3b82f6;
  background: rgb(59 130 246 / 12%);
}
.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.slider-label {
  display: block;
}
.slider-value {
  display: block;
  margin: 16px 0;
  color: #3b82f6;
  font-size: 40px;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}
.precision-slider {
  display: block;
  width: 100%;
  height: 44px;
  margin: 0;
  accent-color: #2563eb;
  cursor: pointer;
}
.number-options button {
  font-size: 26px;
  font-variant-numeric: tabular-nums;
}
.result-stage > strong {
  display: block;
  margin-top: 22px;
  color: #3b82f6;
  font-family: var(--app-font);
  font-size: clamp(88px, 16vw, 120px);
  font-weight: 800;
  line-height: 1.15;
}
.status {
  width: 100%;
  min-height: 54px;
  margin: auto 0 0;
  padding: 12px 16px;
  border-radius: 14px;
  background: var(--app-color-card-muted-bg);
  color: var(--app-color-muted-text);
  font-size: 12px;
  line-height: 1.9;
  text-align: center;
}
.challenge-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 24px;
  border-top: 1px solid var(--app-color-border);
  color: var(--app-color-muted-text);
  font-size: 11px;
  line-height: 1.8;
}
.challenge-footer button {
  min-height: 44px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 11px;
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
}
.popup-layer {
  position: fixed;
  z-index: 20;
  inset: var(--control-space) 0 max(16px, env(safe-area-inset-bottom));
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(15 23 42 / 26%);
  backdrop-filter: blur(4px);
}
.annoyance-popup {
  width: min(440px, 100%);
  max-height: 100%;
  overflow: auto;
  padding: 28px;
  border: 1px solid var(--app-color-border);
  border-radius: 24px;
  background: var(--app-color-card-bg);
  box-shadow: 0 24px 80px rgb(15 23 42 / 20%);
  text-align: center;
}
.annoyance-popup .stage-label {
  display: inline-block;
}
.popup-icon {
  display: block;
  margin: 16px 0;
  font-size: 48px;
  line-height: 1.2;
}
.annoyance-popup h2 {
  margin: 0;
  font-family: inherit;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.7;
}
.no-playground {
  height: 156px;
  margin: 20px 0;
}
.no-playground .runaway-button {
  background: var(--app-color-card-muted-bg);
  color: var(--app-color-text);
  border: 1px solid var(--app-color-border);
  box-shadow: none;
}
.honest-button {
  width: 100%;
  margin: 0;
}
.confetti-canvas {
  position: fixed;
  inset: 0;
  z-index: 40;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
@keyframes loading-turn {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 560px) {
  .patience-page {
    --control-space: calc(144px + env(safe-area-inset-top));
  }
  .control-bar {
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding-left: 12px;
    padding-right: 12px;
  }
  .brand {
    align-items: center;
  }
  .controls {
    gap: 6px;
  }
  .controls button,
  .exit {
    padding: 9px 12px;
  }
  .test-focus {
    padding: 20px 12px max(28px, env(safe-area-inset-bottom));
  }
  .challenge {
    border-radius: 22px;
  }
  .challenge-body {
    padding: 24px 20px;
  }
  .stage-title {
    font-size: 23px;
  }
  .stage-icon {
    font-size: 52px;
  }
  .challenge-footer {
    padding: 10px 20px;
  }
  .annoyance-popup {
    padding: 24px 20px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
.motion-reduced .loading-spinner {
  animation: none;
}
.motion-reduced .progress-track > div {
  transition: none;
}
</style>
