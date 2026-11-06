<script setup lang="ts">
import { useLanguage } from "~/composables/useLanguage";
import { useAppI18n } from "~/composables/useAppI18n";
import confetti from "canvas-confetti";
import { createSwatSoundPlayer } from "~/lib/cockroach-sound";

const { t } = useAppI18n();
const { isKhmer } = useLanguage();

definePageMeta({ layout: false, blankCanvas: true, pageTransition: false });
useSeoMeta({
  title: () => t("native.patience.donTGetMadChlatwork"),
  description:
    () => t("native.patience.testYourPatienceWithARunawayButtonRepeatedLoadingThree"),
  robots: "noindex, nofollow",
});
useHead(() => ({ htmlAttrs: { lang: isKhmer.value ? "km" : "en" } }));

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
const challengePhases = [
  "consent",
  "color",
  "slider",
  "sequence",
  "typing",
  "counter",
  "opposite",
  "memory",
  "size",
] as const;
type ChallengePhase = (typeof challengePhases)[number];
const challengeOrder = shallowRef<ChallengePhase[]>([...challengePhases]);
type FeedbackKind = "correct" | "wrong" | "prank";
type Feedback = {
  kind: Exclude<FeedbackKind, "correct">;
  title: string;
  message: string;
  taunt: string;
};
const feedback = shallowRef<Feedback | null>(null);
const feedbackDialog = ref<HTMLDialogElement | null>(null);
let feedbackReturnTarget: HTMLElement | null = null;
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
const consentPrompt = ref(t("native.patience.iCanStillBePatient"));
const consentTricked = ref(false);
const sliderValue = ref(50);
const sliderTarget = ref(70);
const sliderOriginalTarget = ref(70);
const sliderSecondTarget = ref(73);
const sliderTricked = ref(false);
const sequenceStep = ref(0);
const sequenceOrder = shallowRef([3, 2, 1]);
const sequenceChoices = computed(() => {
  const choices = [...sequenceOrder.value].sort((a, b) => a - b);
  return choices.map(
    (_, index) => choices[(index + sequenceStep.value) % choices.length]!,
  );
});
const colorChoices = [
  { id: "red", label: t("native.patience.red"), color: "#ef4444" },
  { id: "blue", label: t("native.patience.blue"), color: "#3b82f6" },
  { id: "green", label: t("native.patience.green"), color: "#16a34a" },
];
const inkColor = shallowRef(colorChoices[1]!);
const colorWord = shallowRef(colorChoices[0]!);
const requiredPhrase = ref("ខ្ញុំអត់ធ្មត់");
const typedPhrase = ref("");
const typingTricked = ref(false);
const phraseInput = ref<HTMLInputElement | null>(null);
const counterClicks = ref(0);
const counterTricked = ref(false);
const counterTotal = ref(5);
const counterResetAt = ref(3);
const oppositeStep = ref(0);
const oppositeTotal = 3;
const directionChoices = [
  { id: "up", icon: "↑", label: t("native.patience.up"), opposite: "down" },
  { id: "right", icon: "→", label: t("native.patience.right"), opposite: "left" },
  { id: "down", icon: "↓", label: t("native.patience.down"), opposite: "up" },
  { id: "left", icon: "←", label: t("native.patience.left"), opposite: "right" },
];
const oppositePrompts = shallowRef(directionChoices.slice(0, oppositeTotal));
const directionPrompt = computed(
  () => oppositePrompts.value[oppositeStep.value % oppositeTotal]!,
);
const fruitChoices = [
  { id: "orange", icon: "🍊", label: t("native.patience.orange") },
  { id: "grape", icon: "🍇", label: t("native.patience.grape") },
  { id: "apple", icon: "🍎", label: t("native.patience.apple") },
  { id: "banana", icon: "🍌", label: t("native.patience.banana") },
];
// The answer grid differs from the pattern so remembering it requires more than reading across.
const memoryPattern = shallowRef([
  fruitChoices[2]!,
  fruitChoices[1]!,
  fruitChoices[3]!,
]);
const memoryRevealed = ref(true);
const memoryStep = ref(0);
const sizeChoices = shallowRef([
  { value: 9, size: "large" },
  { value: 42, size: "small" },
  { value: 7, size: "medium" },
]);
const largestNumber = computed(() =>
  Math.max(...sizeChoices.value.map((choice) => choice.value)),
);
const status = ref(t("native.patience.aShortTestProbablyShortAnyway"));
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
    !feedback.value &&
    !paused.value &&
    !tabHidden.value,
);
const loadingStage = computed(() =>
  ["loading", "unstable", "retry-loading"].includes(phase.value),
);
const stageTitle = computed(
  () =>
    ({
      start: t("native.patience.testYourPatience"),
      question: t("native.patience.areYouReallyPatient"),
      loading: t("native.patience.testingYourPatience"),
      unstable: t("native.patience.unstableConnection"),
      "retry-loading": t("native.patience.letSStartAgain"),
      captcha: t("native.patience.proveYouReHuman"),
      consent: t("native.patience.justOneCheckbox"),
      color: t("native.patience.readTheColorNotTheWord"),
      slider: t("native.patience.moveToTheRightNumber"),
      sequence: t("native.patience.clickTheNumbersInOrder"),
      typing: t("native.patience.typeThePhraseOnceProbably"),
      counter: t("native.patience.clickEnoughTimes"),
      opposite: t("native.patience.chooseTheOppositeDirection"),
      memory: t("native.patience.rememberTheThreePictures"),
      size: t("native.patience.bigNumberSmallText"),
      annoyed: t("native.patience.justOneMoreQuestion"),
      honest: t("native.patience.thanksForBeingHonest"),
      result: t("native.patience.yourPatienceScore"),
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
const stageLabel = computed(() => {
  const index = challengeOrder.value.indexOf(phase.value as ChallengePhase);
  if (index >= 0)
    return t("native.patience.extraChallenge", { index: index + 1, challengeOrderLength: challengeOrder.value.length });
  return {
    start: t("native.patience.letSBegin"),
    question: t("native.patience.theFirstQuestion"),
    loading: t("native.patience.pleaseWait"),
    unstable: t("native.patience.oopsSomethingWentWrong"),
    "retry-loading": t("native.patience.hereWeGoAgain"),
    captcha: t("native.patience.verification"),
    annoyed: t("native.patience.theFinalQuestion"),
    honest: t("native.patience.finally"),
    result: t("native.patience.yourResult"),
  }[phase.value as Exclude<Phase, ChallengePhase>];
});
const insects = [
  { id: "cockroach", icon: "🪳", label: t("native.patience.cockroach") },
  { id: "butterfly", icon: "🦋", label: t("native.patience.butterfly") },
  { id: "ladybug", icon: "🐞", label: t("native.patience.ladybug") },
  { id: "bee", icon: "🐝", label: t("native.patience.bee") },
  { id: "ant", icon: "🐜", label: t("native.patience.ant") },
  { id: "beetle", icon: "🪲", label: t("native.patience.beetle") },
  { id: "mosquito", icon: "🦟", label: t("native.patience.mosquito") },
  { id: "spider", icon: "🕷️", label: t("native.patience.spider") },
  { id: "fly", icon: "🪰", label: t("native.patience.fly") },
];
const captchaTargets = shallowRef(insects.slice(0, captchaTotal));
const captchaRoundTiles = shallowRef(
  Array.from({ length: captchaTotal }, (_, round) =>
    insects.map(
      (_, index) => insects[(index + (round + 1) * 3) % insects.length]!,
    ),
  ),
);
const captchaTarget = computed(() => {
  return captchaTargets.value[(captchaStep.value - 1) % captchaTotal]!;
});
const captchaTiles = computed(
  () => captchaRoundTiles.value[(captchaStep.value - 1) % captchaTotal]!,
);
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

function shuffled<T>(items: readonly T[], previousFirst?: T): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap]!, result[index]!];
  }
  if (result.length > 1 && result[0] === previousFirst)
    result.push(result.shift()!);
  return result;
}

function pickDifferent<T>(items: readonly T[], previous: T): T {
  const choices = items.filter((item) => item !== previous);
  const pool = choices.length ? choices : items;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function rotateChallenges() {
  // Generate once after Start, never during rendering or a retry, to keep hints and answers consistent.
  challengeOrder.value = shuffled(challengePhases, challengeOrder.value[0]);
  captchaTargets.value = shuffled(insects, captchaTargets.value[0]).slice(
    0,
    captchaTotal,
  );
  captchaRoundTiles.value = Array.from({ length: captchaTotal }, () =>
    shuffled(insects),
  );
  consentPrompt.value = pickDifferent(
    [
      t("native.patience.iCanStillBePatient"),
      t("native.patience.iMNotBoredYet"),
      t("native.patience.iMReadyToContinue"),
      t("native.patience.iWonTGiveUp"),
    ],
    consentPrompt.value,
  );
  inkColor.value = pickDifferent(colorChoices, inkColor.value);
  colorWord.value = pickDifferent(
    colorChoices.filter((choice) => choice.id !== inkColor.value.id),
    colorWord.value,
  );
  sliderOriginalTarget.value = pickDifferent(
    [30, 40, 60, 70, 80],
    sliderOriginalTarget.value,
  );
  sliderTarget.value = sliderOriginalTarget.value;
  sliderSecondTarget.value = pickDifferent(
    [sliderTarget.value - 3, sliderTarget.value + 3],
    sliderSecondTarget.value,
  );
  const base = pickDifferent([1, 4, 7], Math.min(...sequenceOrder.value));
  sequenceOrder.value = shuffled([base, base + 1, base + 2]);
  requiredPhrase.value = pickDifferent(
    [
      "ខ្ញុំអត់ធ្មត់",
      "ខ្ញុំមិនទាន់ធុញទេ",
      "បន្តទៀតទៅ",
      "សូមកុំបោកខ្ញុំ",
      "ខ្ញុំមិនចុះចាញ់ទេ",
    ],
    requiredPhrase.value,
  );
  counterTotal.value = pickDifferent([4, 5, 6, 7], counterTotal.value);
  counterResetAt.value = pickDifferent(
    Array.from({ length: counterTotal.value - 2 }, (_, index) => index + 2),
    counterResetAt.value,
  );
  oppositePrompts.value = shuffled(
    directionChoices,
    oppositePrompts.value[0],
  ).slice(0, oppositeTotal);
  memoryPattern.value = shuffled(fruitChoices, memoryPattern.value[0]).slice(
    0,
    3,
  );
  const largest = pickDifferent(
    [24, 36, 42, 57, 68, 81, 93],
    largestNumber.value,
  );
  const smaller = shuffled([3, 5, 7, 9, 11, 13, 15, 17]).slice(0, 2);
  sizeChoices.value = shuffled([
    { value: smaller[0]!, size: "large" },
    { value: largest, size: "small" },
    { value: smaller[1]!, size: "medium" },
  ]);
}

function completeChallenge(message: string) {
  const index = challengeOrder.value.indexOf(phase.value as ChallengePhase);
  if (index < 0) return;
  const nextPhase: Phase =
    index + 1 < challengeOrder.value.length
      ? challengeOrder.value[index + 1]!
      : "annoyed";
  const instruction =
    nextPhase === "annoyed"
      ? t("native.patience.allNineChallengesAreDoneOneFinalQuestionRemains")
      : t("native.patience.theNextChallengeHasStarted");
  showFeedback("correct", `${message} ${instruction}`, nextPhase);
}

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
        status.value = t("native.patience.unstableConnectionYouVeWaitedAWhileSoWaitSome");
        enterPhase("unstable");
        ping();
      } else {
        status.value = t("native.patience.onlyThreeVerificationRoundsNoMoreThisTime");
        enterPhase("captcha");
      }
    } else if (phase.value === "unstable" && phaseTicks >= 8) {
      progress.value = 0;
      status.value = t("native.patience.youHaveToLoadAgainFrom0");
      enterPhase("retry-loading");
    } else if (phase.value === "honest" && phaseTicks >= 10) {
      status.value = t("native.patience.thisScoreIsJustAJokeDonTTakeIt");
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
    if (disposed || phase.value !== next || feedback.value) return;
    (next === "annoyed" ? honestYesButton.value : stageHeading.value)?.focus({
      preventScroll: true,
    });
  });
}

function showFeedback(kind: FeedbackKind, message: string, nextPhase?: Phase) {
  if (disposed || feedback.value) return;
  ping();
  if (kind === "correct") {
    // Routine success stays inline so every answer does not require another click.
    status.value = t("native.patience.correct", { message: message });
    if (nextPhase) enterPhase(nextPhase);
    return;
  }
  const copy = {
    wrong: {
      title: t("native.patience.wrong"),
      taunt: t("native.patience.clickedTooQuicklyGiveItAnotherTry"),
    },
    prank: {
      title: t("native.patience.youDidItRight"),
      taunt: t("native.patience.itSNotYourFaultThisTestJustLikesBeing"),
    },
  }[kind];
  status.value = message;
  feedbackReturnTarget = document.activeElement as HTMLElement | null;
  const entry: Feedback = { kind, message, ...copy };
  feedback.value = entry;
  resetTimer();
  void nextTick(() => {
    if (disposed || feedback.value !== entry) return;
    // A native modal traps focus and makes background answers inert until acknowledged.
    if (feedbackDialog.value && !feedbackDialog.value.open)
      feedbackDialog.value.showModal();
  });
}

function acknowledgeFeedback() {
  if (!feedback.value || disposed || paused.value || tabHidden.value) return;
  const returnTarget =
    phase.value === "typing"
      ? (phraseInput.value ?? feedbackReturnTarget)
      : feedbackReturnTarget;
  feedbackDialog.value?.close();
  feedback.value = null;
  feedbackReturnTarget = null;
  resetTimer();
  void nextTick(() => {
    if (disposed || feedback.value || !active.value) return;
    if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true });
    else stageHeading.value?.focus({ preventScroll: true });
  });
}

function startTest() {
  if (disposed) return;
  silence();
  celebration?.reset();
  feedbackDialog.value?.close();
  feedback.value = null;
  feedbackReturnTarget = null;
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
  rotateChallenges();
  interruptions.value = 0;
  status.value = t("native.patience.goOnClickYes");
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
      ? t("native.patience.allRightTheButtonHasStoppedRunning")
      : t("native.patience.soCloseButYouStillMissed");
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
  status.value = t("native.patience.youClickedItThatWasOnlyTheEasyPart");
  ping();
  enterPhase("loading");
}

function selectCaptcha(index: number) {
  if (!active.value || phase.value !== "captcha" || disposed) return;
  const target = captchaTarget.value;
  if (captchaTiles.value[index]?.id !== captchaTarget.value.id) {
    interruptions.value++;
    showFeedback(
      "wrong",
      t("native.patience.thatPictureIsnTAPleaseChoose", { targetLabel: target.label, targetIcon: target.icon }),
    );
    return;
  }
  if (captchaStep.value < captchaTotal) {
    captchaStep.value++;
    showFeedback(
      "correct",
      t("native.patience.youChoseCorrectlyInTheNextRoundChoose", { targetLabel: target.label, captchaTargetLabel: captchaTarget.value.label, captchaTargetIcon: captchaTarget.value.icon }),
    );
  } else {
    showFeedback(
      "correct",
      t("native.patience.allThreeVerificationRoundsAreCompleteTheExtraChallengesHave"),
      challengeOrder.value[0]!,
    );
  }
}

function checkConsent() {
  if (!active.value || phase.value !== "consent" || disposed) return;
  if (consentChecked.value && !consentTricked.value) {
    // Each prank fires once so every test remains possible to finish.
    consentTricked.value = true;
    consentChecked.value = false;
    interruptions.value++;
    showFeedback(
      "prank",
      t("native.patience.youCheckedItCorrectlyButTheTestUncheckedItselfCheck"),
    );
  } else if (consentChecked.value) {
    status.value = t("native.patience.checkedCorrectlyClickContinueToMoveOn");
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
  completeChallenge(t("native.patience.theBoxIsStillCheckedYouDidItRight"));
}

function selectColor(id: string) {
  if (!active.value || phase.value !== "color" || disposed) return;
  if (id !== inkColor.value.id) {
    interruptions.value++;
    showFeedback(
      "wrong",
      t("native.patience.theWordSaysButItsInkIsPleaseClick", { colorWordLabel: colorWord.value.label, inkColorLabel: inkColor.value.label }),
    );
    return;
  }
  completeChallenge(t("native.patience.theInkIsYouChoseCorrectly", { inkColorLabel: inkColor.value.label }));
}

function submitSlider() {
  if (!active.value || phase.value !== "slider" || disposed) return;
  if (
    !Number.isFinite(sliderValue.value) ||
    sliderValue.value !== sliderTarget.value
  ) {
    interruptions.value++;
    showFeedback(
      "wrong",
      t("native.patience.theTargetNumberIsMoveTheSliderUntilItShows", { sliderTarget: sliderTarget.value }),
    );
    return;
  }
  if (!sliderTricked.value) {
    sliderTricked.value = true;
    sliderTarget.value = sliderSecondTarget.value;
    interruptions.value++;
    showFeedback(
      "prank",
      t("native.patience.youChoseCorrectlyButTheTestChangedTheTargetTo", { sliderOriginalTarget: sliderOriginalTarget.value, sliderTarget: sliderTarget.value }),
    );
    return;
  }
  completeChallenge(t("native.patience.youChoseCorrectly", { sliderTarget: sliderTarget.value }));
}

function selectSequence(number: number) {
  if (!active.value || phase.value !== "sequence" || disposed) return;
  if (number !== sequenceOrder.value[sequenceStep.value]) {
    sequenceStep.value = 0;
    interruptions.value++;
    showFeedback(
      "wrong",
      t("native.patience.theCorrectOrderIsTheSequenceHasRestartedStartAgain", { sequenceOrderJoin: sequenceOrder.value.join(" → "), sequenceOrder: sequenceOrder.value[0] }),
    );
    return;
  }
  sequenceStep.value++;
  if (sequenceStep.value === sequenceOrder.value.length) {
    completeChallenge(
      t("native.patience.youClickedInTheCorrectOrder", { sequenceOrderJoin: sequenceOrder.value.join(" → ") }),
    );
  } else {
    showFeedback(
      "correct",
      t("native.patience.isCorrectNextClickTheButtonsMoveButTheOrder", { number: number, sequenceOrderSequenceStep: sequenceOrder.value[sequenceStep.value] }),
    );
  }
}

function submitPhrase() {
  if (!active.value || phase.value !== "typing" || disposed) return;
  if (
    typedPhrase.value.trim().normalize("NFC") !==
    requiredPhrase.value.normalize("NFC")
  ) {
    interruptions.value++;
    showFeedback(
      "wrong",
      t("native.patience.thePhraseDoesnTMatchTypeThenClickConfirmPhrase", { requiredPhrase: requiredPhrase.value }),
    );
    return;
  }
  if (!typingTricked.value) {
    // Clear only the first correct submission; the second must always let the user proceed.
    typingTricked.value = true;
    typedPhrase.value = "";
    interruptions.value++;
    showFeedback(
      "prank",
      t("native.patience.youTypedItCorrectlyButTheTestErasedItAll", { requiredPhrase: requiredPhrase.value }),
    );
    return;
  }
  completeChallenge(t("native.patience.yourPhraseIsCorrect"));
}

function clickCounter() {
  if (!active.value || phase.value !== "counter" || disposed) return;
  counterClicks.value++;
  if (counterClicks.value === counterResetAt.value && !counterTricked.value) {
    counterTricked.value = true;
    counterClicks.value = 0;
    interruptions.value++;
    showFeedback(
      "prank",
      t("native.patience.youClickedTimesCorrectlyButTheTestResetTheCount", { counterResetAt: counterResetAt.value, counterTotal: counterTotal.value }),
    );
  } else if (counterClicks.value === counterTotal.value) {
    completeChallenge(t("native.patience.youCompletedAllClicks", { counterTotal: counterTotal.value }));
  } else {
    status.value = t("native.patience.thatClickCountedClicksLeft", { counterClicks: counterClicks.value, counterTotal: counterTotal.value, counterTotalCounterClicks: counterTotal.value - counterClicks.value });
    ping();
  }
}

function selectOpposite(id: string) {
  if (!active.value || phase.value !== "opposite" || disposed) return;
  if (id !== directionPrompt.value.opposite) {
    interruptions.value++;
    const answer = directionChoices.find(
      (choice) => choice.id === directionPrompt.value.opposite,
    )!;
    showFeedback(
      "wrong",
      t("native.patience.theArrowPointsItsOppositeIsChooseThatDirection", { directionPromptLabel: directionPrompt.value.label, answerLabel: answer.label, answerIcon: answer.icon }),
    );
    return;
  }
  oppositeStep.value++;
  if (oppositeStep.value === oppositeTotal) {
    completeChallenge(t("native.patience.youChoseTheOppositeDirectionCorrectlyInAllThreeRounds"));
  } else {
    showFeedback(
      "correct",
      t("native.patience.correctOppositeDirectionNowLookAtTheNewArrowAnd"),
    );
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
  status.value = t("native.patience.clickThePicturesInTheOrderYouSawThem");
  ping();
}

function showMemory() {
  if (!active.value || phase.value !== "memory" || disposed) return;
  memoryRevealed.value = true;
  memoryStep.value = 0;
  status.value = t("native.patience.youCanLookAgainRememberTheOrderFromLeftTo");
}

function selectMemory(id: string) {
  if (
    !active.value ||
    phase.value !== "memory" ||
    disposed ||
    memoryRevealed.value
  )
    return;
  if (id !== memoryPattern.value[memoryStep.value]?.id) {
    const expected = memoryPattern.value[memoryStep.value]!;
    memoryStep.value = 0;
    interruptions.value++;
    showFeedback(
      "wrong",
      t("native.patience.theNextPictureShouldBeTheSequenceHasRestartedStart", { expectedLabel: expected.label, expectedIcon: expected.icon, memoryPatternLabel: memoryPattern.value[0]!.label }),
    );
    return;
  }
  memoryStep.value++;
  if (memoryStep.value === memoryPattern.value.length) {
    completeChallenge(t("native.patience.youRememberedAllThreePicturesInTheCorrectOrder"));
  } else {
    showFeedback(
      "correct",
      t("native.patience.thatPictureIsCorrectYouVeChosen3ChooseThe", { memoryStep: memoryStep.value }),
    );
  }
}

function selectLargest(value: number) {
  if (!active.value || phase.value !== "size" || disposed) return;
  if (value !== largestNumber.value) {
    interruptions.value++;
    showFeedback(
      "wrong",
      t("native.patience.isLargerThanTheOtherNumbersItsTextMayBe", { largestNumber: largestNumber.value }),
    );
    return;
  }
  completeChallenge(t("native.patience.isTheCorrectAnswer", { largestNumber: largestNumber.value }));
}

function answerNo() {
  if (!active.value || phase.value !== "annoyed" || disposed) return;
  if (!moveRunaway()) status.value = t("native.patience.stillPatientClickYesWhenYouReBored");
}

function answerAnnoyed() {
  if (!active.value || phase.value !== "annoyed" || disposed) return;
  ping();
  status.value = t("native.patience.calculatingYourScoreDonTLeaveYet");
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
  feedbackDialog.value?.close();
  feedback.value = null;
  feedbackReturnTarget = null;
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
   :lang="isKhmer ? 'km' : 'en'"
    :class="{ 'test-active': active, 'motion-reduced': reducedMotion }"
  >
    <header class="control-bar">
      <NuxtLink to="/" class="brand"
        >ChlatWork<span>{{ t("native.patience.patienceTest") }}</span></NuxtLink
      >
      <div class="controls">
        <button
          type="button"
          :disabled="!active"
          :aria-pressed="soundEnabled"
          @click="toggleSound"
        >
          {{ soundEnabled ? t("native.patience.mute") : t("native.patience.enableSound") }}
        </button>
        <button
          type="button"
          :disabled="phase === 'start' || phase === 'result'"
          :aria-pressed="paused"
          @click="togglePause"
        >
          {{ paused ? t("native.patience.resume") : t("native.patience.pause") }}
        </button>
        <NuxtLink to="/" class="exit"
          >{{ t("native.patience.exit") }} <span aria-hidden="true">↗</span></NuxtLink
        >
      </div>
    </header>
    <section class="test-focus" :aria-label="t(&quot;native.patience.patienceTest&quot;)">
      <div class="challenge">
        <div class="challenge-body">
          <p class="stage-label">
            {{ paused ? t("native.patience.pausedTakeABreath") : stageLabel }}
          </p>
          <span class="stage-icon" aria-hidden="true">{{ stageIcon }}</span>
          <h1 ref="stageHeading" class="stage-title" tabindex="-1">
            {{ stageTitle }}
          </h1>
          <div v-if="phase === 'start'" class="start-stage">
            <p class="stage-copy">
              {{ t("native.patience.clickTheButtonBelowToGiveItATry") }}<br />{{ t("native.patience.letSSeeHowLongYouCanStayPatient") }}
            </p>
            <button type="button" class="primary-button" @click="startTest">
              {{ t("native.patience.startTheTest") }} <span aria-hidden="true">→</span>
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
              {{ t("native.patience.yes") }} <span aria-hidden="true">☺</span>
            </button>
            <span class="target-footer">{{ t("native.patience.tryClickingTheButtonAbove") }}</span>
          </div>
          <div v-else-if="loadingStage" class="loading-stage">
            <div class="loading-label">
              <span>{{
                phase === "retry-loading"
                  ? t("native.patience.loadingAgainFromTheBeginning")
                  : t("native.patience.checkingYourPatience")
              }}</span
              ><strong>{{ progress }}%</strong>
            </div>
            <div
              class="progress-track"
              role="progressbar"
              :aria-label="t(&quot;native.patience.checkingYourPatience&quot;)"
              :aria-valuenow="progress"
              :aria-valuemin="0"
              :aria-valuemax="100"
            >
              <div :style="{ width: progress + '%' }" />
            </div>
            <p class="loading-caption">
              {{
                phase === "unstable"
                  ? t("native.patience.enjoyStartingAllOverAgain")
                  : t("native.patience.timeRemainingJustALittleLongerProbably")
              }}
            </p>
            <span class="loading-spinner" aria-hidden="true">✳</span>
          </div>
          <div v-else-if="phase === 'captcha'" class="captcha-stage">
            <p class="captcha-count" aria-live="polite">
              {{ t("native.patience.verification_2") }} {{ captchaStep }}/{{ captchaTotal }}
            </p>
            <p class="stage-copy">{{ t("native.patience.pleaseChoose") }}{{ captchaTarget.label }}{{ t("native.patience.period") }}</p>
            <div
              class="captcha-grid"
              :aria-label="t(&quot;native.patience.choose&quot;, { captchaTargetLabel: captchaTarget.label })"
            >
              <button
                v-for="(tile, index) in captchaTiles"
                :key="index"
                type="button"
                :disabled="!active"
                :aria-label="t(&quot;native.patience.picture&quot;, { index: (index + 1), tileLabel: tile.label })"
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
              {{ t("native.patience.checkTheBoxBelowThenClickContinueEasyRight") }}
            </p>
            <label class="consent-option">
              <input
                v-model="consentChecked"
                type="checkbox"
                :disabled="!active"
                @change="checkConsent"
              />
              <span>{{ consentPrompt }}</span>
            </label>
            <button
              type="submit"
              class="primary-button"
              :disabled="!active || !consentChecked"
            >
              {{ t("native.patience.continue") }}
            </button>
          </form>
          <div v-else-if="phase === 'color'" class="extra-stage">
            <p class="stage-copy">{{ t("native.patience.chooseTheInkColorOfTheWordBelow") }}</p>
            <p
              class="color-word"
              role="img"
              :style="{ color: inkColor.color }"
              :aria-label="
                t(&quot;native.patience.theWordIsColored&quot;, { colorWordLabel: colorWord.label, inkColorLabel: inkColor.label })
              "
            >
              {{ colorWord.label }}
            </p>
            <div
              class="answer-options"
              role="group"
              :aria-label="t(&quot;native.patience.chooseTheInkColor&quot;)"
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
              {{ t("native.patience.moveToNumber") }} <strong>{{ sliderTarget }}</strong> {{ t("native.patience.thenClickConfirm") }}
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
              {{ t("native.patience.confirmNumber") }}
            </button>
          </form>
          <div v-else-if="phase === 'sequence'" class="extra-stage">
            <p class="stage-copy">
              {{ t("native.patience.clickInThisOrder") }} {{ sequenceOrder.join(" → ") }}{{ t("native.patience.donTBeFooledByTheButtonPositions") }}
            </p>
            <p class="captcha-count" aria-live="polite">
              {{ t("native.patience.clicked") }} {{ sequenceStep }}/3
            </p>
            <div
              class="answer-options number-options"
              role="group"
              :aria-label="t(&quot;native.patience.clickTheNumbersInReverseOrder&quot;)"
            >
              <button
                v-for="number in sequenceChoices"
                :key="number"
                type="button"
                :disabled="!active"
                :aria-label="t(&quot;native.patience.number&quot;, { number: number })"
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
              {{ t("native.patience.typeThePhraseBelowExactlyAsShown") }}
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
              {{ t("native.patience.confirmPhrase") }}
            </button>
          </form>
          <div v-else-if="phase === 'counter'" class="extra-stage">
            <p class="stage-copy">
              {{ t("native.patience.clickTheButton") }} {{ counterTotal }} {{ t("native.patience.timesRealClicksPlease") }}
            </p>
            <p class="captcha-count" aria-live="polite">
              {{ t("native.patience.clicked") }} {{ counterClicks }}/{{ counterTotal }}
            </p>
            <button
              type="button"
              class="primary-button"
              :disabled="!active"
              @click="clickCounter"
            >
              {{ t("native.patience.clickHere") }}
            </button>
          </div>
          <div v-else-if="phase === 'opposite'" class="extra-stage">
            <p class="stage-copy">
              {{ t("native.patience.chooseTheOppositeDirectionFromTheArrowBelowDonT") }}
            </p>
            <p class="captcha-count" aria-live="polite">
              {{ t("native.patience.answered") }} {{ oppositeStep }}/{{ oppositeTotal }}
            </p>
            <p
              class="direction-prompt"
              role="img"
              :aria-label="t(&quot;native.patience.arrow&quot;, { directionPromptLabel: directionPrompt.label })"
            >
              {{ directionPrompt.icon }}
            </p>
            <div
              class="answer-options direction-options"
              role="group"
              :aria-label="t(&quot;native.patience.chooseTheOppositeArrowDirection&quot;)"
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
                  ? t("native.patience.rememberThePicturesFromLeftToRightThenHideThe")
                  : t("native.patience.clickThePicturesInTheirOriginalOrderDonTChange")
              }}
            </p>
            <div
              class="memory-slots"
              role="group"
              :aria-label="t(&quot;native.patience.pictureSequenceToRemember&quot;)"
            >
              <span
                v-for="(fruit, index) in memoryPattern"
                :key="fruit.id"
                role="img"
                :aria-label="
                  memoryRevealed || index < memoryStep
                    ? fruit.label
                    : t(&quot;native.patience.pictureHidden&quot;, { index: (index + 1) })
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
              {{ t("native.patience.gotItHideThePattern") }}
            </button>
            <template v-else>
              <p class="captcha-count" aria-live="polite">
                {{ t("native.patience.remembered") }} {{ memoryStep }}/{{ memoryPattern.length }}
              </p>
              <div
                class="answer-options fruit-options"
                role="group"
                :aria-label="t(&quot;native.patience.choosePicturesInTheRememberedOrder&quot;)"
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
                {{ t("native.patience.showThePatternAgain") }}
              </button>
            </template>
          </div>
          <div v-else-if="phase === 'size'" class="extra-stage">
            <p class="stage-copy">
              {{ t("native.patience.chooseTheNumberWithTheLargestValueTheTextSize") }}
            </p>
            <div
              class="answer-options size-options"
              role="group"
              :aria-label="t(&quot;native.patience.chooseTheLargestNumber&quot;)"
            >
              <button
                v-for="choice in sizeChoices"
                :key="choice.value"
                type="button"
                :class="'size-' + choice.size"
                :disabled="!active"
                :aria-label="t(&quot;native.patience.number_2&quot;, { choice: choice.value })"
                @click="selectLargest(choice.value)"
              >
                {{ choice.value }}
              </button>
            </div>
          </div>
          <div v-else-if="phase === 'honest'" class="honest-stage">
            <p class="stage-copy">{{ t("native.patience.atLastAnAnswerWeCanBelieve") }}</p>
          </div>
          <div v-else-if="phase === 'result'" class="result-stage">
            <strong>2%</strong>
            <p class="stage-copy">{{ t("native.patience.youMadeItToTheEndNicelyDone") }}</p>
            <button type="button" class="primary-button" @click="startTest">
              {{ t("native.patience.tryAgain") }} <span aria-hidden="true">↻</span>
            </button>
          </div>
          <p v-else class="stage-copy">
            {{ t("native.patience.iPromiseThisIsTheFinalQuestion") }}<br />{{ t("native.patience.weVeMadeThatPromiseBefore") }}
          </p>
          <p class="status" role="status" aria-live="polite">
            {{ paused ? t("native.patience.takeAShortBreakClickResumeWhenYouReReady") : status }}
          </p>
        </div>
        <div v-if="phase !== 'start'" class="challenge-footer">
          <span>{{ t("native.patience.interrupted") }} {{ interruptions }} {{ t("native.patience.times") }}</span>
          <button v-if="phase !== 'result'" type="button" @click="startTest">
            {{ t("native.patience.restart") }}
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
        <p class="stage-label">{{ t("native.patience.theVeryLastQuestion") }}</p>
        <span class="popup-icon" aria-hidden="true">😏</span>
        <h2 id="annoyed-title">{{ t("native.patience.boredAlready") }}</h2>
        <p v-if="paused" id="paused-popup" class="stage-copy">
          {{ t("native.patience.pausedClickResumeWhenYouReReady") }}
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
            {{ t("native.patience.no") }} <span aria-hidden="true">🙃</span>
          </button>
          <span class="target-footer">{{ t("native.patience.theNoButtonCanRunAwayToo") }}</span>
        </div>
        <button
          ref="honestYesButton"
          type="button"
          class="primary-button honest-button"
          :disabled="!active"
          @click="answerAnnoyed"
        >
          {{ t("native.patience.yesSoBored") }}
        </button>
      </section>
    </div>
    <dialog
      v-if="feedback"
      ref="feedbackDialog"
      class="feedback-dialog"
      :class="'feedback-' + feedback.kind"
      aria-labelledby="feedback-title"
      aria-describedby="feedback-message feedback-taunt"
      @cancel.prevent="acknowledgeFeedback"
    >
      <span class="feedback-icon" aria-hidden="true">
        {{ feedback.kind === "wrong" ? "✕" : "↻" }}
      </span>
      <h2 id="feedback-title">{{ feedback.title }}</h2>
      <p id="feedback-message" class="feedback-message">
        {{ feedback.message }}
      </p>
      <p id="feedback-taunt" class="feedback-taunt">{{ feedback.taunt }}</p>
      <button
        type="button"
        class="primary-button"
        autofocus
        @click="acknowledgeFeedback"
      >
        {{ t("native.patience.gotItLetSTryAgain") }}
      </button>
    </dialog>
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
.feedback-dialog {
  position: fixed;
  inset: 0;
  width: calc(100% - 32px);
  max-width: 440px;
  max-height: calc(100dvh - 32px);
  margin: auto;
  overflow: auto;
  padding: 28px;
  border: 1px solid var(--app-color-border);
  border-radius: 24px;
  background: var(--app-color-card-bg);
  color: var(--app-color-text);
  box-shadow: 0 24px 80px rgb(15 23 42 / 25%);
  font-family: inherit;
  text-align: center;
}
.feedback-dialog::backdrop {
  background: rgb(0 0 0 / 55%);
  backdrop-filter: blur(4px);
}
.feedback-dialog h2 {
  margin: 16px 0;
  font-family: inherit;
  font-size: 23px;
  line-height: 1.8;
}
.feedback-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin: 0 auto;
  border-radius: 50%;
  font-size: 32px;
  line-height: 1;
}
.feedback-wrong .feedback-icon {
  background: rgb(239 68 68 / 12%);
  color: #ef4444;
}
.feedback-prank .feedback-icon {
  background: rgb(245 158 11 / 12%);
  color: #f59e0b;
}
.feedback-message {
  margin: 0;
  font-size: 15px;
  line-height: 2;
}
.feedback-taunt {
  margin: 18px 0 0;
  color: var(--app-color-muted-text);
  font-size: 12px;
  line-height: 1.9;
}
.feedback-dialog .primary-button {
  margin-bottom: 0;
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
