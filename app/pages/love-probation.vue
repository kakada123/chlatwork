<script setup lang="ts">
import confetti from "canvas-confetti";

definePageMeta({
  layout: false,
});

const title = "For My Cutie Neth ❤️";
const description = "A little surprise from Kakada—just for you. 🥰";
const shareImage =
  "https://chlatwork.com/images/love/love-probation-share.png?v=4";

useSeoMeta({
  title,
  description,
  robots: "noindex, nofollow",
  ogTitle: title,
  ogDescription: description,
  ogImage: shareImage,
  ogImageAlt: "Ngen KaKada and Soem Daneth celebrating three months together",
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: shareImage,
});

useHead({
  title,
  htmlAttrs: { lang: "en" },
  bodyAttrs: { class: "love-probation-page" },
  meta: [
    { name: "description", content: description, tagPriority: 100 },
    { property: "og:title", content: title, tagPriority: 100 },
    { property: "og:description", content: description, tagPriority: 100 },
    { property: "og:image", content: shareImage, tagPriority: 100 },
    { property: "og:image:type", content: "image/png", tagPriority: 100 },
    { property: "og:image:width", content: "1200", tagPriority: 100 },
    { property: "og:image:height", content: "630", tagPriority: 100 },
    { name: "twitter:card", content: "summary_large_image", tagPriority: 100 },
    { name: "twitter:title", content: title, tagPriority: 100 },
    { name: "twitter:description", content: description, tagPriority: 100 },
    { name: "twitter:image", content: shareImage, tagPriority: 100 },
  ],
});

const isAccepted = ref(false);
const isMusicPlaying = ref(false);
const isMusicMuted = ref(false);
const loveSong = ref<HTMLAudioElement | null>(null);
const selectedChatIndex = ref<number | null>(null);
const selectedMovieIndex = ref<number | null>(null);
const isGiftSurpriseOpen = ref(false);
const isMomentsAlbumOpen = ref(false);
const hasEnteredPage = ref(false);
const entranceStep = ref<"anniversary" | "cute">("anniversary");
const anniversaryDay = ref("");
const anniversaryDayError = ref("");

const chatMemories = [
  {
    src: "/images/love/chat/love_the_way_she_checkout_with_me.png",
    title: "The way you check on me",
    note: "One little question from you can make my whole day feel softer. 🥺💕",
  },
  {
    src: "/images/love/chat/she-said-yes.png",
    title: "The sweetest yes",
    note: "A tiny ‘yes’ that became one of my favorite memories with you. 🙈❤️",
  },
  {
    src: "/images/love/chat/want_to_know_me_have_ss_or_not.png",
    title: "When you wanted to know me",
    note: "T'bal khoch, jong dg ke mean ss sot sur style old school beb joke🤣❤️",
  },
] as const;

const selectedChat = computed(() => {
  if (selectedChatIndex.value === null) return null;
  return chatMemories[selectedChatIndex.value] ?? null;
});

const movieMemories = [
  {
    src: "/images/love/movie/first-movie-tgt-at-eden-garden.png",
    title: "Our first movie together",
    place: "Eden Garden · Movie No. 01",
    note: "I was so excited to see you, babee. You looked so beautiful that day. It was also our first date—our first time holding hands and our first kiss together too, babee. ❤️",
  },
  {
    src: "/images/love/movie/second-movie-at-prime.png",
    title: "Our second movie date",
    place: "Prime Cineplex · Movie No. 02",
    note: "Another screen, another story, and another sweet memory with you beside me. 🍿❤️",
  },
  {
    src: "/images/love/movie/third-movie-at-prime.png",
    title: "Back to the movies with you",
    place: "Prime Cineplex · Movie No. 03",
    note: "The movie was good, but having you next to me was still my favorite part. 🥰",
  },
  {
    src: "/images/love/movie/4th-movie-at-prime-too.png",
    title: "Our fourth little cinema date",
    place: "Prime Cineplex · Movie No. 04",
    note: "More popcorn, more time together, and one more date I never want to forget. 💕",
  },
  {
    src: "/images/love/movie/5th-movie.png",
    title: "Movie number five",
    place: "Our cinema diary · Movie No. 05",
    note: "Five movie dates already, and I would still choose the seat right next to you every time. 🎞️❤️",
  },
] as const;

const selectedMovie = computed(() => {
  if (selectedMovieIndex.value === null) return null;
  return movieMemories[selectedMovieIndex.value] ?? null;
});

const giftMemories = [
  {
    src: "/images/love/gift/the-first-gift-i-give-her.png",
    title: "The first gift I gave you",
    label: "FROM ME · TO YOU",
    note: "A tiny hamster, a handwritten note, and so much love tucked inside. Seeing you happy made this gift even more special to me, babee. 🐹❤️",
  },
  {
    src: "/images/love/gift/the-first-gift-she-give-me.png",
    title: "The first gift you gave me",
    label: "FROM YOU · TO ME",
    note: "My early birthday gift from you—the belt was lovely, but being loved and remembered by you was the greatest gift of all. 🥹❤️",
  },
] as const;

const kampotMoments = [
  { file: "IMG_1789-compressed.webp", orientation: "portrait" },
  { file: "IMG_1872-compressed.webp", orientation: "portrait" },
  { file: "IMG_1897-compressed.webp", orientation: "landscape" },
  { file: "IMG_1902-compressed.webp", orientation: "landscape" },
  { file: "IMG_1915-compressed.webp", orientation: "portrait" },
  { file: "IMG_1928-compressed.webp", orientation: "portrait" },
  { file: "IMG_1937-compressed.webp", orientation: "portrait" },
  { file: "IMG_1939-compressed.webp", orientation: "landscape" },
].map((photo, index) => ({
  src: `/images/love/moment/trip-to-kampot/${photo.file}`,
  alt: `Our Kampot trip memory ${index + 1}`,
  orientation: photo.orientation,
}));

const heartRain = Array.from({ length: 22 }, (_, index) => ({
  id: index,
  left: `${(index * 47 + 9) % 100}%`,
  delay: `${-((index * 0.73) % 9)}s`,
  duration: `${7 + (index % 5) * 0.85}s`,
  size: `${12 + (index % 4) * 5}px`,
  opacity: `${0.22 + (index % 5) * 0.08}`,
}));
const telegramMessage =
  "Permanent position accepted! 🥰❤️ Dear B Kakada, our probation is officially passed. I choose you for one year, two, three, four, five—and forever. Love, your cutie Neth ❤️";
const telegramUrl = `https://t.me/kakadangen?text=${encodeURIComponent(telegramMessage)}`;
const isCountdownEnabled = false;
const unlockAt = new Date("2026-08-27T00:00:00+07:00").getTime();
const currentTime = ref(Date.now());
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const remainingTime = computed(() => Math.max(0, unlockAt - currentTime.value));
const isUnlocked = computed(
  () => !isCountdownEnabled || remainingTime.value === 0,
);
const countdown = computed(() => {
  const totalSeconds = Math.floor(remainingTime.value / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
});

onMounted(() => {
  if (!isCountdownEnabled) return;

  currentTime.value = Date.now();
  countdownTimer = window.setInterval(() => {
    currentTime.value = Date.now();

    if (isUnlocked.value && countdownTimer) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
});

const closeChatMemory = () => {
  selectedChatIndex.value = null;
};

const showAdjacentChat = (direction: -1 | 1) => {
  if (selectedChatIndex.value === null) return;

  selectedChatIndex.value =
    (selectedChatIndex.value + direction + chatMemories.length) %
    chatMemories.length;
};

const closeMovieMemory = () => {
  selectedMovieIndex.value = null;
};

const showAdjacentMovie = (direction: -1 | 1) => {
  if (selectedMovieIndex.value === null) return;

  selectedMovieIndex.value =
    (selectedMovieIndex.value + direction + movieMemories.length) %
    movieMemories.length;
};

const handleMemoryViewerKeydown = (event: KeyboardEvent) => {
  if (selectedChatIndex.value !== null) {
    if (event.key === "Escape") closeChatMemory();
    if (event.key === "ArrowLeft") showAdjacentChat(-1);
    if (event.key === "ArrowRight") showAdjacentChat(1);
  }

  if (selectedMovieIndex.value !== null) {
    if (event.key === "Escape") closeMovieMemory();
    if (event.key === "ArrowLeft") showAdjacentMovie(-1);
    if (event.key === "ArrowRight") showAdjacentMovie(1);
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleMemoryViewerKeydown);
});

onBeforeUnmount(() => {
  if (countdownTimer) window.clearInterval(countdownTimer);
  window.removeEventListener("keydown", handleMemoryViewerKeydown);
  loveSong.value?.pause();
});

const toggleMusic = async () => {
  if (!loveSong.value) return;

  if (isMusicPlaying.value) {
    loveSong.value.pause();
    isMusicPlaying.value = false;
    return;
  }

  try {
    await loveSong.value.play();
    isMusicPlaying.value = true;
  } catch {
    isMusicPlaying.value = false;
  }
};

const toggleMute = () => {
  if (!loveSong.value) return;

  isMusicMuted.value = !isMusicMuted.value;
  loveSong.value.muted = isMusicMuted.value;
};

const celebrate = () => {
  isAccepted.value = true;

  if (!process.client) return;

  const colors = ["#ff477e", "#ff7096", "#ffd166", "#ffffff"];
  const defaults = {
    colors,
    disableForReducedMotion: true,
    origin: { y: 0.72 },
    spread: 75,
    zIndex: 60,
  };

  confetti({ ...defaults, particleCount: 90, startVelocity: 38 });
  window.setTimeout(
    () =>
      confetti({
        ...defaults,
        particleCount: 55,
        origin: { x: 0.25, y: 0.75 },
      }),
    180,
  );
  window.setTimeout(
    () =>
      confetti({
        ...defaults,
        particleCount: 55,
        origin: { x: 0.75, y: 0.75 },
      }),
    320,
  );
};

const openGiftSurprise = () => {
  if (isGiftSurpriseOpen.value) return;

  isGiftSurpriseOpen.value = true;

  if (!process.client) return;

  const defaults = {
    colors: ["#ff477e", "#f7bd69", "#ffc4d4", "#ffffff"],
    disableForReducedMotion: true,
    origin: { y: 0.68 },
    spread: 65,
    zIndex: 60,
  };

  confetti({ ...defaults, particleCount: 55, origin: { x: 0.38, y: 0.7 } });
  window.setTimeout(
    () =>
      confetti({
        ...defaults,
        particleCount: 45,
        origin: { x: 0.62, y: 0.7 },
      }),
    160,
  );
};

const verifyAnniversaryDay = () => {
  if (anniversaryDay.value.trim() !== "27") {
    anniversaryDayError.value =
      "Not quite, babee. Think of the day our story began. 🤭";
    return;
  }

  anniversaryDayError.value = "";
  entranceStep.value = "cute";
};

const enterLovePage = async () => {
  hasEnteredPage.value = true;

  if (!process.client) return;

  confetti({
    particleCount: 75,
    spread: 70,
    startVelocity: 34,
    origin: { y: 0.72 },
    colors: ["#ff477e", "#ff9fba", "#ffd67d", "#ffffff"],
    disableForReducedMotion: true,
    zIndex: 250,
  });

  try {
    await loveSong.value?.play();
  } catch {
    isMusicPlaying.value = false;
  }
};
</script>

<template>
  <main class="love-page">
    <audio
      ref="loveSong"
      src="/audio/blue.m4a"
      loop
      preload="metadata"
      @play="isMusicPlaying = true"
      @pause="isMusicPlaying = false"
    />

    <Transition name="entrance-gate">
      <section
        v-if="!hasEnteredPage"
        class="love-entrance"
        aria-labelledby="love-entrance-title"
      >
        <div class="love-entrance-card">
          <div class="entrance-hearts" aria-hidden="true">
            <span>♥</span><span>♥</span><span>♥</span>
          </div>
          <template v-if="entranceStep === 'anniversary'">
            <p class="entrance-kicker">PRIVATE ACCESS · ONE DATE ONLY</p>
            <h1 id="love-entrance-title">Wait, babee…</h1>
            <p class="entrance-question">
              What day of the month is<br />our anniversary?
            </p>
            <form class="entrance-form" @submit.prevent="verifyAnniversaryDay">
              <label class="sr-only" for="anniversary-day">
                Anniversary day of the month
              </label>
              <input
                id="anniversary-day"
                v-model="anniversaryDay"
                class="entrance-date-input"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="2"
                placeholder="DD"
                autocomplete="off"
                autofocus
                :aria-invalid="Boolean(anniversaryDayError)"
                :aria-describedby="
                  anniversaryDayError
                    ? 'anniversary-day-hint anniversary-day-error'
                    : 'anniversary-day-hint'
                "
                @input="anniversaryDayError = ''"
              />
              <button class="entrance-answer" type="submit">
                <span>Unlock 🥰</span>
                <small>Enter our special day</small>
              </button>
            </form>
            <p
              v-if="anniversaryDayError"
              id="anniversary-day-error"
              class="entrance-error"
              role="alert"
            >
              {{ anniversaryDayError }}
            </p>
            <p id="anniversary-day-hint" class="entrance-hint">
              Hint: just the day, in two digits 💕
            </p>
          </template>

          <template v-else>
            <p class="entrance-kicker">SECRET ACCESS · ONE QUESTION ONLY</p>
            <h1 id="love-entrance-title">One more thing…</h1>
            <p class="entrance-question">
              Who is the cutest girl in<br />B Kakada’s whole world?
            </p>
            <button
              class="entrance-answer"
              type="button"
              @click="enterLovePage"
            >
              <span>Me—your cutie Neth 🥰</span>
              <small>Tap to open my surprise</small>
            </button>
            <p class="entrance-hint">
              Careful… there is only one correct answer 🤭
            </p>
          </template>
        </div>
      </section>
    </Transition>

    <div
      class="love-page-content"
      :inert="!hasEnteredPage"
      :aria-hidden="!hasEnteredPage"
    >

    <div class="heart-rain" aria-hidden="true">
      <span
        v-for="heart in heartRain"
        :key="heart.id"
        :style="{
          left: heart.left,
          animationDelay: heart.delay,
          animationDuration: heart.duration,
          fontSize: heart.size,
          opacity: heart.opacity,
        }"
        >♥</span
      >
    </div>

    <div class="music-controls">
      <button
        class="music-toggle"
        type="button"
        :aria-label="isMusicPlaying ? 'Pause love song' : 'Play love song'"
        :aria-pressed="isMusicPlaying"
        @click="toggleMusic"
      >
        <span aria-hidden="true">{{ isMusicPlaying ? "♫" : "♪" }}</span>
        {{ isMusicPlaying ? "Song playing" : "Play our song" }}
      </button>
      <button
        class="mute-toggle"
        type="button"
        :aria-label="isMusicMuted ? 'Unmute love song' : 'Mute love song'"
        :aria-pressed="isMusicMuted"
        @click="toggleMute"
      >
        <span aria-hidden="true">{{ isMusicMuted ? "🔇" : "🔊" }}</span>
      </button>
    </div>

    <div class="ambient-heart ambient-heart--one" aria-hidden="true">♥</div>
    <div class="ambient-heart ambient-heart--two" aria-hidden="true">♥</div>
    <div class="ambient-heart ambient-heart--three" aria-hidden="true">♥</div>

    <section
      v-if="!isUnlocked"
      class="review-card locked-card"
      aria-labelledby="countdown-title"
    >
      <div class="card-topline">
        <span class="eyebrow">CONFIDENTIAL · COUPLE DEPARTMENT</span>
        <span class="case-number">CASE #03M</span>
      </div>

      <div class="lock-icon" aria-hidden="true">♥</div>
      <p class="kicker">A LITTLE SURPRISE IS WAITING</p>
      <h1 id="countdown-title">
        Not quite time yet,<br /><em>my cutie Neth.</em>
      </h1>
      <p class="locked-intro">
        Our three-month review is sealed until 27 August 2026. Come back when
        the countdown reaches zero—something made with love is waiting for you.
      </p>

      <div
        class="countdown"
        aria-live="polite"
        aria-label="Time until the surprise unlocks"
      >
        <div>
          <strong>{{ countdown.days }}</strong
          ><span>Days</span>
        </div>
        <span class="countdown-separator">:</span>
        <div>
          <strong>{{ String(countdown.hours).padStart(2, "0") }}</strong>
          <span>Hours</span>
        </div>
        <span class="countdown-separator">:</span>
        <div>
          <strong>{{ String(countdown.minutes).padStart(2, "0") }}</strong>
          <span>Minutes</span>
        </div>
        <span class="countdown-separator">:</span>
        <div>
          <strong>{{ String(countdown.seconds).padStart(2, "0") }}</strong>
          <span>Seconds</span>
        </div>
      </div>

      <div class="unlock-date">
        <span>UNLOCKS ON</span>
        <strong>27 · 08 · 2026</strong>
        <small>12:00 AM · Cambodia time</small>
      </div>
    </section>

    <section v-else class="review-card" aria-labelledby="review-title">
      <div class="card-topline">
        <span class="eyebrow">CONFIDENTIAL · COUPLE DEPARTMENT</span>
        <span class="case-number">CASE #03M</span>
      </div>

      <div class="hero-copy">
        <span class="hero-heart hero-heart--left" aria-hidden="true">♥</span>
        <span class="hero-heart hero-heart--right" aria-hidden="true">♥</span>
        <p class="kicker">
          <span aria-hidden="true">♥</span>
          OFFICIAL RELATIONSHIP REVIEW
          <span aria-hidden="true">♥</span>
        </p>
        <h1 id="review-title">
          <span>Three months in.</span><em>Still my favorite person.</em>
        </h1>
        <div class="love-divider" aria-hidden="true"><span>♥</span></div>
        <p class="hero-love-note">My cutie Neth, r’bos bong 🥰❤️🫶</p>
        <p class="intro">
          Thank you so much for coming into my life. One month, two months,
          three months—we passed probation! Now let’s make it one year, two,
          three, four, five, and forever, na o sml 🥰❤️
        </p>
      </div>

      <div class="couple-portraits" aria-label="Soem Daneth and Ngen KaKada">
        <figure class="portrait-card portrait-card--kakada">
          <img
            src="/images/love/kakada.png"
            alt="Ngen KaKada"
            width="360"
            height="360"
          />
          <figcaption>
            <strong>Ngen KaKada</strong>
            <span>the very lucky boyfriend</span>
          </figcaption>
        </figure>

        <span class="portrait-heart" aria-hidden="true">♥</span>

        <figure class="portrait-card portrait-card--daneth">
          <img
            src="/images/love/daneth.jpg"
            alt="Soem Daneth"
            width="360"
            height="360"
          />
          <figcaption>
            <strong>Soem Daneth</strong>
            <span>the cutest girlfriend</span>
          </figcaption>
        </figure>
      </div>

      <div class="love-timeline" aria-label="Relationship timeline">
        <div>
          <span>WE STARTED DATING</span>
          <strong>27 · 05 · 2026</strong>
        </div>
        <div class="timeline-line" aria-hidden="true"><span>♥</span></div>
        <div>
          <span>3 MONTHS — PASSED!</span>
          <strong>27 · 08 · 2026</strong>
        </div>
      </div>

      <div class="result-row">
        <div class="score-block">
          <span class="score-label">PROBATION RESULT</span>
          <strong>Passed</strong>
          <span class="score-note">with excessive amounts of charm</span>
        </div>
        <div class="stamp" aria-label="Approved forever">
          <span>APPROVED</span>
          <strong>FOREVER</strong>
          <small>♥ 100% ♥</small>
        </div>
      </div>

      <section class="our-moments" aria-labelledby="our-moments-title">
        <div class="our-moments-heading">
          <p class="kicker">THE DAYS THAT BECAME OUR STORY</p>
          <h2 id="our-moments-title">Little moments, big memories</h2>
          <p>
            From our very first photo to silly trends and little trips—these are
            the moments I want to replay with you, babee. 🥰
          </p>
        </div>

        <button
          v-if="!isMomentsAlbumOpen"
          class="moments-album-button"
          type="button"
          aria-controls="moments-album"
          :aria-expanded="isMomentsAlbumOpen"
          @click="isMomentsAlbumOpen = true"
        >
          <span class="moments-album-preview" aria-hidden="true">
            <img
              src="/images/love/moment/trip-to-kampot/IMG_1789-compressed.webp"
              alt=""
              loading="lazy"
            />
            <img
              src="/images/love/moment/our-first-pic-tgt.webp"
              alt=""
              loading="lazy"
            />
            <img
              src="/images/love/moment/trip-to-kampot/IMG_1939-compressed.webp"
              alt=""
              loading="lazy"
            />
            <span class="moments-album-secret">+ more<br />inside</span>
            <span class="moments-album-heart">♥</span>
          </span>
          <span class="moments-album-label">OUR PRIVATE LITTLE ALBUM</span>
          <strong>There’s more to our story…</strong>
          <small>First photos, silly videos, zoo dates, and little trips 🥰</small>
          <span class="moments-album-action">
            Tap to open <span aria-hidden="true">→</span>
          </span>
        </button>

        <div v-else id="moments-album" class="moments-album" aria-live="polite">
          <article class="first-photo-memory">
          <div class="first-photo-frame">
            <LoveMomentPhoto
              src="/images/love/moment/our-first-pic-tgt.webp"
              alt="Our first picture together"
            />
            <span aria-hidden="true">our first pic ♥</span>
          </div>
          <div>
            <small>WHERE OUR CAMERA ROLL STARTED</small>
            <h3>Our first picture together</h3>
            <p>
              The first of so many photos together—and still one of the most
              special because it captured the beginning of us. ❤️
            </p>
          </div>
          </article>

          <div class="moment-video-grid">
          <article class="moment-video-card moment-video-card--featured">
            <video
              controls
              playsinline
              preload="none"
              poster="/images/love/moment/video-poster.svg"
            >
              <source
                src="/images/love/moment/trip-to-kampot/trip-to-phnom-tamao-zoo.mov"
              />
              Your browser cannot play this QuickTime video.
            </video>
            <div>
              <small>OUR WILD LITTLE DATE 🐻</small>
              <h3>Our trip to Phnom Tamao Zoo</h3>
              <p>
                A day of animals, laughs, and walking around with my favorite
                person. Even the wildest adventure feels sweet with you, babee.
                🐘🌿❤️
              </p>
              <a
                href="/images/love/moment/trip-to-kampot/trip-to-phnom-tamao-zoo.mov"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open zoo video ↗
              </a>
            </div>
          </article>
          </div>

          <article class="kampot-memory">
          <div class="kampot-memory-heading">
            <div>
              <small>OUR KAMPOT CHAPTER</small>
              <h3>A little trip full of us</h3>
            </div>
            <span aria-hidden="true">📍 Kampot</span>
          </div>
          <div class="kampot-photo-grid">
            <LoveMomentPhoto
              v-for="photo in kampotMoments"
              :key="photo.src"
              :src="photo.src"
              :alt="photo.alt"
              :class="`moment-photo--${photo.orientation}`"
            />
          </div>
          <p>
            New places, happy faces, and another chapter I’m so glad we wrote
            together. Let’s take many more trips, na o sml. 🌿❤️
          </p>
          </article>
        </div>
      </section>

      <section class="chat-memories" aria-labelledby="chat-memories-title">
        <div class="chat-memories-heading">
          <span class="chat-memories-icon" aria-hidden="true">💌</span>
          <div>
            <p class="kicker">LITTLE MOMENTS I TREASURE</p>
            <h2 id="chat-memories-title">Chats I keep close to my heart</h2>
            <p>
              Tap one whenever you want to revisit a tiny piece of our story, o
              sml. 🥰
            </p>
          </div>
        </div>

        <div class="chat-memory-grid">
          <button
            v-for="(memory, index) in chatMemories"
            :key="memory.src"
            class="chat-memory-card"
            type="button"
            :aria-label="`Open chat memory: ${memory.title}`"
            @click="selectedChatIndex = index"
          >
            <span class="chat-memory-image">
              <img :src="memory.src" :alt="memory.title" loading="lazy" />
              <span>Open memory ♥</span>
            </span>
            <strong>{{ memory.title }}</strong>
            <small>{{ memory.note }}</small>
          </button>
        </div>
      </section>

      <section class="movie-memories" aria-labelledby="movie-memories-title">
        <div class="movie-memories-heading">
          <div>
            <p class="movie-kicker">NOW SHOWING · OUR LOVE STORY</p>
            <h2 id="movie-memories-title">Our little movie-date diary</h2>
            <p>
              Every ticket became a memory because I got to share the seat next
              to you, babee. 🎬❤️
            </p>
          </div>
          <span class="movie-reel" aria-hidden="true">🎞️</span>
        </div>

        <div class="movie-memory-list">
          <button
            v-for="(memory, index) in movieMemories"
            :key="memory.src"
            class="movie-memory-card"
            type="button"
            :aria-label="`Open movie memory: ${memory.title}`"
            @click="selectedMovieIndex = index"
          >
            <span class="movie-memory-number">{{
              String(index + 1).padStart(2, "0")
            }}</span>
            <span class="movie-memory-image">
              <img :src="memory.src" :alt="memory.title" loading="lazy" />
              <span aria-hidden="true">▶</span>
            </span>
            <span class="movie-memory-copy">
              <small>{{ memory.place }}</small>
              <strong>{{ memory.title }}</strong>
              <span>{{ memory.note }}</span>
            </span>
          </button>
        </div>
      </section>

      <section class="gift-surprise" aria-labelledby="gift-surprise-title">
        <div class="gift-surprise-sparkles" aria-hidden="true">
          <span>✦</span><span>♥</span><span>✦</span>
        </div>

        <div class="gift-surprise-heading">
          <p class="kicker">ONE MORE LITTLE SURPRISE</p>
          <h2 id="gift-surprise-title">
            A gift from me, a gift from you.
          </h2>
          <p>
            Our first gifts were more than things—they were little ways of
            saying, “I thought of you.”
          </p>
        </div>

        <button
          v-if="!isGiftSurpriseOpen"
          class="gift-box-button"
          type="button"
          aria-controls="gift-memories"
          :aria-expanded="isGiftSurpriseOpen"
          @click="openGiftSurprise"
        >
          <span class="gift-box" aria-hidden="true">
            <span class="gift-box-lid"></span>
            <span class="gift-box-body"></span>
            <span class="gift-box-ribbon"></span>
            <span class="gift-box-bow">♥</span>
          </span>
          <strong>Tap to unwrap our first gifts</strong>
          <small>Something sweet is waiting inside, babee 🎁</small>
        </button>

        <Transition name="gift-reveal">
          <div
            v-if="isGiftSurpriseOpen"
            id="gift-memories"
            class="gift-memory-grid"
            aria-live="polite"
          >
            <article
              v-for="(gift, index) in giftMemories"
              :key="gift.src"
              class="gift-memory-card"
              :class="`gift-memory-card--${index + 1}`"
            >
              <span class="gift-tape" aria-hidden="true"></span>
              <div class="gift-memory-image">
                <img :src="gift.src" :alt="gift.title" loading="lazy" />
              </div>
              <div class="gift-memory-copy">
                <small>{{ gift.label }}</small>
                <h3>{{ gift.title }}</h3>
                <p>{{ gift.note }}</p>
              </div>
            </article>
            <p class="gift-surprise-message">
              The gifts were our first, but choosing each other is the gift I
              want to keep forever. 🥰❤️
            </p>
          </div>
        </Transition>
      </section>

      <div class="benefits">
        <p class="benefits-title">YOUR UPDATED BENEFITS INCLUDE</p>
        <ul>
          <li><span>01</span> Unlimited hugs, Kiss and Nham🤪🤤</li>
          <li><span>02</span> Priority access to my heart</li>
          <li><span>03</span> A lifetime of choosing each other</li>
        </ul>
      </div>

      <blockquote>
        “After a very serious review of our laughs, late-night talks, little
        moments, and all the ways you make ordinary days feel special, the
        result is in: <strong>I love you so much, my cutie Neth ❤️</strong>”
      </blockquote>

      <div class="signature-row">
        <div>
          <span class="signature-label">SIGNED WITH LOVE BY</span>
          <span class="signature">Ngen KaKada</span>
        </div>
        <span class="heart-seal" aria-hidden="true">♥</span>
      </div>

      <a
        class="celebrate-button"
        :href="telegramUrl"
        target="_blank"
        rel="noopener noreferrer"
        @click="celebrate"
      >
        <span v-if="!isAccepted">Accept permanent position</span>
        <span v-else>Position accepted — I love you! ♥</span>
      </a>
    </section>

    <p class="footer-note">
      No resignation requests will be accepted. Sorry, HR policy.
    </p>

    <Teleport to="body">
      <div
        v-if="selectedChat"
        class="chat-viewer"
        role="dialog"
        aria-modal="true"
        :aria-label="selectedChat.title"
        @click.self="closeChatMemory"
      >
        <div class="chat-viewer-card">
          <button
            class="chat-viewer-close"
            type="button"
            aria-label="Close chat memory"
            @click="closeChatMemory"
          >
            ×
          </button>
          <p class="chat-viewer-eyebrow">OUR LITTLE MEMORY ♥</p>
          <h2>{{ selectedChat.title }}</h2>
          <p>{{ selectedChat.note }}</p>
          <div class="chat-viewer-image">
            <img :src="selectedChat.src" :alt="selectedChat.title" />
          </div>
          <div class="chat-viewer-actions">
            <button type="button" @click="showAdjacentChat(-1)">
              ← Previous
            </button>
            <span
              >{{ (selectedChatIndex ?? 0) + 1 }} /
              {{ chatMemories.length }}</span
            >
            <button type="button" @click="showAdjacentChat(1)">Next →</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="selectedMovie"
        class="chat-viewer movie-viewer"
        role="dialog"
        aria-modal="true"
        :aria-label="selectedMovie.title"
        @click.self="closeMovieMemory"
      >
        <div class="chat-viewer-card movie-viewer-card">
          <button
            class="chat-viewer-close movie-viewer-close"
            type="button"
            aria-label="Close movie memory"
            @click="closeMovieMemory"
          >
            ×
          </button>
          <p class="chat-viewer-eyebrow movie-viewer-eyebrow">
            {{ selectedMovie.place }}
          </p>
          <h2>{{ selectedMovie.title }}</h2>
          <p>{{ selectedMovie.note }}</p>
          <div class="chat-viewer-image movie-viewer-image">
            <img :src="selectedMovie.src" :alt="selectedMovie.title" />
          </div>
          <div class="chat-viewer-actions movie-viewer-actions">
            <button type="button" @click="showAdjacentMovie(-1)">
              ← Previous
            </button>
            <span
              >{{ (selectedMovieIndex ?? 0) + 1 }} /
              {{ movieMemories.length }}</span
            >
            <button type="button" @click="showAdjacentMovie(1)">
              Next →
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    </div>
  </main>
</template>

<style>
@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap");

.love-probation-page {
  margin: 0;
  background: #fff7f3;
}

.love-page {
  --ink: #33252b;
  --muted: #796970;
  --pink: #ff477e;
  --paper: #fffdfb;
  min-height: 100vh;
  overflow: hidden;
  position: relative;
  display: grid;
  place-items: center;
  gap: 22px;
  padding: 56px 20px 32px;
  color: var(--ink);
  background:
    radial-gradient(
      circle at 12% 10%,
      rgba(255, 188, 203, 0.55),
      transparent 28%
    ),
    radial-gradient(
      circle at 88% 88%,
      rgba(255, 214, 171, 0.48),
      transparent 30%
    ),
    #fff7f3;
  font-family: "DM Sans", sans-serif;
}

.love-page-content { display: contents; }
.love-page:has(.love-entrance) { max-height: 100vh; overflow: hidden; }

.love-entrance {
  position: fixed;
  z-index: 220;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  overflow-y: auto;
  background:
    radial-gradient(circle at 15% 18%, rgba(255, 255, 255, 0.95), transparent 23%),
    radial-gradient(circle at 84% 82%, rgba(255, 209, 122, 0.24), transparent 25%),
    linear-gradient(145deg, #fff5f8, #fff9ef);
}
.love-entrance::before,
.love-entrance::after {
  position: absolute;
  color: rgba(255, 71, 126, 0.1);
  content: "♥";
  font-size: min(38vw, 420px);
  line-height: 1;
}
.love-entrance::before { top: -12vw; left: -8vw; transform: rotate(-16deg); }
.love-entrance::after { right: -8vw; bottom: -14vw; transform: rotate(15deg); }
.love-entrance-card {
  position: relative;
  z-index: 1;
  width: min(100%, 560px);
  padding: clamp(34px, 7vw, 58px) clamp(22px, 7vw, 52px);
  background: rgba(255, 253, 251, 0.92);
  border: 1px solid rgba(255, 71, 126, 0.2);
  border-radius: 30px;
  box-shadow: 0 28px 80px rgba(84, 48, 61, 0.18);
  text-align: center;
  backdrop-filter: blur(14px);
}
.love-entrance-card::before {
  position: absolute;
  inset: 9px;
  pointer-events: none;
  content: "";
  border: 1px dashed rgba(255, 71, 126, 0.2);
  border-radius: 22px;
}
.entrance-hearts {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 18px;
  color: #ff9fba;
}
.entrance-hearts span:nth-child(2) {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  color: white;
  background: #ff477e;
  border-radius: 50%;
  box-shadow: 0 9px 22px rgba(255, 71, 126, 0.28);
  font-size: 24px;
  animation: entrance-heartbeat 1.7s ease-in-out infinite;
}
.entrance-kicker {
  position: relative;
  z-index: 1;
  margin: 0 0 8px;
  color: #ff477e;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.love-entrance-card h1 {
  position: relative;
  z-index: 1;
  margin: 0;
  font: italic 400 clamp(40px, 9vw, 62px)/1 "DM Serif Display", serif;
}
.entrance-question {
  position: relative;
  z-index: 1;
  margin: 18px 0 25px;
  color: var(--muted);
  font: 400 clamp(18px, 4vw, 23px)/1.45 "DM Serif Display", serif;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.entrance-form {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 14px;
}
.entrance-date-input {
  box-sizing: border-box;
  width: min(100%, 150px);
  margin: 0 auto;
  padding: 13px 18px;
  color: var(--ink);
  background: white;
  border: 2px solid rgba(255, 71, 126, 0.28);
  border-radius: 16px;
  box-shadow: inset 0 2px 8px rgba(84, 48, 61, 0.06);
  font: 700 24px/1 "DM Sans", sans-serif;
  letter-spacing: 0.18em;
  text-align: center;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.entrance-date-input::placeholder { color: #c8afb7; }
.entrance-date-input:hover { border-color: rgba(255, 71, 126, 0.5); }
.entrance-date-input:focus {
  border-color: #ff477e;
  box-shadow: 0 0 0 4px rgba(255, 71, 126, 0.13);
  outline: none;
}
.entrance-date-input[aria-invalid="true"] { border-color: #d93664; }
.entrance-answer {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(100%, 370px);
  margin: 0 auto;
  padding: 15px 22px;
  color: white;
  background: linear-gradient(135deg, #ff477e, #ed5a84);
  border: 0;
  border-radius: 18px;
  box-shadow: 0 12px 26px rgba(255, 71, 126, 0.3);
  cursor: pointer;
  font-family: inherit;
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.entrance-answer:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 17px 32px rgba(255, 71, 126, 0.38);
}
.entrance-answer:focus-visible { outline: 4px solid #ffc4d4; outline-offset: 4px; }
.entrance-answer > span { font-size: 15px; font-weight: 800; }
.entrance-answer small {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 9px;
}
.entrance-error {
  position: relative;
  z-index: 1;
  margin: 13px 0 0;
  color: #c92d59;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}
.entrance-hint {
  position: relative;
  z-index: 1;
  margin: 15px 0 0;
  color: #9a818a;
  font-size: 9px;
}
.entrance-gate-leave-active { transition: opacity 420ms ease, transform 420ms ease; }
.entrance-gate-leave-to { opacity: 0; transform: scale(1.04); }
@keyframes entrance-heartbeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.14); }
}

.love-page::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.3;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.08'/%3E%3C/svg%3E");
}

.heart-rain {
  position: fixed;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.heart-rain span {
  position: absolute;
  top: -12vh;
  color: #ff477e;
  line-height: 1;
  text-shadow: 0 3px 8px rgba(255, 71, 126, 0.18);
  animation: heart-fall 9s linear infinite;
}

.heart-rain span:nth-child(3n) {
  color: #ff8cab;
}
.heart-rain span:nth-child(4n) {
  color: #efb45d;
}

@keyframes heart-fall {
  0% {
    transform: translate3d(0, -12vh, 0) rotate(-18deg);
  }
  50% {
    transform: translate3d(24px, 52vh, 0) rotate(14deg);
  }
  100% {
    transform: translate3d(-14px, 115vh, 0) rotate(42deg);
  }
}

.music-controls {
  position: fixed;
  z-index: 20;
  top: 18px;
  right: 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.music-toggle,
.mute-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 15px;
  color: var(--ink);
  background: rgba(255, 253, 251, 0.9);
  border: 1px solid rgba(255, 71, 126, 0.22);
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(94, 55, 68, 0.12);
  backdrop-filter: blur(10px);
  cursor: pointer;
  font:
    700 11px "DM Sans",
    sans-serif;
  transition:
    transform 160ms ease,
    background 160ms ease;
}

.mute-toggle {
  width: 40px;
  height: 40px;
  padding: 0;
}

.music-toggle span,
.mute-toggle span {
  color: var(--pink);
  font-size: 18px;
  line-height: 1;
}

.music-toggle:hover,
.mute-toggle:hover {
  transform: translateY(-2px);
  background: white;
}
.music-toggle:focus-visible,
.mute-toggle:focus-visible {
  outline: 3px solid #ffc4d4;
  outline-offset: 3px;
}

.review-card {
  width: min(100%, 720px);
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  padding: clamp(28px, 6vw, 58px);
  background: var(--paper);
  border: 1px solid rgba(73, 46, 56, 0.12);
  border-radius: 4px;
  box-shadow:
    0 28px 80px rgba(94, 55, 68, 0.16),
    8px 9px 0 #ffc9d7;
}

.card-topline,
.signature-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.card-topline {
  padding-bottom: 18px;
  border-bottom: 1px solid #e7dcdf;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
}

.locked-card {
  overflow: hidden;
  text-align: center;
}

.lock-icon {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  margin: 42px auto 24px;
  color: white;
  background: var(--pink);
  border: 8px solid #ffe7ed;
  border-radius: 50%;
  box-shadow: 0 10px 28px rgba(255, 71, 126, 0.24);
  font-size: 28px;
}

.locked-card h1 {
  margin: 10px 0 18px;
  font:
    400 clamp(40px, 8vw, 62px)/1 "DM Serif Display",
    serif;
  letter-spacing: -0.035em;
}

.locked-card h1 em {
  color: var(--pink);
  font-weight: 400;
}

.locked-intro {
  max-width: 540px;
  margin: 0 auto;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.7;
}

.countdown {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
  align-items: start;
  gap: 10px;
  margin: 38px 0 30px;
  padding: 25px 20px;
  background: #fff4f6;
  border: 1px solid #f3d9df;
  border-radius: 16px;
}

.countdown div {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.countdown strong {
  display: block;
  width: 2ch;
  min-width: 2ch;
  margin-inline: auto;
  font:
    600 clamp(28px, 6vw, 42px)/1 ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    "Liberation Mono",
    monospace;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.countdown div span {
  color: var(--muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.countdown-separator {
  color: #e4a6b6;
  font:
    400 32px/1 "DM Serif Display",
    serif;
}

.unlock-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-top: 24px;
  border-top: 1px solid #e7dcdf;
}

.unlock-date span {
  color: var(--pink);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.15em;
}

.unlock-date strong {
  font:
    400 24px "DM Serif Display",
    serif;
}

.unlock-date small {
  color: var(--muted);
  font-size: 10px;
}

.hero-copy {
  position: relative;
  isolation: isolate;
  margin: 30px 0 34px;
  padding: clamp(34px, 6vw, 50px) clamp(22px, 5vw, 42px);
  overflow: hidden;
  text-align: center;
  background:
    radial-gradient(
      circle at 14% 16%,
      rgba(255, 255, 255, 0.95) 0 3px,
      transparent 4px
    ),
    radial-gradient(
      circle at 87% 23%,
      rgba(255, 255, 255, 0.9) 0 2px,
      transparent 3px
    ),
    linear-gradient(145deg, #fff8fa 0%, #fff0f4 52%, #fff8f2 100%);
  border: 1px solid rgba(255, 71, 126, 0.16);
  border-radius: 26px;
  box-shadow: inset 0 0 0 5px rgba(255, 255, 255, 0.48);
}

.hero-copy::before,
.hero-copy::after {
  content: "";
  position: absolute;
  z-index: -1;
  width: 150px;
  height: 150px;
  border: 28px solid rgba(255, 71, 126, 0.045);
  border-radius: 50%;
}

.hero-copy::before {
  top: -92px;
  left: -84px;
}

.hero-copy::after {
  right: -92px;
  bottom: -104px;
}

.hero-heart {
  position: absolute;
  color: rgba(255, 71, 126, 0.28);
  line-height: 1;
  pointer-events: none;
}

.hero-heart--left {
  top: 22px;
  left: 24px;
  font-size: 17px;
  transform: rotate(-14deg);
}

.hero-heart--right {
  right: 27px;
  bottom: 24px;
  font-size: 23px;
  transform: rotate(12deg);
}
.kicker,
.benefits-title,
.score-label,
.signature-label {
  margin: 0;
  color: var(--pink);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.hero-copy h1 {
  margin: 22px 0 18px;
  font:
    400 clamp(38px, 7vw, 60px)/1 "DM Serif Display",
    serif;
  letter-spacing: -0.035em;
}

.hero-copy .kicker {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 71, 126, 0.2);
  border-radius: 999px;
  box-shadow: 0 6px 18px rgba(255, 71, 126, 0.08);
}

.hero-copy .kicker span {
  font-size: 9px;
}

.hero-copy h1 > span,
.hero-copy h1 em {
  display: block;
}

.hero-copy h1 em {
  margin-top: 7px;
  color: var(--pink);
  font-weight: 400;
  line-height: 1.04;
  text-shadow: 0 5px 18px rgba(255, 71, 126, 0.12);
}

.love-divider {
  display: flex;
  align-items: center;
  width: min(190px, 55%);
  margin: 0 auto 18px;
  color: var(--pink);
}

.love-divider::before,
.love-divider::after {
  content: "";
  height: 1px;
  flex: 1;
  background: linear-gradient(to right, transparent, rgba(255, 71, 126, 0.35));
}

.love-divider::after {
  background: linear-gradient(to left, transparent, rgba(255, 71, 126, 0.35));
}

.love-divider span {
  margin: 0 10px;
  font-size: 12px;
}
.intro {
  max-width: 590px;
  margin: 0 auto;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.75;
}

.hero-love-note {
  margin: 0 0 12px;
  color: var(--pink);
  font:
    italic 400 20px/1.4 "DM Serif Display",
    serif;
}

.our-moments {
  margin: 0 0 42px;
  padding: clamp(24px, 5vw, 38px);
  background: linear-gradient(150deg, #f4fbf7, #fffaf5 55%, #fff1f5);
  border: 1px solid rgba(86, 125, 104, 0.18);
  border-radius: 26px;
}
.our-moments-heading {
  max-width: 620px;
  margin: 0 auto 28px;
  text-align: center;
}
.our-moments-heading h2 {
  margin: 7px 0 8px;
  font: 400 clamp(28px, 5vw, 40px)/1.1 "DM Serif Display", serif;
}
.our-moments-heading > p:last-child {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.65;
}

.moments-album-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(100%, 470px);
  margin: 0 auto;
  padding: 30px 28px 27px;
  overflow: hidden;
  color: var(--ink);
  background:
    radial-gradient(circle at 15% 15%, rgba(255, 255, 255, 0.95), transparent 30%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(248, 255, 251, 0.82));
  border: 1px solid rgba(86, 125, 104, 0.24);
  border-radius: 24px;
  box-shadow: 0 16px 35px rgba(58, 76, 67, 0.12);
  cursor: pointer;
  font-family: inherit;
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
}
.moments-album-button::after {
  position: absolute;
  inset: 0;
  content: "";
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.75) 48%, transparent 66%);
  transform: translateX(-120%);
  transition: transform 650ms ease;
}
.moments-album-button:hover {
  transform: translateY(-6px) scale(1.01);
  border-color: rgba(255, 71, 126, 0.35);
  box-shadow: 0 22px 42px rgba(58, 76, 67, 0.17);
}
.moments-album-button:hover::after {
  transform: translateX(120%);
}
.moments-album-button:focus-visible {
  outline: 3px solid #8cc8a9;
  outline-offset: 4px;
}
.moments-album-preview {
  position: relative;
  z-index: 1;
  display: block;
  width: 250px;
  height: 150px;
  margin-bottom: 24px;
}
.moments-album-preview img {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 132px;
  height: 132px;
  padding: 5px 5px 19px;
  object-fit: cover;
  background: white;
  border: 1px solid rgba(69, 95, 81, 0.13);
  box-shadow: 0 10px 24px rgba(49, 74, 61, 0.18);
  transition: transform 260ms ease;
}
.moments-album-preview img:nth-child(1) { transform: translate(-94%, -47%) rotate(-10deg); }
.moments-album-preview img:nth-child(2) { z-index: 2; transform: translate(-50%, -52%) rotate(-1deg); }
.moments-album-preview img:nth-child(3) { transform: translate(-6%, -47%) rotate(10deg); }
.moments-album-button:hover .moments-album-preview img:nth-child(1) { transform: translate(-102%, -49%) rotate(-13deg); }
.moments-album-button:hover .moments-album-preview img:nth-child(2) { transform: translate(-50%, -57%) rotate(0); }
.moments-album-button:hover .moments-album-preview img:nth-child(3) { transform: translate(2%, -49%) rotate(13deg); }
.moments-album-secret {
  position: absolute;
  z-index: 3;
  right: 3px;
  bottom: 1px;
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  color: white;
  background: #3e785b;
  border: 4px solid white;
  border-radius: 50%;
  box-shadow: 0 7px 15px rgba(49, 94, 73, 0.25);
  font-size: 9px;
  font-weight: 800;
  line-height: 1.15;
  text-transform: uppercase;
}
.moments-album-heart {
  position: absolute;
  z-index: 4;
  top: -5px;
  right: 38px;
  color: #ff477e;
  font-size: 25px;
  transform: rotate(10deg);
  animation: album-heartbeat 1.8s ease-in-out infinite;
}
.moments-album-label {
  position: relative;
  z-index: 1;
  margin-bottom: 7px;
  color: #ff477e;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.moments-album-button strong {
  position: relative;
  z-index: 1;
  color: var(--ink);
  font: 400 25px/1.15 "DM Serif Display", serif;
}
.moments-album-button small {
  position: relative;
  z-index: 1;
  margin-top: 5px;
  color: var(--muted);
  font-size: 10px;
}
.moments-album-action {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-top: 17px;
  padding: 10px 17px;
  color: white;
  background: linear-gradient(135deg, #ff477e, #f05b85);
  border-radius: 999px;
  box-shadow: 0 8px 18px rgba(255, 71, 126, 0.25);
  font-size: 11px;
  font-weight: 800;
}
.moments-album-action > span {
  transition: transform 180ms ease;
}
.moments-album-button:hover .moments-album-action > span {
  transform: translateX(4px);
}
@keyframes album-heartbeat {
  0%, 100% { transform: rotate(10deg) scale(1); }
  50% { transform: rotate(10deg) scale(1.18); }
}
.moments-album {
  animation: moments-album-open 420ms ease both;
}
@keyframes moments-album-open {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}

.first-photo-memory {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  align-items: center;
  gap: clamp(22px, 5vw, 42px);
  margin-bottom: 28px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(86, 125, 104, 0.14);
  border-radius: 20px;
}
.first-photo-frame {
  position: relative;
  padding: 9px 9px 36px;
  background: #fff;
  box-shadow: 0 13px 28px rgba(58, 76, 67, 0.14);
  transform: rotate(-2deg);
}
.first-photo-frame .moment-photo {
  height: auto;
  aspect-ratio: 4 / 3;
}
.first-photo-frame > span {
  position: absolute;
  right: 13px;
  bottom: 11px;
  color: #ff477e;
  font: italic 400 15px "DM Serif Display", serif;
}
.first-photo-memory small,
.moment-video-card small,
.kampot-memory small {
  color: #4f8a6d;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.13em;
}
.first-photo-memory h3,
.moment-video-card h3,
.kampot-memory h3 {
  margin: 6px 0 7px;
  font: 400 23px/1.15 "DM Serif Display", serif;
}
.first-photo-memory p,
.moment-video-card p,
.kampot-memory > p {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.6;
}

.moment-photo {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #efe8e4, #e2eee7);
}
.moment-photo img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
.moment-photo > span[role="img"],
.moment-photo-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 12px;
  color: var(--muted);
  font-size: 10px;
  text-align: center;
}

.moment-video-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 28px;
}
.moment-video-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(86, 125, 104, 0.14);
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(58, 76, 67, 0.08);
}
.moment-video-card video {
  width: 100%;
  height: 220px;
  display: block;
  background: #211a1e;
  object-fit: contain;
}
.moment-video-card > div { padding: 17px 18px 20px; }
.moment-video-card h3 { font-size: 20px; }
.moment-video-card--featured {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.8fr);
  align-items: stretch;
  background: linear-gradient(135deg, #fff, #f5fff9);
  border-color: rgba(79, 138, 109, 0.25);
}
.moment-video-card--featured video {
  height: 290px;
}
.moment-video-card--featured > div {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 25px;
}
.moment-video-card--featured h3 {
  font-size: 25px;
}
.moment-video-card a {
  display: inline-block;
  margin-top: 10px;
  color: #ff477e;
  font-size: 9px;
  font-weight: 800;
  text-decoration: none;
}
.moment-video-card a:hover { text-decoration: underline; }

.kampot-memory {
  padding: clamp(18px, 4vw, 28px);
  background: #233b31;
  border-radius: 22px;
  box-shadow: 0 16px 34px rgba(35, 59, 49, 0.18);
}
.kampot-memory-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 17px;
  color: #f5fff9;
}
.kampot-memory-heading h3 { margin-bottom: 0; }
.kampot-memory-heading > span {
  padding: 7px 10px;
  color: #dff2e7;
  background: rgba(255, 255, 255, 0.09);
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
}
.kampot-photo-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-flow: dense;
  grid-auto-rows: 85px;
  gap: 7px;
}
.kampot-photo-grid .moment-photo {
  grid-row: span 2;
  border-radius: 8px;
}
.kampot-photo-grid .moment-photo--landscape {
  grid-column: span 2;
}
.kampot-memory > p {
  margin-top: 17px;
  color: #d8e8df;
  text-align: center;
}

.chat-memories {
  margin: 4px 0 42px;
  padding: clamp(22px, 5vw, 34px);
  background: linear-gradient(145deg, #fff8f9, #fff1f5);
  border: 1px solid rgba(255, 71, 126, 0.16);
  border-radius: 24px;
}

.chat-memories-heading {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.chat-memories-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  background: white;
  border: 1px solid rgba(255, 71, 126, 0.16);
  border-radius: 50%;
  box-shadow: 0 8px 20px rgba(255, 71, 126, 0.1);
  font-size: 23px;
}

.chat-memories-heading h2 {
  margin: 6px 0 7px;
  font:
    400 clamp(25px, 5vw, 35px)/1.1 "DM Serif Display",
    serif;
}

.chat-memories-heading > div > p:last-child {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.chat-memory-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.chat-memory-card {
  min-width: 0;
  padding: 9px 9px 15px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 71, 126, 0.14);
  border-radius: 16px;
  box-shadow: 0 8px 22px rgba(94, 55, 68, 0.08);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.chat-memory-card:nth-child(2) {
  transform: rotate(1.2deg);
}

.chat-memory-card:nth-child(3) {
  transform: rotate(-1deg);
}

.chat-memory-card:hover {
  transform: translateY(-4px) rotate(0);
  border-color: rgba(255, 71, 126, 0.35);
  box-shadow: 0 14px 28px rgba(94, 55, 68, 0.13);
}

.chat-memory-card:focus-visible {
  outline: 3px solid #ffc4d4;
  outline-offset: 3px;
}

.chat-memory-image {
  position: relative;
  display: block;
  height: 150px;
  margin-bottom: 13px;
  overflow: hidden;
  background: #211f20;
  border-radius: 11px;
}

.chat-memory-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: top;
}

.chat-memory-image > span {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 5px 8px;
  color: white;
  background: rgba(51, 37, 43, 0.78);
  border-radius: 999px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.chat-memory-card > strong {
  display: block;
  margin: 0 4px 6px;
  font:
    400 17px/1.15 "DM Serif Display",
    serif;
}

.chat-memory-card > small {
  display: block;
  margin: 0 4px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.45;
}

.chat-viewer {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  overflow-y: auto;
  background: rgba(38, 25, 30, 0.82);
  backdrop-filter: blur(10px);
}

.chat-viewer-card {
  position: relative;
  width: min(100%, 620px);
  margin: auto;
  padding: clamp(22px, 5vw, 34px);
  color: #33252b;
  background: #fffaf9;
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 24px;
  box-shadow: 0 30px 90px rgba(20, 8, 12, 0.35);
  text-align: center;
}

.chat-viewer-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 38px;
  height: 38px;
  color: #7a5e68;
  background: #fff0f4;
  border: 1px solid rgba(255, 71, 126, 0.18);
  border-radius: 50%;
  cursor: pointer;
  font: 400 26px/1 sans-serif;
}

.chat-viewer-eyebrow {
  margin: 0 42px 7px;
  color: #ff477e;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.chat-viewer-card h2 {
  margin: 0 35px 7px;
  font:
    400 clamp(28px, 6vw, 40px)/1.1 "DM Serif Display",
    serif;
}

.chat-viewer-card > p:not(.chat-viewer-eyebrow) {
  margin: 0 auto 18px;
  color: #796970;
  font-size: 13px;
  line-height: 1.55;
}

.chat-viewer-image {
  max-height: 62vh;
  overflow: auto;
  background: #1d1d1d;
  border: 6px solid white;
  border-radius: 15px;
  box-shadow: 0 12px 30px rgba(51, 37, 43, 0.18);
}

.chat-viewer-image img {
  width: 100%;
  height: auto;
  display: block;
}

.chat-viewer-actions {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
}

.chat-viewer-actions button {
  padding: 10px 12px;
  color: #ff477e;
  background: #fff0f4;
  border: 1px solid rgba(255, 71, 126, 0.18);
  border-radius: 999px;
  cursor: pointer;
  font:
    700 11px "DM Sans",
    sans-serif;
}

.chat-viewer-actions button:last-child {
  justify-self: end;
}

.chat-viewer-actions button:first-child {
  justify-self: start;
}

.chat-viewer-actions span {
  color: #9a818a;
  font-size: 11px;
  font-weight: 700;
}

.movie-memories {
  margin: 0 0 42px;
  padding: clamp(24px, 5vw, 36px);
  color: #fff8ef;
  background:
    radial-gradient(circle at 88% 8%, rgba(255, 198, 92, 0.18), transparent 25%),
    linear-gradient(145deg, #281d22, #171215);
  border: 1px solid rgba(255, 213, 139, 0.22);
  border-radius: 24px;
  box-shadow: 0 18px 42px rgba(51, 37, 43, 0.15);
}

.movie-memories-heading {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 25px;
}

.movie-kicker {
  margin: 0;
  color: #f7bd69;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.movie-memories-heading h2 {
  margin: 7px 0;
  font: 400 clamp(26px, 5vw, 36px)/1.1 "DM Serif Display", serif;
}

.movie-memories-heading > div > p:last-child {
  max-width: 540px;
  margin: 0;
  color: #cdbfc3;
  font-size: 13px;
  line-height: 1.6;
}

.movie-reel {
  font-size: 38px;
  filter: grayscale(0.15);
}

.movie-memory-list {
  display: grid;
  gap: 11px;
}

.movie-memory-card {
  position: relative;
  display: grid;
  grid-template-columns: 42px 150px 1fr;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 10px 16px 10px 8px;
  overflow: hidden;
  color: #fff8ef;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
}

.movie-memory-card::before,
.movie-memory-card::after {
  position: absolute;
  left: 188px;
  width: 12px;
  height: 12px;
  content: "";
  background: #1b1518;
  border-radius: 50%;
}

.movie-memory-card::before { top: -7px; }
.movie-memory-card::after { bottom: -7px; }

.movie-memory-card:hover {
  transform: translateX(4px);
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(247, 189, 105, 0.45);
}

.movie-memory-card:focus-visible {
  outline: 3px solid #f7bd69;
  outline-offset: 3px;
}

.movie-memory-number {
  color: #f7bd69;
  font: 400 20px/1 "DM Serif Display", serif;
  text-align: center;
}

.movie-memory-image {
  position: relative;
  display: block;
  height: 82px;
  overflow: hidden;
  background: #0b090a;
  border-radius: 9px;
}

.movie-memory-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.movie-memory-image > span {
  position: absolute;
  inset: 50% auto auto 50%;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding-left: 2px;
  color: #281d22;
  background: rgba(255, 248, 239, 0.88);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
}

.movie-memory-copy { min-width: 0; }
.movie-memory-copy small {
  display: block;
  margin-bottom: 4px;
  color: #f7bd69;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.movie-memory-copy strong {
  display: block;
  margin-bottom: 4px;
  font: 400 18px/1.15 "DM Serif Display", serif;
}
.movie-memory-copy > span {
  display: -webkit-box;
  overflow: hidden;
  color: #cdbfc3;
  font-size: 10px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.movie-viewer { background: rgba(12, 9, 10, 0.9); }
.movie-viewer-card {
  color: #fff8ef;
  background: linear-gradient(145deg, #2a2024, #171214);
  border-color: rgba(247, 189, 105, 0.25);
}
.movie-viewer-close {
  color: #f7bd69;
  background: rgba(247, 189, 105, 0.1);
  border-color: rgba(247, 189, 105, 0.24);
}
.movie-viewer-eyebrow { color: #f7bd69; }
.movie-viewer-card > p:not(.chat-viewer-eyebrow) { color: #cdbfc3; }
.movie-viewer-image { border-color: #fff8ef; }
.movie-viewer-actions button {
  color: #f7bd69;
  background: rgba(247, 189, 105, 0.1);
  border-color: rgba(247, 189, 105, 0.25);
}
.movie-viewer-actions span { color: #cdbfc3; }

.gift-surprise {
  position: relative;
  margin: 0 0 42px;
  padding: clamp(28px, 6vw, 44px);
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 12%, rgba(255, 255, 255, 0.9), transparent 22%),
    radial-gradient(circle at 90% 88%, rgba(255, 210, 121, 0.2), transparent 28%),
    linear-gradient(145deg, #fff9ee, #fff0f5);
  border: 1px solid rgba(255, 71, 126, 0.2);
  border-radius: 28px;
  box-shadow: 0 16px 40px rgba(94, 55, 68, 0.1);
  text-align: center;
}

.gift-surprise::before,
.gift-surprise::after {
  position: absolute;
  width: 120px;
  height: 120px;
  content: "";
  border: 1px dashed rgba(255, 71, 126, 0.15);
  border-radius: 50%;
}
.gift-surprise::before { top: -68px; left: -45px; }
.gift-surprise::after { right: -55px; bottom: -72px; }

.gift-surprise-sparkles {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-bottom: 10px;
  color: #ff477e;
}
.gift-surprise-sparkles span:nth-child(2) {
  display: grid;
  place-items: center;
  width: 35px;
  height: 35px;
  color: white;
  background: #ff477e;
  border-radius: 50%;
  box-shadow: 0 6px 14px rgba(255, 71, 126, 0.25);
}

.gift-surprise-heading {
  position: relative;
  z-index: 1;
  max-width: 600px;
  margin: 0 auto 25px;
}
.gift-surprise-heading h2 {
  margin: 7px 0 8px;
  font: 400 clamp(28px, 5vw, 39px)/1.1 "DM Serif Display", serif;
}
.gift-surprise-heading > p:last-child {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.65;
}

.gift-box-button {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(100%, 430px);
  margin: 0 auto;
  padding: 10px 24px 20px;
  color: var(--ink);
  background: transparent;
  border: 0;
  border-radius: 20px;
  cursor: pointer;
  font-family: inherit;
}
.gift-box-button:focus-visible {
  outline: 3px solid #ff9eb9;
  outline-offset: 4px;
}
.gift-box-button strong {
  margin-top: 13px;
  color: #ff477e;
  font-size: 14px;
}
.gift-box-button small {
  margin-top: 5px;
  color: var(--muted);
  font-size: 10px;
}

.gift-box {
  position: relative;
  display: block;
  width: 132px;
  height: 118px;
  transition: transform 220ms ease;
}
.gift-box-button:hover .gift-box {
  transform: translateY(-5px) rotate(-2deg);
}
.gift-box-body,
.gift-box-lid {
  position: absolute;
  left: 50%;
  display: block;
  background: linear-gradient(135deg, #ff7199, #ff477e);
  border: 2px solid rgba(153, 39, 72, 0.22);
  box-shadow: 0 10px 20px rgba(255, 71, 126, 0.2);
  transform: translateX(-50%);
}
.gift-box-body {
  bottom: 0;
  width: 105px;
  height: 78px;
  border-radius: 5px 5px 13px 13px;
}
.gift-box-lid {
  z-index: 2;
  top: 28px;
  width: 124px;
  height: 27px;
  border-radius: 8px 8px 4px 4px;
}
.gift-box-ribbon {
  position: absolute;
  z-index: 3;
  bottom: 0;
  left: 50%;
  width: 21px;
  height: 90px;
  display: block;
  background: #ffd67d;
  transform: translateX(-50%);
}
.gift-box-bow {
  position: absolute;
  z-index: 4;
  top: 0;
  left: 50%;
  display: grid;
  place-items: center;
  width: 48px;
  height: 38px;
  color: #ff477e;
  background: #ffd67d;
  border-radius: 50% 50% 45% 45%;
  transform: translateX(-50%);
  font-size: 16px;
}

.gift-memory-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 30px;
  text-align: left;
}
.gift-memory-card {
  position: relative;
  padding: 12px 12px 20px;
  background: #fff;
  border: 1px solid rgba(93, 60, 71, 0.1);
  box-shadow: 0 14px 30px rgba(76, 45, 56, 0.13);
}
.gift-memory-card--1 { transform: rotate(-1.5deg); }
.gift-memory-card--2 { transform: rotate(1.4deg); }
.gift-tape {
  position: absolute;
  z-index: 2;
  top: -10px;
  left: 50%;
  width: 72px;
  height: 23px;
  background: rgba(255, 214, 125, 0.75);
  transform: translateX(-50%) rotate(-2deg);
}
.gift-memory-image {
  height: 260px;
  overflow: hidden;
  background: #1b1017;
}
.gift-memory-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}
.gift-memory-copy { padding: 17px 8px 0; }
.gift-memory-copy small {
  color: #ff477e;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.13em;
}
.gift-memory-copy h3 {
  margin: 5px 0 7px;
  font: 400 21px/1.15 "DM Serif Display", serif;
}
.gift-memory-copy p {
  margin: 0;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.55;
}
.gift-surprise-message {
  grid-column: 1 / -1;
  max-width: 520px;
  margin: 10px auto 0;
  color: #ff477e;
  font: italic 400 17px/1.5 "DM Serif Display", serif;
  text-align: center;
}

.gift-reveal-enter-active { transition: all 520ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.gift-reveal-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.96);
}

.couple-portraits {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  margin: 4px 0 35px;
  padding: 18px 0;
}

.portrait-card {
  width: min(48%, 260px);
  margin: 0;
  padding: 9px 9px 17px;
  background: #fff;
  border: 1px solid rgba(73, 46, 56, 0.1);
  box-shadow: 0 15px 35px rgba(78, 49, 59, 0.15);
}

.portrait-card--kakada {
  transform: rotate(-5deg) translateX(8px);
}
.portrait-card--daneth {
  transform: rotate(5deg) translateX(-8px);
}

.portrait-card img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  object-position: center;
  filter: saturate(0.92) contrast(0.98);
}

.portrait-card figcaption {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 11px 5px 0;
  text-align: center;
}

.portrait-card figcaption strong {
  font:
    400 20px "DM Serif Display",
    serif;
}

.portrait-card figcaption span {
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.portrait-heart {
  position: relative;
  z-index: 3;
  width: 54px;
  height: 54px;
  flex: 0 0 54px;
  display: grid;
  place-items: center;
  margin-inline: -14px;
  color: white;
  background: var(--pink);
  border: 5px solid var(--paper);
  border-radius: 50%;
  box-shadow: 0 7px 18px rgba(255, 71, 126, 0.3);
  font-size: 22px;
}

.love-timeline {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 18px;
  margin-bottom: 28px;
  padding: 18px 20px;
  background: #fff7f7;
  border: 1px solid #f4dfe4;
  border-radius: 12px;
}

.love-timeline > div:not(.timeline-line) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.love-timeline > div:last-child {
  text-align: right;
}
.love-timeline span {
  color: var(--pink);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.love-timeline strong {
  font:
    400 19px "DM Serif Display",
    serif;
  white-space: nowrap;
}

.timeline-line {
  position: relative;
  height: 1px;
  background: #e9bac7;
}

.timeline-line span {
  position: absolute;
  top: 50%;
  left: 50%;
  padding: 3px 7px;
  background: #fff7f7;
  transform: translate(-50%, -50%);
  font-size: 13px;
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: 25px 0;
  border-block: 1px solid #e7dcdf;
}

.score-block {
  display: flex;
  flex-direction: column;
}
.score-block strong {
  font:
    400 43px/1.1 "DM Serif Display",
    serif;
}
.score-note {
  color: var(--muted);
  font-size: 12px;
}

.stamp {
  width: 122px;
  aspect-ratio: 1;
  flex: 0 0 auto;
  display: grid;
  place-content: center;
  text-align: center;
  color: var(--pink);
  border: 3px double var(--pink);
  border-radius: 50%;
  transform: rotate(-9deg);
}
.stamp span {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.15em;
}
.stamp strong {
  font-size: 16px;
  letter-spacing: 0.08em;
}
.stamp small {
  font-size: 9px;
  margin-top: 3px;
}

.benefits {
  padding: 28px 0 10px;
}
.benefits ul {
  list-style: none;
  margin: 18px 0;
  padding: 0;
  display: grid;
  gap: 11px;
}
.benefits li {
  display: flex;
  align-items: center;
  gap: 13px;
  font-size: 14px;
  font-weight: 600;
}
.benefits li span {
  color: #c7aeb7;
  font-size: 10px;
  letter-spacing: 0.1em;
}

blockquote {
  margin: 24px 0 30px;
  padding: 23px 25px;
  color: #56434a;
  background: #fff3f5;
  border-left: 3px solid var(--pink);
  font:
    400 18px/1.6 "DM Serif Display",
    serif;
}

.signature-row {
  margin-top: 12px;
}
.signature-row > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.signature {
  font:
    italic 25px "DM Serif Display",
    serif;
}
.heart-seal {
  color: var(--pink);
  font-size: 34px;
}

.celebrate-button {
  width: 100%;
  margin-top: 34px;
  padding: 15px 20px;
  color: white;
  background: var(--ink);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  display: block;
  font:
    700 14px "DM Sans",
    sans-serif;
  text-align: center;
  text-decoration: none;
  transition:
    transform 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}
.celebrate-button:hover {
  transform: translateY(-2px);
  background: var(--pink);
  box-shadow: 0 9px 24px rgba(255, 71, 126, 0.26);
}
.celebrate-button:active {
  transform: translateY(0);
}
.celebrate-button:focus-visible {
  outline: 3px solid #ffc4d4;
  outline-offset: 3px;
}

.footer-note {
  z-index: 2;
  margin: 0;
  color: #8d727b;
  font-size: 12px;
  text-align: center;
}
.ambient-heart {
  position: absolute;
  color: rgba(255, 71, 126, 0.14);
  font-family: serif;
  line-height: 1;
}
.ambient-heart--one {
  top: 8%;
  left: 7%;
  font-size: 80px;
  transform: rotate(-18deg);
}
.ambient-heart--two {
  right: 8%;
  top: 22%;
  font-size: 46px;
  transform: rotate(14deg);
}
.ambient-heart--three {
  left: 12%;
  bottom: 9%;
  font-size: 35px;
  transform: rotate(8deg);
}

@media (max-width: 560px) {
  .love-page {
    padding: 28px 14px 24px;
  }
  .music-controls {
    top: 10px;
    right: 10px;
    gap: 6px;
  }
  .music-toggle {
    padding: 8px 11px;
    font-size: 9px;
  }
  .mute-toggle {
    width: 34px;
    height: 34px;
  }
  .review-card {
    box-shadow: 5px 6px 0 #ffc9d7;
  }
  .lock-icon {
    margin-top: 32px;
  }
  .countdown {
    gap: 4px;
    margin-top: 30px;
    padding: 20px 8px;
  }
  .countdown strong {
    font-size: clamp(24px, 8vw, 34px);
  }
  .countdown-separator {
    font-size: 25px;
  }
  .countdown div span {
    font-size: 7px;
    letter-spacing: 0.06em;
  }
  .hero-copy {
    margin: 24px 0 28px;
    padding: 32px 16px 30px;
    border-radius: 20px;
  }
  .hero-copy .kicker {
    gap: 6px;
    padding: 7px 10px;
    font-size: 8px;
    letter-spacing: 0.1em;
  }
  .hero-copy h1 {
    margin-top: 19px;
    font-size: clamp(35px, 11vw, 48px);
  }
  .hero-heart--left {
    top: 15px;
    left: 14px;
  }
  .hero-heart--right {
    right: 15px;
    bottom: 17px;
  }
  .our-moments {
    padding: 21px 13px;
  }
  .moments-album-button {
    padding: 25px 16px 23px;
  }
  .moments-album-preview {
    width: 210px;
    height: 138px;
  }
  .moments-album-preview img {
    width: 116px;
    height: 124px;
  }
  .moments-album-secret {
    right: 0;
    width: 56px;
    height: 56px;
  }
  .moments-album-heart {
    right: 26px;
  }
  .first-photo-memory {
    grid-template-columns: 1fr;
    gap: 21px;
    padding: 17px;
  }
  .first-photo-frame {
    width: 92%;
    margin: 0 auto;
  }
  .first-photo-frame .moment-photo {
    height: auto;
  }
  .moment-video-grid {
    grid-template-columns: 1fr;
  }
  .moment-video-card video {
    height: 240px;
  }
  .moment-video-card--featured {
    display: block;
  }
  .moment-video-card--featured video {
    height: 240px;
  }
  .kampot-memory-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .kampot-photo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 100px;
  }
  .chat-memories {
    padding: 20px 14px;
  }
  .chat-memories-heading {
    gap: 11px;
  }
  .chat-memories-icon {
    width: 40px;
    height: 40px;
    flex-basis: 40px;
    font-size: 19px;
  }
  .chat-memory-grid {
    grid-template-columns: 1fr;
  }
  .chat-memory-card,
  .chat-memory-card:nth-child(2),
  .chat-memory-card:nth-child(3) {
    display: grid;
    grid-template-columns: 105px 1fr;
    column-gap: 12px;
    transform: none;
  }
  .chat-memory-image {
    grid-row: 1 / 3;
    height: 112px;
    margin: 0;
  }
  .chat-memory-card > strong {
    align-self: end;
    margin: 5px 2px 4px;
  }
  .chat-memory-card > small {
    align-self: start;
    margin: 0 2px;
  }
  .chat-memory-image > span {
    display: none;
  }
  .chat-viewer {
    padding: 10px;
  }
  .chat-viewer-card {
    padding: 24px 14px 18px;
    border-radius: 20px;
  }
  .chat-viewer-image {
    max-height: 66vh;
  }
  .chat-viewer-actions {
    gap: 7px;
  }
  .chat-viewer-actions button {
    padding: 9px 10px;
    font-size: 10px;
  }
  .movie-memories {
    padding: 22px 13px;
  }
  .movie-memories-heading {
    gap: 10px;
  }
  .movie-reel {
    font-size: 28px;
  }
  .movie-memory-card {
    grid-template-columns: 28px 92px 1fr;
    gap: 9px;
    padding: 8px 10px 8px 5px;
  }
  .movie-memory-card::before,
  .movie-memory-card::after {
    left: 126px;
  }
  .movie-memory-number {
    font-size: 15px;
  }
  .movie-memory-image {
    height: 74px;
  }
  .movie-memory-copy strong {
    font-size: 15px;
  }
  .movie-memory-copy > span {
    font-size: 9px;
  }
  .movie-viewer-image {
    max-height: 60vh;
  }
  .gift-surprise {
    padding: 24px 13px 28px;
  }
  .gift-surprise-heading {
    margin-bottom: 18px;
  }
  .gift-memory-grid {
    grid-template-columns: 1fr;
    gap: 26px;
    margin: 26px 4px 0;
  }
  .gift-memory-card--1,
  .gift-memory-card--2 {
    transform: none;
  }
  .gift-memory-image {
    height: 235px;
  }
  .gift-surprise-message {
    margin-top: 2px;
    font-size: 15px;
  }
  .result-row {
    align-items: flex-start;
  }
  .couple-portraits {
    min-height: 230px;
    margin-bottom: 22px;
  }
  .portrait-card {
    width: 48%;
    padding: 6px 6px 13px;
  }
  .portrait-card figcaption strong {
    font-size: 16px;
  }
  .portrait-card figcaption span {
    font-size: 8px;
  }
  .portrait-heart {
    width: 42px;
    height: 42px;
    flex-basis: 42px;
    border-width: 4px;
    font-size: 17px;
  }
  .love-timeline {
    grid-template-columns: minmax(0, auto) minmax(24px, 1fr) minmax(0, auto);
    gap: 7px;
    padding: 15px 10px;
  }
  .love-timeline span {
    font-size: 7px;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
  .love-timeline strong {
    font-size: clamp(13px, 4vw, 17px);
  }
  .timeline-line {
    width: auto;
    height: 1px;
    margin: 0;
  }
  .timeline-line span {
    font-size: 11px;
  }
  .stamp {
    width: 92px;
  }
  .stamp strong {
    font-size: 13px;
  }
  blockquote {
    padding: 19px;
    font-size: 17px;
  }
  .card-topline {
    align-items: flex-start;
  }
  .case-number {
    text-align: right;
  }
}

@media (prefers-reduced-motion: reduce) {
  .celebrate-button {
    transition: none;
  }
  .moments-album-heart {
    animation: none;
  }
  .entrance-hearts span:nth-child(2) {
    animation: none;
  }
  .entrance-answer,
  .entrance-gate-leave-active {
    transition: none;
  }
  .moments-album-button,
  .moments-album-button::after,
  .moments-album-preview img,
  .moments-album-action > span {
    transition: none;
  }
  .heart-rain span {
    display: none;
  }
}
</style>
