<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  Eye,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-vue-next";
import MomentExperience from "~/components/moments/MomentExperience.vue";
import MomentLanguageToggle from "~/components/moments/MomentLanguageToggle.vue";
import {
  getMomentDefaultStory,
  getMomentOccasionCopy,
  getMomentThemeCopy,
} from "~/data/moment-locales";
import { MOMENT_OCCASIONS, MOMENT_THEMES } from "~/data/moments";
import { prepareMomentImage } from "~/lib/moment-image";
import {
  MAX_MOMENT_PHOTOS,
  buildMomentTitle,
  buildPreviewMoment,
  getMomentFormError,
} from "~/lib/moments";
import type { MomentDraft } from "~/types/moment";

type SelectedPhoto = { id: string; file: File; url: string };
type PublishState = "idle" | "creating" | "uploading" | "publishing" | "done";

const { user, isReady, fetchMe } = useAuth();
const { locale, copy, isKhmer, localizeMomentPath } = useMomentLanguage();
const creatorCopy = computed(() => copy.value.creator);
const step = ref(1);
const titleTouched = ref(false);
const messageTouched = ref(false);
const secretTouched = ref(false);
const photos = ref<SelectedPhoto[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const photoError = ref("");
const formError = ref("");
const isPreparingPhotos = ref(false);
const publishState = ref<PublishState>("idle");
const uploadProgress = ref(0);
const showLogin = ref(false);
const publishedSlug = ref("");
const shareUrl = ref("");
const qrDataUrl = ref("");
const copied = ref(false);
const draft = reactive<MomentDraft>({
  recipientName: "",
  occasion: "BIRTHDAY",
  title: buildMomentTitle("", "BIRTHDAY", locale.value),
  message: getMomentDefaultStory("BIRTHDAY", locale.value, "").message,
  secretMessage: getMomentDefaultStory("BIRTHDAY", locale.value, "").secret,
  theme: "ROMANTIC",
  specialDate: "",
  publishAt: "",
  eventDate: "",
  venueName: "",
  eventAddress: "",
  mapUrl: "",
  dressCode: "",
  eventSchedule: "",
  hostName: "",
  pollQuestion: "",
  pollOptions: ["", ""],
  pollIdentityMode: "ANONYMOUS",
});
const visibleSteps = computed(() =>
  draft.occasion === "VOTING" ? [1, 3, 4] : [1, 2, 3, 4],
);
const progressStep = computed(() => visibleSteps.value.indexOf(step.value) + 1);

const suggestedTitle = computed(() =>
  buildMomentTitle(draft.recipientName, draft.occasion, locale.value),
);
watch(suggestedTitle, (title) => {
  if (!titleTouched.value) draft.title = title;
});
watch([locale, () => draft.occasion, () => draft.recipientName], ([nextLocale]) => {
  const defaults = getMomentDefaultStory(draft.occasion, nextLocale, draft.recipientName);
  if (!messageTouched.value) draft.message = defaults.message;
  if (!secretTouched.value) draft.secretMessage = defaults.secret;
  if (publishedSlug.value) void updateShareArtifacts(publishedSlug.value);
});

const localizedOccasions = computed(() =>
  MOMENT_OCCASIONS.map((occasion) => ({
    ...occasion,
    label:
      getMomentOccasionCopy(occasion.value, locale.value)?.label ??
      occasion.label,
  })),
);
const localizedThemes = computed(() =>
  MOMENT_THEMES.map((theme) => ({
    ...theme,
    ...(getMomentThemeCopy(theme.value, locale.value) ?? {}),
  })),
);

const previewMoment = computed(() =>
  buildPreviewMoment(
    draft,
    photos.value.map((photo) => photo.url),
  ),
);
const isPublishing = computed(
  () => publishState.value !== "idle" && publishState.value !== "done",
);
const progressLabel = computed(() => {
  if (publishState.value === "creating") return creatorCopy.value.creating;
  if (publishState.value === "uploading")
    return creatorCopy.value.uploading(
      uploadProgress.value,
      photos.value.length,
    );
  if (publishState.value === "publishing") return creatorCopy.value.wrapping;
  return creatorCopy.value.publish;
});
const minimumUnlockDate = computed(() => {
  const date = new Date(Date.now() + 5 * 60_000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
});

function nextStep() {
  formError.value = "";
  if (step.value === 1 && !draft.recipientName.trim()) {
    formError.value = draft.occasion === "INVITATION"
      ? creatorCopy.value.errors.eventName
      : draft.occasion === "VOTING"
        ? creatorCopy.value.errors.pollQuestion
        : creatorCopy.value.errors.recipient;
    return;
  }
  if (step.value === 1 && draft.occasion === "INVITATION" && !draft.hostName.trim()) {
    formError.value = creatorCopy.value.errors.hostName;
    return;
  }
  if (step.value === 2 && draft.occasion !== "VOTING" && photos.value.length < 1) {
    formError.value = creatorCopy.value.errors.photoRequired;
    return;
  }
  if (step.value === 3) {
    const error = getMomentFormError(
      draft,
      photos.value.length,
      locale.value,
    );
    if (error) {
      formError.value = error;
      return;
    }
  }
  step.value = draft.occasion === "VOTING" && step.value === 1
    ? 3
    : Math.min(4, step.value + 1);
  scrollToTop();
}

function previousStep() {
  formError.value = "";
  step.value = draft.occasion === "VOTING" && step.value === 3
    ? 1
    : Math.max(1, step.value - 1);
  scrollToTop();
}

function scrollToTop() {
  if (import.meta.client) window.scrollTo({ top: 0, behavior: "smooth" });
}

async function onPhotoPick(event: Event) {
  const input = event.target as HTMLInputElement;
  await addPhotos(Array.from(input.files ?? []));
  input.value = "";
}

async function onPhotoDrop(event: DragEvent) {
  await addPhotos(Array.from(event.dataTransfer?.files ?? []));
}

async function addPhotos(files: File[]) {
  photoError.value = "";
  const available = MAX_MOMENT_PHOTOS - photos.value.length;
  if (available <= 0) {
    photoError.value = creatorCopy.value.errors.photoLimit(MAX_MOMENT_PHOTOS);
    return;
  }
  const selected = files.slice(0, available);
  if (files.length > available)
    photoError.value = creatorCopy.value.errors.partialPhotos(available);
  isPreparingPhotos.value = true;
  for (const file of selected) {
    try {
      const prepared = await prepareMomentImage(file);
      photos.value.push({
        id: crypto.randomUUID(),
        file: prepared,
        url: URL.createObjectURL(prepared),
      });
    } catch (error) {
      photoError.value = getPhotoPreparationError(error);
    }
  }
  isPreparingPhotos.value = false;
}

function getPhotoPreparationError(error: unknown) {
  if (!(error instanceof Error)) return creatorCopy.value.errors.photoFailed;
  const errorCopy = creatorCopy.value.errors;
  const translations: Record<string, string> = {
    "Use a JPG, PNG, WebP, HEIC, or HEIF photo.": errorCopy.photoType,
    "Each original photo must be 20MB or smaller.": errorCopy.photoSourceSize,
    "This browser cannot prepare the photo.": errorCopy.photoBrowser,
    "This photo is still over 10MB after compression. Try a smaller image.":
      errorCopy.photoCompressedSize,
    "This photo could not be opened.": errorCopy.photoOpen,
    "This photo could not be compressed.": errorCopy.photoCompress,
    "This iPhone photo could not be converted. Try sharing it as JPEG.":
      errorCopy.photoHeic,
    "This browser cannot encode WebP photos. Update the browser and try again.":
      errorCopy.photoWebp,
  };
  return translations[error.message] ?? errorCopy.photoFailed;
}

function removePhoto(id: string) {
  const photo = photos.value.find((item) => item.id === id);
  if (photo) URL.revokeObjectURL(photo.url);
  photos.value = photos.value.filter((item) => item.id !== id);
}

function addPollOption() {
  if (draft.pollOptions.length < 10) draft.pollOptions.push("");
}

function removePollOption(index: number) {
  if (draft.pollOptions.length > 2) draft.pollOptions.splice(index, 1);
}

async function requestPublish() {
  formError.value = getMomentFormError(
    draft,
    photos.value.length,
    locale.value,
  );
  if (formError.value) return;
  if (!isReady.value) await fetchMe();
  if (!user.value) {
    showLogin.value = true;
    return;
  }
  await publishMoment();
}

async function continueAfterLogin() {
  await fetchMe();
  if (user.value) await publishMoment();
}

async function publishMoment() {
  if (isPublishing.value) return;
  formError.value = "";
  let momentId = "";
  try {
    publishState.value = "creating";
    const created = await $fetch<{ id: string; slug: string }>("/api/moments", {
      method: "POST",
      body: {
        recipientName: draft.recipientName,
        occasion: draft.occasion,
        title: draft.title,
        message: draft.message,
        secretMessage: draft.secretMessage,
        theme: draft.theme,
        specialDate:
          !["INVITATION", "VOTING"].includes(draft.occasion) && draft.specialDate
            ? draft.specialDate
            : undefined,
        publishAt: draft.publishAt
          ? new Date(draft.publishAt).toISOString()
          : undefined,
        eventDate: draft.occasion === "INVITATION" && draft.eventDate
          ? new Date(draft.eventDate).toISOString()
          : undefined,
        venueName: draft.occasion === "INVITATION" ? draft.venueName : undefined,
        eventAddress: draft.occasion === "INVITATION" ? draft.eventAddress : undefined,
        mapUrl: draft.occasion === "INVITATION" && draft.mapUrl ? draft.mapUrl : undefined,
        dressCode: draft.occasion === "INVITATION" && draft.dressCode ? draft.dressCode : undefined,
        eventSchedule: draft.occasion === "INVITATION" && draft.eventSchedule ? draft.eventSchedule : undefined,
        hostName: draft.occasion === "INVITATION" ? draft.hostName : undefined,
        pollQuestion: draft.occasion === "VOTING" ? draft.recipientName : undefined,
        pollOptions: draft.occasion === "VOTING" ? draft.pollOptions : undefined,
        pollIdentityMode: draft.occasion === "VOTING" ? draft.pollIdentityMode : undefined,
      },
    });
    momentId = created.id;
    publishState.value = "uploading";
    for (const [index, photo] of (draft.occasion === "VOTING" ? [] : photos.value).entries()) {
      uploadProgress.value = index + 1;
      const body = new FormData();
      body.append("file", photo.file);
      await $fetch(`/api/moments/${created.id}/media`, {
        method: "POST",
        body,
      });
    }
    publishState.value = "publishing";
    const published = await $fetch<{ slug: string }>(
      `/api/moments/${created.id}/publish`,
      { method: "POST" },
    );
    publishedSlug.value = published.slug;
    await updateShareArtifacts(published.slug);
    publishState.value = "done";
    scrollToTop();
  } catch (error) {
    if (momentId)
      await $fetch(`/api/moments/${momentId}`, { method: "DELETE" }).catch(
        () => null,
      );
    publishState.value = "idle";
    formError.value = getRequestError(error);
  }
}

async function updateShareArtifacts(slug: string) {
  shareUrl.value = `${window.location.origin}${localizeMomentPath(`/m/${slug}`)}`;
  const QR = await import("qrcode");
  qrDataUrl.value = await QR.toDataURL(shareUrl.value, {
    width: 320,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    formError.value = creatorCopy.value.errors.copyFailed;
  }
}

async function shareMoment() {
  if (!navigator.share) {
    await copyLink();
    return;
  }
  await navigator
    .share({
      title: draft.title,
      text: creatorCopy.value.shareText,
      url: shareUrl.value,
    })
    .catch(() => null);
}

function downloadQr() {
  const anchor = document.createElement("a");
  anchor.href = qrDataUrl.value;
  anchor.download = `${publishedSlug.value}-qr.png`;
  anchor.click();
}

function getRequestError(error: unknown) {
  const fetchError = error as {
    data?: { message?: string | string[]; statusMessage?: string };
    response?: { _data?: { message?: string | string[]; statusMessage?: string } };
    statusMessage?: string;
    message?: string;
  };
  const message =
    fetchError.data?.message ??
    fetchError.data?.statusMessage ??
    fetchError.response?._data?.message ??
    fetchError.response?._data?.statusMessage ??
    fetchError.statusMessage ??
    fetchError.message;
  return Array.isArray(message)
    ? message.join(", ")
    : message || creatorCopy.value.errors.publishFailed;
}

onMounted(() => {
  void fetchMe();
});
onBeforeUnmount(() => {
  photos.value.forEach((photo) => URL.revokeObjectURL(photo.url));
});
</script>

<template>
  <div
    class="moments-creator"
    :class="{ 'is-khmer': isKhmer }"
    :lang="isKhmer ? 'km' : 'en'"
  >
    <div class="language-toolbar">
      <MomentLanguageToggle />
    </div>
    <section v-if="publishState === 'done'" class="success-card">
      <div class="success-icon">
        <Check class="h-8 w-8" aria-hidden="true" />
      </div>
      <p class="creator-eyebrow">{{ creatorCopy.readyEyebrow }}</p>
      <h1>{{ creatorCopy.readyTitle }}</h1>
      <p class="success-copy">{{ creatorCopy.readyCopy }}</p>
      <div class="share-panel">
        <img
          :src="qrDataUrl"
          :alt="creatorCopy.qrAlt"
          class="qr-image"
        />
        <div class="min-w-0 flex-1">
          <label for="moment-link" class="field-label">{{
            creatorCopy.shareLink
          }}</label>
          <input
            id="moment-link"
            :value="shareUrl"
            readonly
            class="field-input mt-2"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="primary-button" @click="copyLink">
              <Check v-if="copied" class="h-4 w-4" /><Copy
                v-else
                class="h-4 w-4"
              />{{ copied ? creatorCopy.copied : creatorCopy.copyLink }}
            </button>
            <button type="button" class="secondary-button" @click="shareMoment">
              <Share2 class="h-4 w-4" />{{ creatorCopy.share }}
            </button>
            <button type="button" class="secondary-button" @click="downloadQr">
              <Download class="h-4 w-4" />{{ creatorCopy.downloadQr }}
            </button>
          </div>
        </div>
      </div>
      <NuxtLink
        :to="localizeMomentPath(`/m/${publishedSlug}`)"
        class="preview-link"
        target="_blank"
        >{{ creatorCopy.openReceiver }} <ArrowRight class="h-4 w-4"
      /></NuxtLink>
      <span class="mx-2 text-rose-200" aria-hidden="true">·</span>
      <NuxtLink :to="localizeMomentPath('/moments')" class="preview-link"
        >{{ creatorCopy.manageMoments }}</NuxtLink
      >
    </section>

    <template v-else>
      <header class="creator-header">
        <p class="creator-eyebrow">
          <Sparkles class="h-4 w-4" aria-hidden="true" />
          {{ creatorCopy.eyebrow }}
        </p>
        <h1>{{ creatorCopy.title }}</h1>
        <p>{{ creatorCopy.description }}</p>
      </header>

      <ol
        class="stepper"
        :style="{ gridTemplateColumns: `repeat(${visibleSteps.length}, minmax(0, 1fr))` }"
        :aria-label="creatorCopy.progressLabel"
      >
        <li
          v-for="(item, index) in visibleSteps"
          :key="item"
          :class="{ active: step === item, complete: step > item }"
        >
          <span>{{ step > item ? "✓" : index + 1 }}</span>
          <small>{{ creatorCopy.steps[item - 1] }}</small>
        </li>
      </ol>

      <form
        class="creator-card"
        @submit.prevent="step < 4 ? nextStep() : requestPublish()"
      >
        <section v-if="step === 1" aria-labelledby="step-one-title">
          <p class="step-label">{{ creatorCopy.stepLabel(progressStep, visibleSteps.length) }}</p>
          <h2 id="step-one-title">{{ draft.occasion === 'INVITATION' ? creatorCopy.invitationPersonTitle : draft.occasion === 'VOTING' ? creatorCopy.votingPersonTitle : creatorCopy.personTitle }}</h2>
          <label for="recipient-name" class="field-label mt-6"
            >{{ draft.occasion === 'INVITATION' ? creatorCopy.eventName : draft.occasion === 'VOTING' ? creatorCopy.voteName : creatorCopy.recipientName }}</label
          >
          <input
            id="recipient-name"
            v-model="draft.recipientName"
            maxlength="80"
            required
            class="field-input mt-2"
            :placeholder="draft.occasion === 'INVITATION' ? creatorCopy.eventNamePlaceholder : draft.occasion === 'VOTING' ? creatorCopy.voteNamePlaceholder : creatorCopy.recipientPlaceholder"
            autocomplete="off"
          />
          <div v-if="draft.occasion === 'INVITATION'" class="mt-5">
            <label for="host-name" class="field-label">{{ creatorCopy.hostName }}</label>
            <input id="host-name" v-model="draft.hostName" maxlength="120" required class="field-input mt-2" :placeholder="creatorCopy.hostNamePlaceholder" autocomplete="organization" />
          </div>
          <fieldset class="mt-7">
            <legend class="field-label">{{ creatorCopy.chooseOccasion }}</legend>
            <div class="occasion-grid mt-3">
              <label
                v-for="occasion in localizedOccasions"
                :key="occasion.value"
                class="choice-card"
                :class="{ selected: draft.occasion === occasion.value }"
              >
                <input
                  v-model="draft.occasion"
                  type="radio"
                  :value="occasion.value"
                  class="sr-only"
                />
                <span class="choice-emoji" aria-hidden="true">{{
                  occasion.emoji
                }}</span>
                <span>{{ occasion.label }}</span>
              </label>
            </div>
          </fieldset>
        </section>

        <section v-else-if="step === 2" aria-labelledby="step-two-title">
          <p class="step-label">{{ creatorCopy.stepLabel(progressStep, visibleSteps.length) }}</p>
          <h2 id="step-two-title">{{ creatorCopy.photosTitle }}</h2>
          <p class="step-copy">{{ creatorCopy.photosDescription }}</p>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            multiple
            class="sr-only"
            @change="onPhotoPick"
          />
          <button
            type="button"
            class="drop-zone"
            :disabled="isPreparingPhotos || photos.length >= MAX_MOMENT_PHOTOS"
            @click="fileInput?.click()"
            @dragover.prevent
            @drop.prevent="onPhotoDrop"
          >
            <LoaderCircle
              v-if="isPreparingPhotos"
              class="h-8 w-8 animate-spin"
              aria-hidden="true"
            />
            <ImagePlus v-else class="h-8 w-8" aria-hidden="true" />
            <strong>{{
              isPreparingPhotos
                ? creatorCopy.preparingPhotos
                : creatorCopy.choosePhotos
            }}</strong>
            <span>{{
              creatorCopy.photosAdded(photos.length, MAX_MOMENT_PHOTOS)
            }}</span>
          </button>
          <p v-if="photoError" role="alert" class="error-message">
            {{ photoError }}
          </p>
          <div v-if="photos.length" class="selected-photos">
            <figure v-for="(photo, index) in photos" :key="photo.id">
              <img
                :src="photo.url"
                :alt="creatorCopy.selectedPhoto(index + 1)"
              />
              <button
                type="button"
                :aria-label="creatorCopy.removePhoto(index + 1)"
                @click="removePhoto(photo.id)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
              <figcaption>{{
                index === 0 ? creatorCopy.heroPhoto : index + 1
              }}</figcaption>
            </figure>
          </div>
        </section>

        <section v-else-if="step === 3" aria-labelledby="step-three-title">
          <p class="step-label">{{ creatorCopy.stepLabel(progressStep, visibleSteps.length) }}</p>
          <h2 id="step-three-title">{{ draft.occasion === 'VOTING' ? creatorCopy.pollTitle : creatorCopy.storyTitle }}</h2>
          <div class="mt-6 grid gap-5">
            <div v-if="draft.occasion !== 'VOTING'">
              <label for="moment-title" class="field-label">{{
                creatorCopy.titleLabel
              }}</label
              ><input
                id="moment-title"
                v-model="draft.title"
                maxlength="120"
                class="field-input mt-2"
                @input="titleTouched = true"
              />
            </div>
            <div v-if="draft.occasion !== 'VOTING'">
              <label for="moment-message" class="field-label">{{
                creatorCopy.messageLabel
              }}</label
              ><textarea
                id="moment-message"
                v-model="draft.message"
                maxlength="3000"
                rows="6"
                class="field-input mt-2 resize-y"
                @input="messageTouched = true"
              />
              <p class="character-count">{{ draft.message.length }} / 3000</p>
            </div>
            <fieldset v-if="draft.occasion === 'VOTING'" class="invitation-fields">
              <legend class="sr-only">{{ creatorCopy.pollTitle }}</legend>
              <div class="mt-3 grid gap-3">
                <span class="field-label">{{ creatorCopy.pollOptions }}</span>
                <div v-for="(_, index) in draft.pollOptions" :key="index" class="flex gap-2">
                  <input v-model="draft.pollOptions[index]" maxlength="120" required class="field-input" :placeholder="creatorCopy.pollOptionPlaceholder(index + 1)" />
                  <button v-if="draft.pollOptions.length > 2" type="button" class="secondary-button" :aria-label="creatorCopy.removePollOption" @click="removePollOption(index)"><Trash2 class="h-4 w-4" /></button>
                </div>
                <button v-if="draft.pollOptions.length < 10" type="button" class="secondary-button justify-self-start" @click="addPollOption">{{ creatorCopy.addPollOption }}</button>
              </div>
              <div class="mt-5">
                <span class="field-label">{{ creatorCopy.voterIdentity }}</span>
                <div class="mt-2 grid gap-3 sm:grid-cols-3">
                  <label class="choice-card" :class="{ selected: draft.pollIdentityMode === 'ANONYMOUS' }">
                    <input v-model="draft.pollIdentityMode" type="radio" value="ANONYMOUS" class="sr-only" />
                    <span>🙈</span><span><strong>{{ creatorCopy.anonymousVote }}</strong><small class="block">{{ creatorCopy.anonymousVoteHelp }}</small></span>
                  </label>
                  <label class="choice-card" :class="{ selected: draft.pollIdentityMode === 'NAME_REQUIRED' }">
                    <input v-model="draft.pollIdentityMode" type="radio" value="NAME_REQUIRED" class="sr-only" />
                    <span>👤</span><span><strong>{{ creatorCopy.namedVote }}</strong><small class="block">{{ creatorCopy.namedVoteHelp }}</small></span>
                  </label>
                  <label class="choice-card" :class="{ selected: draft.pollIdentityMode === 'LOGIN_REQUIRED' }">
                    <input v-model="draft.pollIdentityMode" type="radio" value="LOGIN_REQUIRED" class="sr-only" />
                    <span>🔐</span><span><strong>{{ creatorCopy.loginVote }}</strong><small class="block">{{ creatorCopy.loginVoteHelp }}</small></span>
                  </label>
                </div>
              </div>
            </fieldset>
            <div class="grid gap-5" :class="{ 'sm:grid-cols-2': !['INVITATION', 'VOTING'].includes(draft.occasion) }">
              <div v-if="!['INVITATION', 'VOTING'].includes(draft.occasion)">
                <label for="special-date" class="field-label"
                  >{{ creatorCopy.specialDate }}
                  <span>({{ creatorCopy.optional }})</span></label
                ><input
                  id="special-date"
                  v-model="draft.specialDate"
                  type="date"
                  class="field-input mt-2"
                />
                <p class="field-help">{{ creatorCopy.counterHelp }}</p>
              </div>
              <div>
                <label for="unlock-date" class="field-label"
                  >{{ creatorCopy.scheduledUnlock }}
                  <span>({{ creatorCopy.optional }})</span></label
                ><input
                  id="unlock-date"
                  v-model="draft.publishAt"
                  type="datetime-local"
                  :min="minimumUnlockDate"
                  class="field-input mt-2"
                />
                <p class="field-help">{{ creatorCopy.countdownHelp }}</p>
              </div>
            </div>
            <div v-if="draft.occasion !== 'VOTING'">
              <label for="secret-message" class="field-label">{{
                creatorCopy.secretLabel
              }}</label
              ><textarea
                id="secret-message"
                v-model="draft.secretMessage"
                maxlength="1500"
                rows="4"
                class="field-input mt-2 resize-y"
                @input="secretTouched = true"
              />
              <p class="field-help">{{ creatorCopy.secretHelp }}</p>
            </div>
            <fieldset v-if="draft.occasion === 'INVITATION'" class="invitation-fields">
              <legend class="field-label">{{ creatorCopy.invitationDetails }}</legend>
              <div class="mt-3 grid gap-5 sm:grid-cols-2">
                <div>
                  <label for="event-date" class="field-label">{{ creatorCopy.eventDate }}</label>
                  <input id="event-date" v-model="draft.eventDate" type="datetime-local" class="field-input mt-2" required />
                </div>
                <div>
                  <label for="venue-name" class="field-label">{{ creatorCopy.venueName }}</label>
                  <input id="venue-name" v-model="draft.venueName" maxlength="120" class="field-input mt-2" :placeholder="creatorCopy.venuePlaceholder" required />
                </div>
                <div class="sm:col-span-2">
                  <label for="event-address" class="field-label">{{ creatorCopy.eventAddress }}</label>
                  <input id="event-address" v-model="draft.eventAddress" maxlength="300" class="field-input mt-2" :placeholder="creatorCopy.addressPlaceholder" required />
                </div>
                <div>
                  <label for="map-url" class="field-label">{{ creatorCopy.mapUrl }} <span>({{ creatorCopy.optional }})</span></label>
                  <input id="map-url" v-model="draft.mapUrl" type="url" maxlength="500" class="field-input mt-2" placeholder="https://maps.google.com/…" />
                </div>
                <div>
                  <label for="dress-code" class="field-label">{{ creatorCopy.dressCode }} <span>({{ creatorCopy.optional }})</span></label>
                  <input id="dress-code" v-model="draft.dressCode" maxlength="120" class="field-input mt-2" :placeholder="creatorCopy.dressCodePlaceholder" />
                </div>
                <div class="sm:col-span-2">
                  <label for="event-schedule" class="field-label">{{ creatorCopy.eventSchedule }} <span>({{ creatorCopy.optional }})</span></label>
                  <textarea id="event-schedule" v-model="draft.eventSchedule" maxlength="1500" rows="4" class="field-input mt-2 resize-y" :placeholder="creatorCopy.schedulePlaceholder" />
                </div>
              </div>
            </fieldset>
          </div>
        </section>

        <section v-else aria-labelledby="step-four-title">
          <p class="step-label">{{ creatorCopy.stepLabel(progressStep, visibleSteps.length) }}</p>
          <h2 id="step-four-title">{{ creatorCopy.previewTitle }}</h2>
          <fieldset class="mt-6">
            <legend class="field-label">{{ creatorCopy.themeLabel }}</legend>
            <div class="theme-grid mt-3">
              <label
                v-for="theme in localizedThemes"
                :key="theme.value"
                class="theme-card"
                :class="{ selected: draft.theme === theme.value }"
              >
                <input
                  v-model="draft.theme"
                  type="radio"
                  :value="theme.value"
                  class="sr-only"
                />
                <span class="swatches"
                  ><i
                    v-for="swatch in theme.swatches"
                    :key="swatch"
                    :style="{ backgroundColor: swatch }"
                /></span>
                <strong>{{ theme.label }}</strong
                ><small>{{ theme.description }}</small>
              </label>
            </div>
          </fieldset>
          <div class="preview-heading">
            <div>
              <p class="field-label">
                <Eye class="inline h-4 w-4" />
                {{ creatorCopy.receiverPreview }}
              </p>
              <p>{{ creatorCopy.previewHelp }}</p>
            </div>
          </div>
          <div class="experience-preview">
            <MomentExperience
              :moment="previewMoment"
              :locale="locale"
              preview
            />
          </div>
          <div class="privacy-note">
            <LockKeyhole class="h-5 w-5" aria-hidden="true" />
            <div>
              <strong>{{ creatorCopy.privateTitle }}</strong>
              <p>{{ creatorCopy.privateCopy }}</p>
            </div>
          </div>
        </section>

        <p v-if="formError" role="alert" class="error-message mt-5">
          {{ formError }}
        </p>
        <footer class="form-actions">
          <button
            v-if="step > 1"
            type="button"
            class="secondary-button"
            :disabled="isPublishing"
            @click="previousStep"
          >
            <ArrowLeft class="h-4 w-4" />{{ creatorCopy.back }}
          </button>
          <span v-else />
          <button
            type="submit"
            class="primary-button"
            :disabled="isPublishing || isPreparingPhotos"
          >
            <LoaderCircle v-if="isPublishing" class="h-4 w-4 animate-spin" />
            <Sparkles v-else-if="step === 4" class="h-4 w-4" />
            {{ step === 4 ? progressLabel : creatorCopy.continue }}
            <ArrowRight v-if="step < 4" class="h-4 w-4" />
          </button>
        </footer>
      </form>
    </template>

    <AuthLoginDialog
      :open="showLogin"
      :locale="locale"
      @close="showLogin = false"
      @success="continueAfterLogin"
    />
  </div>
</template>

<style scoped>
.moments-creator {
  margin: 0 auto;
  max-width: 1040px;
  color: #172033;
}
.language-toolbar {
  display: flex;
  justify-content: flex-end;
}
.moments-creator.is-khmer {
  font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif;
}
.moments-creator.is-khmer .creator-header h1,
.moments-creator.is-khmer .success-card h1,
.moments-creator.is-khmer .creator-card h2 {
  font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0;
}
.moments-creator.is-khmer .creator-header h1,
.moments-creator.is-khmer .success-card h1 {
  line-height: 1.45;
}
.moments-creator.is-khmer .creator-card h2 {
  font-size: clamp(1.55rem, 3.2vw, 2rem);
  font-weight: 600 !important;
  line-height: 1.6;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}
.moments-creator.is-khmer .step-label {
  margin-bottom: 0.15rem;
  font-size: 0.75rem;
  letter-spacing: 0;
  line-height: 1.7;
  text-transform: none;
}
.moments-creator.is-khmer .creator-header > p:last-child,
.moments-creator.is-khmer .step-copy,
.moments-creator.is-khmer .field-help,
.moments-creator.is-khmer .success-copy {
  line-height: 1.85;
}
.moments-creator.is-khmer .step-copy {
  margin-top: 0.9rem;
}
.creator-header {
  margin: 2.5rem auto 0;
  max-width: 850px;
  text-align: center;
}
.creator-eyebrow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #dc4f76;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.creator-header h1,
.success-card h1 {
  margin-top: 0.8rem;
  font-family: Georgia, serif;
  font-size: clamp(2.4rem, 7vw, 4.8rem) !important;
  font-weight: 500 !important;
  line-height: 1;
  letter-spacing: -0.05em;
}
.creator-header > p:last-child {
  margin: 1.25rem auto 0;
  max-width: 650px;
  color: #657087;
  line-height: 1.7;
}
.stepper {
  display: grid;
  margin: 2.5rem auto 1.25rem;
  max-width: 720px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.stepper li {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  color: #9aa2b1;
  font-size: 0.68rem;
  font-weight: 700;
}
.stepper li:not(:first-child)::before {
  position: absolute;
  right: 50%;
  top: 1rem;
  z-index: -1;
  width: 100%;
  height: 2px;
  background: #e6e8ed;
  content: "";
}
.stepper li.complete:not(:first-child)::before,
.stepper li.active:not(:first-child)::before {
  background: #f0a6ba;
}
.stepper span {
  display: grid;
  height: 2rem;
  width: 2rem;
  place-items: center;
  border: 2px solid #e6e8ed;
  border-radius: 999px;
  background: white;
}
.stepper .active,
.stepper .complete {
  color: #bd3159;
}
.stepper .active span,
.stepper .complete span {
  border-color: #dc4f76;
  background: #dc4f76;
  color: white;
}
.creator-card {
  border: 1px solid #e5e7eb;
  border-radius: 1.5rem;
  background: white;
  padding: clamp(1.25rem, 4vw, 2.5rem);
  box-shadow: 0 1.5rem 4rem rgba(31, 41, 55, 0.08);
}
.step-label {
  color: #dc4f76;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.creator-card h2 {
  margin-top: 0.5rem;
  font-size: clamp(1.65rem, 4vw, 2.4rem);
}
.step-copy {
  margin-top: 0.75rem;
  color: #657087;
  line-height: 1.6;
}
.field-label {
  display: block;
  color: #30394a;
  font-size: 0.8rem;
  font-weight: 800;
}
.field-label span {
  color: #8b93a2;
  font-weight: 500;
}
.field-input {
  width: 100%;
  border: 1px solid #d9dde5;
  border-radius: 0.85rem;
  background: #fff;
  padding: 0.78rem 0.9rem;
  color: #172033;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.field-input:focus {
  border-color: #dc4f76;
  box-shadow: 0 0 0 3px rgba(220, 79, 118, 0.13);
}
.field-help,
.character-count {
  margin-top: 0.4rem;
  color: #8b93a2;
  font-size: 0.72rem;
}
.character-count {
  text-align: right;
}
.occasion-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}
.invitation-fields {
  border: 1px solid rgb(251 113 133 / 0.28);
  border-radius: 1rem;
  background: rgb(255 241 242 / 0.45);
  padding: 1rem;
}
:global(html.dark) .invitation-fields {
  border-color: rgb(251 113 133 / 0.2);
  background: rgb(251 113 133 / 0.05);
}
.choice-card {
  display: flex;
  min-height: 4rem;
  cursor: pointer;
  align-items: center;
  gap: 0.7rem;
  border: 1px solid #e0e3e9;
  border-radius: 1rem;
  padding: 0.7rem 0.85rem;
  color: #4a5467;
  font-size: 0.83rem;
  font-weight: 700;
  transition: 0.15s ease;
}
.choice-card:hover,
.choice-card.selected {
  border-color: #e47b98;
  background: #fff3f6;
  color: #a72c50;
  box-shadow: 0 0 0 2px rgba(220, 79, 118, 0.08);
}
.choice-emoji {
  font-size: 1.35rem;
}
.drop-zone {
  display: flex;
  margin-top: 1.5rem;
  min-height: 12rem;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border: 2px dashed #e3a3b5;
  border-radius: 1.25rem;
  background: #fff8fa;
  color: #bd3159;
  transition: 0.15s ease;
}
.drop-zone:hover:not(:disabled) {
  border-color: #dc4f76;
  background: #fff1f5;
}
.drop-zone span {
  color: #8b6370;
  font-size: 0.75rem;
}
.selected-photos {
  display: grid;
  margin-top: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}
.selected-photos figure {
  position: relative;
  overflow: hidden;
  border-radius: 0.9rem;
  background: #f2f3f5;
}
.selected-photos img {
  aspect-ratio: 1;
  width: 100%;
  object-fit: cover;
}
.selected-photos button {
  position: absolute;
  right: 0.35rem;
  top: 0.35rem;
  display: grid;
  height: 2rem;
  width: 2rem;
  place-items: center;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.75);
  color: white;
}
.selected-photos figcaption {
  position: absolute;
  bottom: 0.35rem;
  left: 0.35rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  padding: 0.2rem 0.45rem;
  font-size: 0.62rem;
  font-weight: 800;
}
.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}
.theme-card {
  display: flex;
  cursor: pointer;
  flex-direction: column;
  border: 1px solid #e0e3e9;
  border-radius: 1rem;
  padding: 1rem;
  transition: 0.15s;
}
.theme-card:hover,
.theme-card.selected {
  border-color: #dc4f76;
  box-shadow: 0 0 0 2px rgba(220, 79, 118, 0.1);
}
.swatches {
  display: flex;
  margin-bottom: 0.8rem;
}
.swatches i {
  height: 1.7rem;
  width: 1.7rem;
  border: 2px solid white;
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
}
.swatches i + i {
  margin-left: -0.35rem;
}
.theme-card strong {
  font-size: 0.85rem;
}
.theme-card small {
  margin-top: 0.3rem;
  color: #7b8494;
  line-height: 1.4;
}
.preview-heading {
  display: flex;
  margin-top: 2rem;
  align-items: end;
  justify-content: space-between;
}
.preview-heading p:last-child {
  margin-top: 0.25rem;
  color: #7b8494;
  font-size: 0.75rem;
}
.experience-preview {
  margin-top: 0.8rem;
  max-height: 760px;
  overflow-y: auto;
  border: 0.65rem solid #1f2937;
  border-radius: 1.5rem;
  background: #1f2937;
  box-shadow: 0 1.5rem 4rem rgba(15, 23, 42, 0.18);
}
.privacy-note {
  display: flex;
  margin-top: 1.25rem;
  gap: 0.8rem;
  border: 1px solid #bee3f8;
  border-radius: 1rem;
  background: #f0f9ff;
  padding: 1rem;
  color: #075985;
}
.privacy-note svg {
  flex: none;
}
.privacy-note p {
  margin-top: 0.25rem;
  color: #36728f;
  font-size: 0.78rem;
  line-height: 1.5;
}
.form-actions {
  display: flex;
  margin-top: 2rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid #edf0f3;
  padding-top: 1.25rem;
}
.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 0.85rem;
  padding: 0.65rem 1rem;
  font-size: 0.82rem;
  font-weight: 800;
  transition: 0.15s;
}
.primary-button {
  background: #d9436c;
  color: white;
  box-shadow: 0 0.6rem 1.3rem rgba(217, 67, 108, 0.2);
}
.primary-button:hover:not(:disabled) {
  background: #bd3159;
  transform: translateY(-1px);
}
.secondary-button {
  border: 1px solid #d9dde5;
  background: white;
  color: #4a5467;
}
.secondary-button:hover:not(:disabled) {
  background: #f7f8fa;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.error-message {
  border-radius: 0.8rem;
  background: #fff1f2;
  padding: 0.75rem 0.9rem;
  color: #b4233f;
  font-size: 0.8rem;
  font-weight: 700;
}
.success-card {
  margin: 3rem auto;
  max-width: 820px;
  border: 1px solid #f0c2cf;
  border-radius: 2rem;
  background: linear-gradient(145deg, #fff, #fff6f8);
  padding: clamp(1.5rem, 6vw, 3.5rem);
  text-align: center;
  box-shadow: 0 2rem 5rem rgba(118, 39, 64, 0.12);
}
.success-icon {
  display: grid;
  margin: 0 auto 1.25rem;
  height: 4rem;
  width: 4rem;
  place-items: center;
  border-radius: 999px;
  background: #d9436c;
  color: white;
}
.success-copy {
  margin: 1rem auto 0;
  max-width: 580px;
  color: #687184;
  line-height: 1.6;
}
.share-panel {
  display: flex;
  margin-top: 2rem;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  border: 1px solid #eadde1;
  border-radius: 1.25rem;
  background: white;
  padding: 1.25rem;
  text-align: left;
}
.qr-image {
  width: 10rem;
  flex: none;
  border-radius: 0.75rem;
}
.preview-link {
  display: inline-flex;
  margin-top: 1.5rem;
  align-items: center;
  gap: 0.4rem;
  color: #bd3159;
  font-weight: 800;
}
@media (min-width: 640px) {
  .occasion-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .selected-photos {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
  .theme-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .share-panel {
    flex-direction: row;
  }
}
:global(html.dark .moments-creator) {
  color: #f5f5f7;
}
:global(html.dark .moments-creator .creator-header > p:last-child),
:global(html.dark .moments-creator .step-copy) {
  color: #b8bdc7;
}
:global(html.dark .moments-creator .stepper li:not(:first-child)::before) {
  background: #30343b;
}
:global(
  html.dark .moments-creator .stepper li.complete:not(:first-child)::before
),
:global(
  html.dark .moments-creator .stepper li.active:not(:first-child)::before
) {
  background: #d13a67;
}
:global(html.dark .moments-creator .stepper span) {
  border-color: #4b515c;
  background: #111318;
}
:global(html.dark .moments-creator .stepper .active),
:global(html.dark .moments-creator .stepper .complete) {
  color: #ff8aab;
}
:global(html.dark .moments-creator .stepper .active span),
:global(html.dark .moments-creator .stepper .complete span) {
  border-color: #d13a67;
  background: #d13a67;
  color: white;
}
:global(html.dark .moments-creator .creator-card) {
  border-color: rgba(255, 255, 255, 0.13);
  background: #0d0f12;
  box-shadow: none;
}
:global(html.dark .moments-creator .field-label) {
  color: #e8e9ed;
}
:global(html.dark .moments-creator .field-input) {
  border-color: rgba(255, 255, 255, 0.15);
  background: #070809;
  color: white;
}
:global(html.dark .moments-creator .field-input:focus) {
  border-color: #f08baa;
  box-shadow: 0 0 0 3px rgba(240, 139, 170, 0.2);
}
:global(html.dark .moments-creator .field-label span),
:global(html.dark .moments-creator .field-help),
:global(html.dark .moments-creator .character-count),
:global(html.dark .moments-creator .theme-card small),
:global(html.dark .moments-creator .preview-heading p:last-child) {
  color: #aeb4c0;
}
:global(html.dark .moments-creator .choice-card),
:global(html.dark .moments-creator .theme-card) {
  border-color: rgba(255, 255, 255, 0.14);
  background: #111318;
  color: #d7d9df;
}
:global(html.dark .moments-creator .choice-card:hover),
:global(html.dark .moments-creator .choice-card:focus-within),
:global(html.dark .moments-creator .choice-card.selected),
:global(html.dark .moments-creator .theme-card:hover),
:global(html.dark .moments-creator .theme-card:focus-within),
:global(html.dark .moments-creator .theme-card.selected) {
  border-color: #f08baa;
  background: rgba(220, 79, 118, 0.12);
  color: #ffabc2;
}
:global(html.dark .moments-creator .drop-zone) {
  border-color: rgba(240, 139, 170, 0.5);
  background: rgba(220, 79, 118, 0.08);
  color: #ff9fba;
}
:global(html.dark .moments-creator .drop-zone:hover:not(:disabled)),
:global(html.dark .moments-creator .drop-zone:focus-visible) {
  border-color: #f08baa;
  background: rgba(220, 79, 118, 0.14);
}
:global(html.dark .moments-creator .drop-zone span) {
  color: #cbb0b8;
}
:global(html.dark .moments-creator .selected-photos figcaption) {
  background: rgba(7, 8, 9, 0.82);
  color: white;
}
:global(html.dark .moments-creator .primary-button) {
  background: #d13a67;
}
:global(html.dark .moments-creator .primary-button:hover:not(:disabled)) {
  background: #bd3159;
}
:global(html.dark .moments-creator .secondary-button) {
  border-color: rgba(255, 255, 255, 0.15);
  background: #111318;
  color: white;
}
:global(html.dark .moments-creator .secondary-button:hover:not(:disabled)),
:global(html.dark .moments-creator .secondary-button:focus-visible) {
  border-color: #626975;
  background: #1c2027;
  color: white;
}
:global(html.dark .moments-creator .primary-button:focus-visible),
:global(html.dark .moments-creator .preview-link:focus-visible) {
  outline: 3px solid rgba(240, 139, 170, 0.48);
  outline-offset: 3px;
}
:global(html.dark .moments-creator .privacy-note) {
  border-color: rgba(103, 232, 249, 0.25);
  background: rgba(34, 211, 238, 0.08);
  color: #a5f3fc;
}
:global(html.dark .moments-creator .privacy-note p) {
  color: #a7cbd2;
}
:global(html.dark .moments-creator .form-actions) {
  border-color: rgba(255, 255, 255, 0.1);
}
:global(html.dark .moments-creator .error-message) {
  background: rgba(248, 113, 113, 0.12);
  color: #ffb4c0;
}
:global(html.dark .moments-creator .success-card) {
  border-color: rgba(240, 139, 170, 0.25);
  background: linear-gradient(145deg, #111318, #1b1116);
}
:global(html.dark .moments-creator .success-copy) {
  color: #c2c7d2;
}
:global(html.dark .moments-creator .share-panel) {
  border-color: rgba(255, 255, 255, 0.12);
  background: #090a0c;
}
:global(html.dark .moments-creator .preview-link) {
  color: #ff7fa4;
}
:global(html.dark .moments-creator .preview-link:hover) {
  color: #ffb0c6;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
</style>
