<script setup lang="ts">
import confetti from "canvas-confetti";
import { CalendarDays, Gift, Heart, Image as ImageIcon, MapPin, Navigation, Sparkles } from "lucide-vue-next";
import {
  MOMENT_COPY,
  getMomentOccasionCopy,
  type MomentLocale,
} from "~/data/moment-locales";
import { getMomentCategory, getMomentOccasion } from "~/data/moments";
import { getMomentCounterCopy, readMomentBlockText } from "~/lib/moments";
import type { InvitationGuestIdentity, MomentPollSummary, MomentRsvpChoice, ReadyMoment } from "~/types/moment";

const props = withDefaults(
  defineProps<{
    moment: ReadyMoment;
    preview?: boolean;
    locale?: MomentLocale;
    invitationGuest?: InvitationGuestIdentity | null;
  }>(),
  {
    preview: false,
    locale: "en",
    invitationGuest: null,
  },
);
const { user, isReady, fetchMe } = useAuth();

const isSecretOpen = ref(false);
const isHolding = ref(false);
const rsvpChoice = ref<MomentRsvpChoice | "">("");
const rsvpName = ref("");
const rsvpGuestCount = ref(1);
const rsvpNote = ref("");
const rsvpSaving = ref(false);
const rsvpSaved = ref(false);
const rsvpError = ref("");
const voteChoice = ref("");
const voterName = ref("");
const voteSaving = ref(false);
const voteSaved = ref(false);
const voteError = ref("");
const showVoteLogin = ref(false);
const pollSummary = ref<MomentPollSummary | undefined>(props.moment.pollSummary);
let holdTimer: ReturnType<typeof setTimeout> | null = null;

const heroBlock = computed(() =>
  props.moment.blocks.find((block) => block.type === "HERO"),
);
const messageBlock = computed(() =>
  props.moment.blocks.find((block) => block.type === "MESSAGE"),
);
const counterBlock = computed(() =>
  props.moment.blocks.find((block) => block.type === "COUNTER"),
);
const secretBlock = computed(() =>
  props.moment.blocks.find((block) => block.type === "SECRET"),
);
const eventBlock = computed(() => props.moment.blocks.find((block) => block.type === "EVENT_DETAILS"));
const locationBlock = computed(() => props.moment.blocks.find((block) => block.type === "LOCATION"));
const scheduleBlock = computed(() => props.moment.blocks.find((block) => block.type === "SCHEDULE"));
const rsvpBlock = computed(() => props.moment.blocks.find((block) => block.type === "RSVP"));
const pollBlock = computed(() => props.moment.blocks.find((block) => block.type === "POLL"));
const pollQuestion = computed(() => readMomentBlockText(pollBlock.value, "question"));
const pollOptions = computed(() => {
  const value = pollBlock.value?.data.options;
  if (!Array.isArray(value)) return [];
  return value.filter((option): option is { id: string; label: string } =>
    Boolean(option && typeof option === "object" && typeof option.id === "string" && typeof option.label === "string"),
  );
});
const pollIdentityMode = computed(() => {
  const mode = pollBlock.value?.data.identityMode ?? pollSummary.value?.identityMode;
  if (mode === "NAME_REQUIRED" || mode === "LOGIN_REQUIRED") return mode;
  return pollBlock.value?.data.requireName === true ? "NAME_REQUIRED" : "ANONYMOUS";
});
const pollRequiresName = computed(() => pollIdentityMode.value === "NAME_REQUIRED");
const pollRequiresLogin = computed(() => pollIdentityMode.value === "LOGIN_REQUIRED");
const heroTitle = computed(
  () => readMomentBlockText(heroBlock.value, "title") || props.moment.title,
);
const displayedHeroTitle = computed(
  () => props.invitationGuest?.displayName || heroTitle.value,
);
const message = computed(() =>
  readMomentBlockText(messageBlock.value, "message"),
);
const secretMessage = computed(() =>
  readMomentBlockText(secretBlock.value, "message"),
);
const counter = computed(() =>
  getMomentCounterCopy(
    readMomentBlockText(counterBlock.value, "date"),
    new Date(),
    props.locale,
  ),
);
const occasion = computed(() => getMomentOccasion(props.moment.occasion));
const isInvitation = computed(() => props.moment.occasion === "INVITATION");
const isVoting = computed(() => props.moment.occasion === "VOTING");
const occasionLabel = computed(
  () =>
    getMomentOccasionCopy(props.moment.occasion, props.locale)?.label ??
    occasion.value.label,
);
const experienceCopy = computed(() => MOMENT_COPY[props.locale].experience);
const heroIntro = computed(() =>
  isInvitation.value
    ? experienceCopy.value.invitationIntro
    : experienceCopy.value.forPerson,
);
const scrollCopy = computed(() =>
  isInvitation.value
    ? experienceCopy.value.invitationScroll
    : experienceCopy.value.scroll,
);
const photos = computed(() =>
  [...props.moment.media].sort((a, b) => a.position - b.position),
);
const heroPhoto = computed(() => photos.value[0]);
const themeClass = computed(
  () => `moment-theme-${props.moment.theme.toLowerCase()}`,
);
const occasionClass = computed(
  () => `moment-occasion-${props.moment.occasion.toLowerCase().replaceAll("_", "-")}`,
);
const categoryClass = computed(
  () => `moment-category-${getMomentCategory(props.moment.occasion).value.toLowerCase().replaceAll("_", "-")}`,
);
const eventDate = computed(() => readMomentBlockText(eventBlock.value, "date"));
const venueName = computed(() => readMomentBlockText(locationBlock.value, "venueName") || readMomentBlockText(eventBlock.value, "venueName"));
const eventAddress = computed(() => readMomentBlockText(locationBlock.value, "address"));
const mapUrl = computed(() => readMomentBlockText(locationBlock.value, "mapUrl"));
const mapQuery = computed(() =>
  [...new Set([venueName.value.trim(), eventAddress.value.trim()].filter(Boolean))].join(" "),
);
const directionsUrl = computed(() =>
  mapUrl.value || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery.value)}`,
);
const mapEmbedUrl = computed(() =>
  eventAddress.value
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery.value)}&output=embed`
    : "",
);
const dressCode = computed(() => readMomentBlockText(eventBlock.value, "dressCode"));
const hostName = computed(() => readMomentBlockText(eventBlock.value, "hostName"));
const eventSchedule = computed(() => readMomentBlockText(scheduleBlock.value, "schedule"));
const eventDetailCount = computed(() =>
  Number(Boolean(venueName.value || eventAddress.value)) + Number(Boolean(dressCode.value)),
);
const formattedEventDate = computed(() => {
  const date = new Date(eventDate.value);
  if (Number.isNaN(date.getTime())) return "";
  if (props.locale === "km") return formatKhmerEventDate(date);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(date);
});

function formatKhmerEventDate(date: Date) {
  const weekdays = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];
  const months = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
  const khmerDigits = (value: number) => String(value).replace(/\d/g, (digit) => "០១២៣៤៥៦៧៨៩"[Number(digit)]!);
  const hour = date.getHours();
  const period = hour < 12 ? "ព្រឹក" : "រសៀល";
  const displayHour = hour % 12 || 12;
  return `ថ្ងៃ${weekdays[date.getDay()]} ទី${khmerDigits(date.getDate())} ខែ${months[date.getMonth()]} ឆ្នាំ${khmerDigits(date.getFullYear())} ម៉ោង ${khmerDigits(displayHour)}:${khmerDigits(date.getMinutes()).padStart(2, "០")} ${period}`;
}
const calendarUrl = computed(() => {
  const date = new Date(eventDate.value);
  if (Number.isNaN(date.getTime())) return "";
  const format = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(date.getTime() + 2 * 60 * 60 * 1000);
  const params = new URLSearchParams({ action: "TEMPLATE", text: props.moment.title, dates: `${format(date)}/${format(end)}`, location: `${venueName.value}, ${eventAddress.value}`, details: message.value });
  return `https://calendar.google.com/calendar/render?${params}`;
});

async function submitRsvp() {
  if (props.preview || !rsvpChoice.value || rsvpSaving.value) return;
  rsvpSaving.value = true;
  rsvpError.value = "";
  try {
    const storageKey = `chlatwork_moment_rsvp_${props.moment.slug}`;
    let responseToken: string | undefined;
    if (!props.invitationGuest) {
      responseToken = localStorage.getItem(storageKey) ?? undefined;
      if (!responseToken) {
        responseToken = crypto.randomUUID();
        localStorage.setItem(storageKey, responseToken);
      }
    }
    await $fetch(`/api/moments/${props.moment.slug}/rsvp`, {
      method: "POST",
      body: { responseToken, guestToken: props.invitationGuest?.token, choice: rsvpChoice.value, guestName: props.invitationGuest ? undefined : rsvpName.value || undefined, guestCount: rsvpChoice.value === "NO" ? 0 : rsvpGuestCount.value, note: rsvpNote.value || undefined },
    });
    rsvpSaved.value = true;
  } catch {
    rsvpError.value = experienceCopy.value.rsvpError;
  } finally {
    rsvpSaving.value = false;
  }
}

async function submitVote() {
  if (props.preview || !voteChoice.value || voteSaving.value) return;
  if (pollRequiresLogin.value) {
    if (!isReady.value) await fetchMe();
    if (!user.value) {
      showVoteLogin.value = true;
      return;
    }
  }
  voteSaving.value = true;
  voteError.value = "";
  try {
    const storageKey = `chlatwork_moment_vote_${props.moment.slug}`;
    let responseToken = localStorage.getItem(storageKey);
    if (!responseToken) {
      responseToken = crypto.randomUUID();
      localStorage.setItem(storageKey, responseToken);
    }
    pollSummary.value = await $fetch<MomentPollSummary>(`/api/moments/${props.moment.slug}/vote`, {
      method: "POST",
      body: { responseToken, optionId: voteChoice.value, voterName: voterName.value || undefined },
    });
    localStorage.setItem(
      `${storageKey}_selection`,
      JSON.stringify({ optionId: voteChoice.value, voterName: pollRequiresName.value ? voterName.value : "" }),
    );
    voteSaved.value = true;
  } catch {
    voteError.value = experienceCopy.value.voteError;
  } finally {
    voteSaving.value = false;
  }
}

async function continueVoteAfterLogin() {
  showVoteLogin.value = false;
  await fetchMe();
  if (user.value) await submitVote();
}

onMounted(() => {
  if (props.preview || !pollBlock.value) return;
  try {
    const saved = JSON.parse(localStorage.getItem(`chlatwork_moment_vote_${props.moment.slug}_selection`) ?? "null") as { optionId?: string; voterName?: string } | null;
    if (saved?.optionId && pollOptions.value.some((option) => option.id === saved.optionId)) {
      voteChoice.value = saved.optionId;
      voterName.value = saved.voterName ?? "";
      voteSaved.value = true;
    }
  } catch {
    // A malformed local preference should never prevent someone from voting.
  }
});

function pollVotes(optionId: string) {
  return pollSummary.value?.results.find((result) => result.optionId === optionId)?.votes ?? 0;
}

function pollPercent(optionId: string) {
  return pollSummary.value?.totalVotes
    ? Math.round((pollVotes(optionId) / pollSummary.value.totalVotes) * 100)
    : 0;
}

function startHold() {
  if (isSecretOpen.value || holdTimer) return;
  isHolding.value = true;
  holdTimer = setTimeout(revealSecret, 1800);
}

function cancelHold() {
  if (holdTimer) clearTimeout(holdTimer);
  holdTimer = null;
  isHolding.value = false;
}

function revealSecret() {
  cancelHold();
  if (isSecretOpen.value) return;
  isSecretOpen.value = true;
  if (!import.meta.client) return;
  confetti({
    particleCount: 120,
    spread: 82,
    startVelocity: 34,
    origin: { y: 0.72 },
    colors: ["#fb7185", "#f9a8d4", "#f5d08a", "#ffffff"],
    disableForReducedMotion: true,
    zIndex: 80,
  });
}

onBeforeUnmount(cancelHold);
</script>

<template>
  <article
    class="moment-experience"
    :class="[
      themeClass,
      occasionClass,
      categoryClass,
      { 'is-preview': preview, 'is-khmer': locale === 'km' },
    ]"
    :lang="locale === 'km' ? 'km' : 'en'"
  >
    <div class="moment-glow moment-glow-one" aria-hidden="true" />
    <div class="moment-glow moment-glow-two" aria-hidden="true" />
    <div class="occasion-atmosphere" aria-hidden="true">
      <i v-for="index in 12" :key="`particle-${index}`" :style="{ '--particle-index': index }" />
      <span v-for="index in 6" :key="`symbol-${index}`" :style="{ '--symbol-index': index }" />
    </div>

    <header v-if="!isVoting" class="moment-hero">
      <div class="occasion-pill">
        <span aria-hidden="true">{{ occasion.emoji }}</span>
        {{ experienceCopy.occasionMoment(occasionLabel) }}
      </div>
      <p v-if="!invitationGuest" class="eyebrow">{{ heroIntro }}</p>
      <p v-if="invitationGuest" class="personal-invitation-eyebrow">
        {{ experienceCopy.respectfullyInvited }}
      </p>
      <h1>{{ displayedHeroTitle }}</h1>
      <p class="scroll-note">{{ scrollCopy }}</p>

      <figure v-if="heroPhoto && !isVoting" class="hero-photo-wrap">
        <img
          :src="heroPhoto.url"
          :alt="experienceCopy.heroAlt(moment.recipientName)"
          class="hero-photo"
        />
        <span class="photo-tape photo-tape-left" aria-hidden="true" />
        <span class="photo-tape photo-tape-right" aria-hidden="true" />
      </figure>
      <div
        v-else-if="!isVoting"
        class="hero-placeholder"
        :aria-label="experienceCopy.photoPlaceholderLabel"
      >
        <ImageIcon class="h-9 w-9" aria-hidden="true" />
        <span>{{ experienceCopy.photoPlaceholder }}</span>
      </div>
    </header>

    <section
      v-if="!isVoting"
      class="moment-section message-section"
      aria-labelledby="moment-message-title"
    >
      <Sparkles class="section-icon" aria-hidden="true" />
      <p id="moment-message-title" class="section-kicker">
        {{ experienceCopy.note }}
      </p>
      <p class="personal-message">“{{ message }}”</p>
      <Heart class="mx-auto mt-7 h-5 w-5 fill-current" aria-hidden="true" />
    </section>

    <section v-if="eventBlock" class="moment-section event-section" aria-labelledby="event-details-title">
      <p class="section-kicker">{{ experienceCopy.eventDetails }}</p>
      <h2 id="event-details-title">{{ formattedEventDate }}</h2>
      <p v-if="hostName" class="event-host">{{ experienceCopy.hostedBy(hostName) }}</p>
      <div class="event-actions">
        <a v-if="calendarUrl" :href="calendarUrl" target="_blank" rel="noopener noreferrer"><CalendarDays class="h-5 w-5" />{{ experienceCopy.addCalendar }}</a>
      </div>
      <div class="event-detail-grid" :class="{ 'is-single': eventDetailCount === 1 }">
        <div v-if="venueName || eventAddress" class="event-detail-card">
          <MapPin class="h-6 w-6" aria-hidden="true" />
          <strong>{{ experienceCopy.location }}</strong>
          <span>{{ venueName }}</span><p>{{ eventAddress }}</p>
          <a v-if="eventAddress" :href="directionsUrl" target="_blank" rel="noopener noreferrer"><Navigation class="h-4 w-4" />{{ experienceCopy.openMap }}</a>
        </div>
        <div v-if="dressCode" class="event-detail-card"><Sparkles class="h-6 w-6" aria-hidden="true" /><strong>{{ experienceCopy.dressCode }}</strong><p>{{ dressCode }}</p></div>
      </div>
      <div v-if="mapEmbedUrl" class="map-frame">
        <iframe
          :src="mapEmbedUrl"
          :title="experienceCopy.mapTitle"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        />
      </div>
      <div v-if="eventSchedule" class="schedule-card"><strong>{{ experienceCopy.schedule }}</strong><p>{{ eventSchedule }}</p></div>
    </section>

    <section v-if="rsvpBlock" class="moment-section rsvp-section" aria-labelledby="rsvp-title">
      <p class="section-kicker">{{ experienceCopy.rsvpKicker }}</p>
      <h2 id="rsvp-title">{{ experienceCopy.rsvpTitle }}</h2>
      <p v-if="preview" class="rsvp-status">{{ experienceCopy.previewRsvp }}</p>
      <form v-else class="rsvp-form" @submit.prevent="submitRsvp">
        <div class="rsvp-choices">
          <label v-for="choice in ([['YES', experienceCopy.yes], ['MAYBE', experienceCopy.maybe], ['NO', experienceCopy.no]] as const)" :key="choice[0]" :class="{ selected: rsvpChoice === choice[0] }">
            <input v-model="rsvpChoice" type="radio" name="rsvp" :value="choice[0]" required />
            <span>{{ choice[1] }}</span>
          </label>
        </div>
        <div v-if="rsvpChoice" class="rsvp-fields">
          <input v-if="!invitationGuest" v-model="rsvpName" maxlength="80" :placeholder="experienceCopy.guestName" />
          <label v-if="rsvpChoice !== 'NO'">{{ experienceCopy.guestCount }}<input v-model.number="rsvpGuestCount" type="number" min="1" :max="invitationGuest?.maxGuests ?? 20" required /></label>
          <textarea v-model="rsvpNote" maxlength="500" rows="3" :placeholder="experienceCopy.guestNote" />
          <button type="submit" :disabled="rsvpSaving">{{ rsvpSaving ? experienceCopy.sendingRsvp : experienceCopy.sendRsvp }}</button>
        </div>
        <p v-if="rsvpSaved" class="rsvp-success" role="status">{{ experienceCopy.rsvpSaved }}</p>
        <p v-if="rsvpError" class="rsvp-error" role="alert">{{ rsvpError }}</p>
      </form>
    </section>

    <section v-if="pollBlock" class="moment-section poll-section" aria-labelledby="poll-title">
      <p class="section-kicker">{{ experienceCopy.voteKicker }}</p>
      <h2 id="poll-title">{{ pollQuestion }}</h2>
      <p class="rsvp-status">{{ experienceCopy.totalVotes(pollSummary?.totalVotes ?? 0) }}</p>
      <p v-if="preview" class="rsvp-status">{{ experienceCopy.previewVote }}</p>
      <form class="poll-form" :class="{ 'is-preview': preview }" @submit.prevent="submitVote">
        <label v-for="option in pollOptions" :key="option.id" class="poll-option" :class="{ selected: voteChoice === option.id }">
          <input v-model="voteChoice" type="radio" name="poll-option" :value="option.id" :disabled="preview" required />
          <span class="poll-option-copy"><strong>{{ option.label }}</strong><small>{{ pollVotes(option.id) }} · {{ pollPercent(option.id) }}%</small></span>
          <i aria-hidden="true" :style="{ width: `${pollPercent(option.id)}%` }" />
          <span v-if="pollIdentityMode !== 'ANONYMOUS' && pollSummary?.results.find((result) => result.optionId === option.id)?.voters?.length" class="poll-voters">
            {{ experienceCopy.voters }}: {{ pollSummary.results.find((result) => result.optionId === option.id)?.voters?.join(', ') }}
          </span>
        </label>
        <input v-if="!preview && pollRequiresName" v-model="voterName" class="poll-name" maxlength="80" required :placeholder="experienceCopy.voterNameRequired" />
        <button v-if="!preview" type="submit" :disabled="voteSaving || !voteChoice || (pollRequiresName && !voterName.trim())">{{ voteSaving ? experienceCopy.savingVote : voteSaved ? experienceCopy.updateVote : pollRequiresLogin && !user ? experienceCopy.loginToVote : experienceCopy.submitVote }}</button>
        <p v-if="!preview && voteSaved" class="rsvp-success" role="status">{{ experienceCopy.voteSaved }}</p>
        <p v-if="!preview && voteError" class="rsvp-error" role="alert">{{ voteError }}</p>
      </form>
    </section>

    <AuthLoginDialog
      :open="showVoteLogin"
      :locale="locale"
      @close="showVoteLogin = false"
      @success="continueVoteAfterLogin"
    />

    <section
      v-if="photos.length && !isVoting"
      class="moment-section"
      aria-labelledby="moment-gallery-title"
    >
      <p class="section-kicker">{{ isInvitation ? experienceCopy.invitationPhotos : experienceCopy.memories }}</p>
      <h2 id="moment-gallery-title">{{ isInvitation ? experienceCopy.invitationGalleryTitle : experienceCopy.galleryTitle }}</h2>
      <div class="photo-grid" :class="{ 'is-single': photos.length === 1 }">
        <figure
          v-for="(photo, index) in photos"
          :key="photo.id"
          class="memory-photo"
          :class="`photo-${index % 5}`"
        >
          <img
            :src="photo.url"
            :alt="experienceCopy.memoryAlt(index + 1, moment.recipientName)"
            loading="lazy"
          />
          <figcaption>
            {{ experienceCopy.memory(String(index + 1).padStart(2, "0")) }}
          </figcaption>
        </figure>
      </div>
    </section>

    <section
      v-if="counter"
      class="counter-section"
      :aria-label="experienceCopy.counterLabel"
    >
      <p class="section-kicker">{{ experienceCopy.counting }}</p>
      <div class="counter-value">{{ counter.value }}</div>
      <p class="counter-unit">{{ counter.unit }}</p>
      <p class="counter-label">
        {{ counter.label }} <span aria-hidden="true">♥</span>
      </p>
    </section>

    <section
      v-if="isInvitation"
      class="moment-section invitation-note-section"
      aria-labelledby="invitation-note-title"
    >
      <Sparkles class="section-icon" aria-hidden="true" />
      <p class="section-kicker">{{ experienceCopy.invitationNoteKicker }}</p>
      <h2 id="invitation-note-title">{{ experienceCopy.invitationNoteTitle }}</h2>
      <div class="secret-message invitation-note-message"><p>{{ secretMessage }}</p></div>
    </section>

    <section
      v-else-if="!isVoting"
      class="moment-section secret-section"
      aria-labelledby="secret-title"
    >
      <div class="gift-icon"><Gift class="h-7 w-7" aria-hidden="true" /></div>
      <p class="section-kicker">{{ experienceCopy.oneLastThing }}</p>
      <h2 id="secret-title">{{ experienceCopy.secretTitle }}</h2>

      <Transition name="secret-swap" mode="out-in">
        <div
          v-if="isSecretOpen"
          key="revealed"
          class="secret-message"
          role="status"
        >
          <Sparkles class="mx-auto h-6 w-6" aria-hidden="true" />
          <p>{{ secretMessage }}</p>
        </div>
        <button
          v-else
          key="closed"
          type="button"
          class="secret-button"
          :class="{ 'is-holding': isHolding }"
          @pointerdown.prevent="startHold"
          @pointerup="cancelHold"
          @pointerleave="cancelHold"
          @pointercancel="cancelHold"
          @keydown.enter.prevent="revealSecret"
          @keydown.space.prevent="startHold"
          @keyup.space.prevent="cancelHold"
        >
          <span class="secret-progress" aria-hidden="true" />
          <span class="relative z-10">{{ experienceCopy.holdOpen }}</span>
        </button>
      </Transition>
      <p v-if="!isSecretOpen" class="hold-hint">
        {{ experienceCopy.holdHint }}
      </p>
    </section>

    <footer class="moment-footer">
      <Heart class="h-4 w-4 fill-current" aria-hidden="true" />
      {{ experienceCopy.footer }}
    </footer>
  </article>
</template>

<style scoped>
.moment-experience {
  --moment-bg: #fff8f8;
  --moment-surface: rgba(255, 255, 255, 0.76);
  --moment-ink: #4c1427;
  --moment-muted: #8b5265;
  --moment-accent: #e84d76;
  --moment-accent-soft: #ffd4df;
  --moment-border: rgba(156, 45, 78, 0.15);
  --moment-shadow: rgba(92, 20, 47, 0.16);
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 15% 10%,
      var(--moment-accent-soft),
      transparent 27rem
    ),
    var(--moment-bg);
  color: var(--moment-ink);
  font-family: Georgia, "Times New Roman", serif;
}
.moment-experience.is-khmer {
  font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif;
}
.moment-experience.is-khmer
  :where(h1, h2, p, span, strong, figcaption, button) {
  font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif;
}
.moment-experience.is-khmer .occasion-pill,
.moment-experience.is-khmer .moment-footer {
  font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif;
}
.moment-experience.is-khmer .occasion-pill,
.moment-experience.is-khmer .eyebrow,
.moment-experience.is-khmer .section-kicker,
.moment-experience.is-khmer .memory-photo figcaption {
  letter-spacing: 0;
  text-transform: none;
}
.moment-experience.is-khmer .moment-hero h1,
.moment-experience.is-khmer .moment-section h2 {
  line-height: 1.45;
  letter-spacing: 0;
}
.moment-experience.is-khmer .personal-message,
.moment-experience.is-khmer .secret-message p {
  line-height: 1.85;
}

.moment-theme-cute {
  --moment-bg: #fff9f1;
  --moment-surface: rgba(255, 255, 255, 0.8);
  --moment-ink: #542347;
  --moment-muted: #8c5a7e;
  --moment-accent: #a86ee6;
  --moment-accent-soft: #ffe1e9;
  --moment-border: rgba(139, 92, 196, 0.16);
  --moment-shadow: rgba(113, 64, 142, 0.16);
}

.moment-theme-celebration {
  --moment-bg: #fffaf1; --moment-surface: rgba(255, 255, 255, .86);
  --moment-ink: #3b1d5d; --moment-muted: #725786; --moment-accent: #7c3aed;
  --moment-accent-soft: #fde68a; --moment-border: rgba(124, 58, 237, .18);
  --moment-shadow: rgba(91, 33, 182, .16);
}
.moment-theme-sunset {
  --moment-bg: #fff7ed; --moment-surface: rgba(255, 252, 247, .82);
  --moment-ink: #5f2118; --moment-muted: #9a5344; --moment-accent: #e94f64;
  --moment-accent-soft: #fed7aa; --moment-border: rgba(194, 65, 12, .17);
  --moment-shadow: rgba(154, 52, 18, .15);
}
.moment-theme-botanical {
  --moment-bg: #f4f7ef; --moment-surface: rgba(252, 253, 248, .84);
  --moment-ink: #244436; --moment-muted: #63766b; --moment-accent: #527b5c;
  --moment-accent-soft: #d9e5cf; --moment-border: rgba(55, 91, 67, .17);
  --moment-shadow: rgba(42, 74, 53, .14);
}
.moment-theme-ocean {
  --moment-bg: #ecfeff; --moment-surface: rgba(248, 254, 255, .82);
  --moment-ink: #164e63; --moment-muted: #527b89; --moment-accent: #0284c7;
  --moment-accent-soft: #bae6fd; --moment-border: rgba(2, 132, 199, .17);
  --moment-shadow: rgba(8, 99, 132, .15);
}

.moment-theme-minimal {
  --moment-bg: #f7f6f2;
  --moment-surface: rgba(255, 255, 255, 0.84);
  --moment-ink: #1c1c1c;
  --moment-muted: #696969;
  --moment-accent: #292929;
  --moment-accent-soft: #e6e2d9;
  --moment-border: rgba(28, 28, 28, 0.14);
  --moment-shadow: rgba(28, 28, 28, 0.12);
}

.moment-theme-elegant {
  --moment-bg: #10141d;
  --moment-surface: rgba(25, 31, 43, 0.84);
  --moment-ink: #fff8e9;
  --moment-muted: #c8bda8;
  --moment-accent: #d5b36b;
  --moment-accent-soft: #343122;
  --moment-border: rgba(218, 188, 123, 0.22);
  --moment-shadow: rgba(0, 0, 0, 0.35);
}

.moment-glow {
  position: absolute;
  z-index: -1;
  width: 22rem;
  height: 22rem;
  border-radius: 999px;
  background: var(--moment-accent-soft);
  filter: blur(70px);
  opacity: 0.55;
}
.moment-glow-one {
  right: -10rem;
  top: 34rem;
}
.moment-glow-two {
  bottom: 20rem;
  left: -12rem;
}
.moment-hero {
  margin: 0 auto;
  max-width: 920px;
  padding: 5rem 1.25rem 3rem;
  text-align: center;
}
.occasion-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--moment-border);
  border-radius: 999px;
  background: var(--moment-surface);
  padding: 0.55rem 0.9rem;
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  backdrop-filter: blur(12px);
}
.eyebrow,
.section-kicker {
  color: var(--moment-accent);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.eyebrow {
  margin-top: 2.5rem;
}
.personal-invitation-eyebrow { margin: 1.25rem auto -.25rem; color: var(--moment-accent); font-family: ui-sans-serif, system-ui, sans-serif; font-size: .78rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.moment-experience.is-khmer .personal-invitation-eyebrow { letter-spacing: 0; text-transform: none; }
.moment-hero h1 {
  margin: 1rem auto 0;
  max-width: 760px;
  font-size: clamp(2.55rem, 8vw, 5.8rem) !important;
  font-weight: 500 !important;
  line-height: 0.98;
  letter-spacing: -0.055em;
}
.scroll-note {
  margin-top: 1.4rem;
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.82rem;
}
.hero-photo-wrap {
  position: relative;
  margin: 3.5rem auto 0;
  width: min(100%, 720px);
  transform: rotate(-1.2deg);
}
.hero-photo {
  aspect-ratio: 4 / 3;
  width: 100%;
  border: 0.8rem solid var(--moment-surface);
  border-radius: 1.2rem;
  object-fit: cover;
  box-shadow: 0 2rem 5rem var(--moment-shadow);
}
.photo-tape {
  position: absolute;
  top: -0.7rem;
  width: 5rem;
  height: 1.4rem;
  background: color-mix(in srgb, var(--moment-accent-soft) 82%, white);
  opacity: 0.82;
}
.photo-tape-left {
  left: 9%;
  transform: rotate(-7deg);
}
.photo-tape-right {
  right: 9%;
  transform: rotate(7deg);
}
.hero-placeholder {
  display: flex;
  margin: 3.5rem auto 0;
  aspect-ratio: 4/3;
  max-width: 720px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  border: 2px dashed var(--moment-border);
  border-radius: 1.5rem;
  background: var(--moment-surface);
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.moment-section {
  margin: 0 auto;
  max-width: 960px;
  padding: 5rem 1.25rem;
  text-align: center;
}
.message-section {
  max-width: 780px;
}
.section-icon {
  margin: 0 auto 1rem;
  height: 1.5rem;
  width: 1.5rem;
  color: var(--moment-accent);
}
.personal-message {
  margin-top: 1.5rem;
  white-space: pre-line;
  font-size: clamp(1.5rem, 4vw, 2.45rem);
  line-height: 1.5;
}
.event-section h2 { max-width: 48rem; margin-inline: auto; }
.event-host { margin-top: .75rem; color: var(--moment-muted); font-family: ui-sans-serif, system-ui, sans-serif; font-size: .9rem; font-weight: 700; }
.event-actions { display: flex; justify-content: center; margin-top: 1.5rem; }
.event-actions a,
.event-detail-card a { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border-radius: 999px; background: var(--moment-accent); padding: .75rem 1rem; color: white; font-family: ui-sans-serif, system-ui, sans-serif; font-size: .8rem; font-weight: 800; }
.event-detail-grid { display: grid; margin-top: 2rem; gap: 1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.event-detail-grid.is-single { grid-template-columns: minmax(0, 1fr); }
.event-detail-card,
.schedule-card { border: 1px solid var(--moment-border); border-radius: 1.5rem; background: var(--moment-surface); padding: 1.5rem; box-shadow: 0 1rem 3rem var(--moment-shadow); backdrop-filter: blur(12px); }
.event-detail-card { display: flex; flex-direction: column; align-items: center; gap: .7rem; }
.event-detail-card > svg { color: var(--moment-accent); }
.event-detail-card span { font-size: 1.25rem; font-weight: 700; }
.event-detail-card p { color: var(--moment-muted); white-space: pre-line; }
.schedule-card { margin-top: 1rem; }
.map-frame { margin-top: 1rem; overflow: hidden; border: 1px solid var(--moment-border); border-radius: 1.5rem; background: var(--moment-surface); box-shadow: 0 1rem 3rem var(--moment-shadow); }
.map-frame iframe { display: block; width: 100%; height: clamp(15rem, 36vw, 21rem); border: 0; }
.invitation-note-message { margin-top: 1.5rem; }
.schedule-card strong { color: var(--moment-accent); }
.schedule-card p { margin-top: 1rem; white-space: pre-line; line-height: 1.9; }
.rsvp-section { max-width: 760px; }
.rsvp-form { margin-top: 2rem; }
.rsvp-choices { display: grid; gap: .75rem; grid-template-columns: repeat(3, minmax(0, 1fr)); font-family: ui-sans-serif, system-ui, sans-serif; }
.rsvp-choices label { cursor: pointer; border: 1px solid var(--moment-border); border-radius: 1rem; background: var(--moment-surface); padding: 1rem .7rem; font-size: .82rem; font-weight: 800; transition: .18s ease; }
.rsvp-choices label.selected { border-color: var(--moment-accent); background: var(--moment-accent); color: white; transform: translateY(-2px); }
.rsvp-choices input { position: absolute; opacity: 0; pointer-events: none; }
.rsvp-fields { display: grid; margin-top: 1rem; gap: .75rem; border: 1px solid var(--moment-border); border-radius: 1.5rem; background: var(--moment-surface); padding: 1rem; text-align: left; }
.rsvp-fields input,
.rsvp-fields textarea { width: 100%; border: 1px solid var(--moment-border); border-radius: .8rem; background: color-mix(in srgb, var(--moment-bg) 78%, transparent); padding: .85rem; color: var(--moment-ink); font-family: ui-sans-serif, system-ui, sans-serif; }
.rsvp-fields label { color: var(--moment-muted); font-family: ui-sans-serif, system-ui, sans-serif; font-size: .78rem; font-weight: 700; }
.rsvp-fields label input { margin-top: .4rem; }
.rsvp-fields button { border-radius: .85rem; background: var(--moment-accent); padding: .9rem 1rem; color: white; font-family: ui-sans-serif, system-ui, sans-serif; font-weight: 800; }
.rsvp-fields button:disabled { cursor: wait; opacity: .6; }
.rsvp-status,
.rsvp-success,
.rsvp-error { margin-top: 1rem; color: var(--moment-muted); font-family: ui-sans-serif, system-ui, sans-serif; font-size: .85rem; }
.rsvp-success { color: #15803d; }
.rsvp-error { color: #dc2626; }
.poll-section { max-width: 760px; }
.poll-form { display: grid; margin-top: 1.5rem; gap: .8rem; font-family: ui-sans-serif, system-ui, sans-serif; }
.poll-option { position: relative; display: block; overflow: hidden; cursor: pointer; border: 1px solid var(--moment-border); border-radius: 1rem; background: var(--moment-surface); padding: 1rem; text-align: left; }
.poll-option.selected { border-color: var(--moment-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--moment-accent) 22%, transparent); }
.poll-option input { position: absolute; opacity: 0; }
.poll-option i { position: absolute; inset: 0 auto 0 0; z-index: 0; background: color-mix(in srgb, var(--moment-accent) 13%, transparent); transition: width .3s ease; }
.poll-option-copy { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.poll-option-copy small { color: var(--moment-muted); }
.poll-voters { position: relative; z-index: 1; display: block; margin-top: .55rem; color: var(--moment-muted); font-size: .78rem; line-height: 1.6; }
.poll-name { width: 100%; border: 1px solid var(--moment-border); border-radius: .85rem; background: var(--moment-surface); padding: .9rem 1rem; color: var(--moment-ink); }
.poll-form > button { border-radius: .85rem; background: var(--moment-accent); padding: .95rem 1rem; color: white; font-weight: 800; }
.poll-form > button:disabled { cursor: not-allowed; opacity: .55; }
.poll-form.is-preview .poll-option { cursor: default; }
.moment-section h2 {
  margin-top: 0.75rem;
  font-size: clamp(2rem, 5vw, 3.2rem);
}
.photo-grid {
  display: grid;
  margin-top: 3rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}
.photo-grid.is-single { margin-inline: auto; max-width: 620px; grid-template-columns: minmax(0, 1fr); }
.memory-photo {
  border: 0.65rem solid var(--moment-surface);
  border-bottom-width: 2.4rem;
  border-radius: 0.65rem;
  background: var(--moment-surface);
  box-shadow: 0 1rem 2.6rem var(--moment-shadow);
  transform: rotate(-1.5deg);
}
.memory-photo.photo-1,
.memory-photo.photo-4 {
  transform: translateY(1rem) rotate(1.7deg);
}
.memory-photo.photo-2 {
  transform: rotate(0.8deg);
}
.memory-photo img {
  aspect-ratio: 1 / 1;
  width: 100%;
  object-fit: cover;
}
.memory-photo figcaption {
  height: 0;
  transform: translateY(0.55rem);
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.counter-section {
  margin: 3rem auto;
  max-width: 760px;
  padding: 6rem 1.25rem;
  text-align: center;
}
.counter-value {
  margin-top: 0.7rem;
  color: var(--moment-accent);
  font-size: clamp(5rem, 20vw, 10rem);
  line-height: 0.9;
  letter-spacing: -0.08em;
}
.counter-unit {
  margin-top: 0.5rem;
  font-size: 1.4rem;
}
.counter-label {
  margin-top: 1rem;
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.secret-section {
  padding-bottom: 7rem;
}
.gift-icon {
  display: flex;
  margin: 0 auto 1.5rem;
  height: 3.5rem;
  width: 3.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: var(--moment-accent);
  color: white;
  box-shadow: 0 0.8rem 2rem var(--moment-shadow);
  transform: rotate(-5deg);
}
.secret-button {
  position: relative;
  margin-top: 2.25rem;
  min-width: min(100%, 19rem);
  overflow: hidden;
  border: 1px solid var(--moment-accent);
  border-radius: 999px;
  background: transparent;
  padding: 1rem 1.5rem;
  color: var(--moment-accent);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  touch-action: none;
}
.secret-progress {
  position: absolute;
  inset: 0;
  width: 0;
  background: var(--moment-accent);
}
.secret-button.is-holding {
  color: white;
}
.secret-button.is-holding .secret-progress {
  animation: hold-fill 1.8s linear forwards;
}
.hold-hint {
  margin-top: 0.8rem;
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.75rem;
}
.secret-message {
  margin: 2.25rem auto 0;
  max-width: 620px;
  border: 1px solid var(--moment-border);
  border-radius: 1.5rem;
  background: var(--moment-surface);
  padding: 2rem;
  color: var(--moment-accent);
  box-shadow: 0 1rem 3rem var(--moment-shadow);
}
.secret-message p {
  margin-top: 1rem;
  white-space: pre-line;
  color: var(--moment-ink);
  font-size: clamp(1.35rem, 4vw, 2rem);
  line-height: 1.5;
}

/* Themes change composition as well as color while sharing content and actions. */
.moment-theme-cute .moment-hero { max-width: 780px; }
.moment-theme-cute .hero-photo-wrap,
.moment-theme-cute .hero-photo,
.moment-theme-cute .hero-placeholder {
  aspect-ratio: 1;
  max-width: 34rem;
  border-radius: 42% 58% 46% 54% / 52% 42% 58% 48%;
}
.moment-theme-cute .message-section,
.moment-theme-cute .secret-section {
  margin-block: 2rem;
  border: 1px solid var(--moment-border);
  border-radius: 3rem;
  background: var(--moment-surface);
  padding-inline: clamp(1.5rem, 6vw, 4rem);
  box-shadow: 0 1rem 3rem var(--moment-shadow);
}
.moment-theme-cute .memory-photo { border-radius: 2rem; transform: none; }
.moment-theme-cute .memory-photo img { border-radius: 1.25rem; }

.moment-theme-celebration .moment-hero h1 {
  max-width: 900px;
  font-family: ui-rounded, "Arial Rounded MT Bold", ui-sans-serif, system-ui, sans-serif;
  font-weight: 800 !important;
  line-height: .92;
}
.moment-theme-celebration .hero-photo,
.moment-theme-celebration .hero-placeholder { aspect-ratio: 16 / 9; border-radius: .5rem; }
.moment-theme-celebration .photo-tape { display: none; }
.moment-theme-celebration .message-section {
  max-width: 960px;
  border-block: 3px solid var(--moment-accent);
}
.moment-theme-celebration .memory-photo:nth-child(3n) { transform: rotate(2deg); }
.moment-theme-celebration .counter-section {
  border-radius: 2rem;
  background: var(--moment-accent);
  color: white;
  transform: rotate(-1deg);
}
.moment-theme-celebration .counter-section :where(.section-kicker, .counter-value, .counter-label) { color: white; }

.moment-theme-botanical .hero-photo-wrap,
.moment-theme-botanical .hero-photo,
.moment-theme-botanical .hero-placeholder {
  aspect-ratio: 3 / 4;
  max-width: 33rem;
  border-radius: 48% 48% 1.5rem 1.5rem;
}
.moment-theme-botanical .message-section {
  max-width: 840px;
  border-left: .35rem solid var(--moment-accent);
  padding-left: clamp(1.5rem, 6vw, 4rem);
  text-align: left;
}
.moment-theme-botanical .message-section .section-icon,
.moment-theme-botanical .message-section .mx-auto { margin-left: 0; }
.moment-theme-botanical .moment-section { border-radius: 2rem; }
.moment-theme-botanical .memory-photo {
  border: 0;
  border-radius: 45% 45% 1rem 1rem;
  box-shadow: none;
  transform: none;
}
.moment-theme-botanical .memory-photo:nth-child(even) img { aspect-ratio: 4 / 5; }

.moment-theme-ocean .moment-hero {
  display: flex;
  max-width: none;
  flex-direction: column;
  padding: 0 0 4rem;
}
.moment-theme-ocean .hero-photo-wrap,
.moment-theme-ocean .hero-placeholder {
  order: -1;
  margin: 0 0 3.5rem;
  width: 100%;
  max-width: none;
  transform: none;
}
.moment-theme-ocean .hero-photo,
.moment-theme-ocean .hero-placeholder {
  aspect-ratio: 16 / 8;
  border: 0;
  border-radius: 0 0 3rem 3rem;
}
.moment-theme-ocean .photo-tape { display: none; }
.moment-theme-ocean .moment-hero > :not(.hero-photo-wrap, .hero-placeholder) {
  margin-inline: auto;
  max-width: min(90%, 760px);
}
.moment-theme-ocean .photo-grid { gap: .35rem; }
.moment-theme-ocean .memory-photo { border: 0; border-radius: .25rem; transform: none; }
.moment-theme-ocean .memory-photo figcaption { display: none; }

.moment-theme-minimal .moment-glow,
.moment-theme-minimal .photo-tape,
.moment-theme-minimal .section-icon { display: none; }
.moment-theme-minimal .moment-hero,
.moment-theme-minimal .moment-section { max-width: 1100px; text-align: left; }
.moment-theme-minimal .moment-hero h1 {
  margin-left: 0;
  max-width: 900px;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(2.5rem, 7vw, 5rem) !important;
  font-weight: 700 !important;
  letter-spacing: -.04em;
}
.moment-theme-minimal .hero-photo-wrap { width: 100%; max-width: none; transform: none; }
.moment-theme-minimal .hero-photo,
.moment-theme-minimal .hero-placeholder { aspect-ratio: 16 / 9; border-width: 1px; border-radius: 0; }
.moment-theme-minimal .memory-photo {
  border-width: 0;
  border-radius: 0;
  box-shadow: none;
  transform: none;
}
.moment-theme-minimal .memory-photo figcaption { text-align: left; }

.moment-theme-elegant .moment-hero h1 { max-width: 680px; letter-spacing: .02em; }
.moment-theme-elegant .hero-photo-wrap { max-width: 580px; transform: none; }
.moment-theme-elegant .hero-photo,
.moment-theme-elegant .hero-placeholder {
  aspect-ratio: 4 / 5;
  border: 1px solid var(--moment-accent);
  border-radius: 0;
  padding: .6rem;
}
.moment-theme-elegant .photo-tape { display: none; }
.moment-theme-elegant .moment-section { border-top: 1px solid var(--moment-border); }
.moment-theme-elegant .photo-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2rem;
}
.moment-theme-elegant .memory-photo {
  border: 1px solid var(--moment-accent);
  border-radius: 0;
  padding: .5rem .5rem 2.5rem;
  transform: none;
}
.moment-theme-elegant .memory-photo figcaption {
  font-family: Georgia, "Times New Roman", serif;
  letter-spacing: .16em;
}

/* Occasion and category define the story atmosphere; theme remains its skin. */
.occasion-atmosphere {
  position: absolute;
  z-index: 4;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.occasion-atmosphere :where(i, span) { position: absolute; display: none; will-change: transform; }
.moment-category-celebrations .occasion-atmosphere i,
.moment-category-surprises .occasion-atmosphere i {
  display: block;
  top: -2rem;
  left: calc((var(--particle-index) * 8%) - 4%);
  width: .5rem;
  height: 1rem;
  border-radius: .15rem;
  background: hsl(calc(var(--particle-index) * 31deg) 78% 58%);
  animation: occasion-confetti-fall calc(5s + var(--particle-index) * .22s) linear infinite;
  animation-delay: calc(var(--particle-index) * -.55s);
}
.moment-occasion-birthday .occasion-atmosphere span,
.moment-occasion-surprise .occasion-atmosphere span,
.moment-occasion-graduation .occasion-atmosphere span,
.moment-occasion-holiday .occasion-atmosphere span,
.moment-category-love-and-family .occasion-atmosphere span,
.moment-category-memories .occasion-atmosphere span {
  display: block;
  left: calc((var(--symbol-index) * 17%) - 5%);
  animation: occasion-symbol-drift calc(10s + var(--symbol-index) * 1s) ease-in-out infinite;
  animation-delay: calc(var(--symbol-index) * -1.7s);
  font-size: clamp(1.4rem, 4vw, 2.5rem);
  opacity: .45;
}
.moment-occasion-birthday .occasion-atmosphere span::before { content: "🎈"; }
.moment-occasion-surprise .occasion-atmosphere span::before { content: "🎁"; }
.moment-occasion-graduation .occasion-atmosphere span::before { content: "🎓"; }
.moment-occasion-holiday .occasion-atmosphere span::before { content: "❄"; }
.moment-occasion-anniversary .occasion-atmosphere span::before,
.moment-occasion-love .occasion-atmosphere span::before,
.moment-occasion-wedding .occasion-atmosphere span::before { content: "♡"; color: var(--moment-accent); }
.moment-occasion-baby .occasion-atmosphere span::before { content: "◌"; color: var(--moment-accent); }
.moment-occasion-mothers-day .occasion-atmosphere span::before { content: "🌸"; }
.moment-occasion-fathers-day .occasion-atmosphere span::before,
.moment-occasion-friendship .occasion-atmosphere span::before { content: "✦"; color: var(--moment-accent); }
.moment-occasion-farewell .occasion-atmosphere span::before { content: "🍂"; }

.moment-category-celebrations .moment-hero h1::after {
  display: block;
  margin-top: 1rem;
  color: var(--moment-accent);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: .85rem;
  font-weight: 800;
  letter-spacing: .35em;
  content: "✦  ✦  ✦";
}
.moment-category-love-and-family .message-section {
  max-width: 860px;
  border-radius: 3rem;
  background: color-mix(in srgb, var(--moment-surface) 72%, transparent);
}
.moment-category-memories .message-section { border-block: 1px solid var(--moment-border); }
.moment-category-surprises .secret-section {
  margin-block: 3rem;
  border: 2px dashed var(--moment-accent);
  border-radius: 2rem;
  background: var(--moment-surface);
  box-shadow: 0 1.5rem 4rem var(--moment-shadow);
}
.moment-category-surprises .gift-icon { height: 5rem; width: 5rem; transform: rotate(-8deg); }
.moment-category-surprises .secret-button { border-radius: 1rem; background: var(--moment-accent); color: white; }
.moment-occasion-invitation .moment-hero { padding-bottom: 1rem; }
.moment-occasion-invitation .event-section {
  margin-block: 3rem;
  border: 1px solid var(--moment-border);
  border-radius: 2rem;
  background: var(--moment-surface);
  box-shadow: 0 1.5rem 4rem var(--moment-shadow);
}
.moment-occasion-invitation .occasion-atmosphere span {
  display: block;
  left: calc((var(--symbol-index) * 17%) - 5%);
  color: var(--moment-accent);
  font-size: 1.5rem;
  opacity: .25;
  animation: occasion-symbol-drift calc(14s + var(--symbol-index) * 1s) ease-in-out infinite;
}
.moment-occasion-invitation .occasion-atmosphere span::before { content: "✦"; }
.moment-occasion-farewell .counter-section { display: none; }
.moment-occasion-farewell .secret-section .gift-icon { transform: none; border-radius: 999px; }

@keyframes occasion-confetti-fall {
  from { transform: translate3d(0, -3rem, 0) rotate(0); }
  to { transform: translate3d(4rem, 105vh, 0) rotate(720deg); }
}
@keyframes occasion-symbol-drift {
  0% { top: 10%; transform: translate3d(-1rem, 0, 0) rotate(-8deg); }
  50% { transform: translate3d(2rem, 35vh, 0) rotate(8deg); }
  100% { top: 85%; transform: translate3d(-1rem, 0, 0) rotate(-8deg); }
}
.moment-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-top: 1px solid var(--moment-border);
  padding: 1.5rem;
  color: var(--moment-muted);
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.75rem;
}
.secret-swap-enter-active,
.secret-swap-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.secret-swap-enter-from,
.secret-swap-leave-to {
  opacity: 0;
  transform: translateY(0.5rem) scale(0.98);
}
@keyframes hold-fill {
  to {
    width: 100%;
  }
}
@media (max-width: 699px) {
  .event-detail-grid,
  .rsvp-choices { grid-template-columns: 1fr; }
}
@media (min-width: 700px) {
  .photo-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.5rem;
  }
  .moment-hero {
    padding-top: 7rem;
  }
  .moment-theme-sunset .moment-hero {
    display: grid;
    max-width: 1120px;
    grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr);
    align-items: center;
    gap: 1rem 4rem;
    text-align: left;
  }
  .moment-theme-sunset .moment-hero :where(.occasion-pill, .eyebrow, .personal-invitation-eyebrow, h1, .scroll-note) {
    grid-column: 1;
    margin-left: 0;
    justify-self: start;
  }
  .moment-theme-sunset .hero-photo-wrap,
  .moment-theme-sunset .hero-placeholder {
    grid-column: 2;
    grid-row: 1 / 6;
    margin-top: 0;
    transform: rotate(2deg);
  }
  .moment-theme-sunset .hero-photo,
  .moment-theme-sunset .hero-placeholder { aspect-ratio: 3 / 4; }
  .moment-theme-celebration .memory-photo:first-child { grid-column: span 2; }
  .moment-theme-celebration .memory-photo:first-child img { aspect-ratio: 2 / 1; }
  .moment-category-memories .photo-grid {
    grid-template-columns: minmax(0, 1fr);
    margin-inline: auto;
    max-width: 720px;
  }
  .moment-category-memories .memory-photo:nth-child(even) { margin-left: 18%; }
  .moment-category-memories .memory-photo:nth-child(odd) { margin-right: 18%; }
}
@media (prefers-reduced-motion: reduce) {
  .secret-button.is-holding .secret-progress {
    animation-duration: 0s;
  }
  .occasion-atmosphere :where(i, span) {
    animation: none;
    opacity: .12;
  }
}
</style>
