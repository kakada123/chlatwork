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
const step = ref(1);
const titleTouched = ref(false);
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
  title: buildMomentTitle("", "BIRTHDAY"),
  message:
    "You make ordinary days feel special. I hope this little page reminds you how loved and appreciated you are.",
  secretMessage:
    "Thank you for being part of my life. There are so many more memories I cannot wait to make with you. ❤️",
  theme: "ROMANTIC",
  specialDate: "",
  publishAt: "",
});

const suggestedTitle = computed(() =>
  buildMomentTitle(draft.recipientName, draft.occasion),
);
watch(suggestedTitle, (title) => {
  if (!titleTouched.value) draft.title = title;
});

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
  if (publishState.value === "creating") return "Creating your Moment…";
  if (publishState.value === "uploading")
    return `Uploading photo ${uploadProgress.value} of ${photos.value.length}…`;
  if (publishState.value === "publishing") return "Wrapping the surprise…";
  return "Publish Moment";
});
const minimumUnlockDate = computed(() => {
  const date = new Date(Date.now() + 5 * 60_000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
});

function nextStep() {
  formError.value = "";
  if (step.value === 1 && !draft.recipientName.trim()) {
    formError.value = "Tell us who this Moment is for.";
    return;
  }
  if (step.value === 2 && photos.value.length < 1) {
    formError.value = "Add at least one photo to continue.";
    return;
  }
  if (step.value === 3) {
    const error = getMomentFormError(draft, photos.value.length);
    if (error) {
      formError.value = error;
      return;
    }
  }
  step.value = Math.min(4, step.value + 1);
  scrollToTop();
}

function previousStep() {
  formError.value = "";
  step.value = Math.max(1, step.value - 1);
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
    photoError.value = `You can add up to ${MAX_MOMENT_PHOTOS} photos.`;
    return;
  }
  const selected = files.slice(0, available);
  if (files.length > available)
    photoError.value = `Only the first ${available} selected photos were added.`;
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
      photoError.value =
        error instanceof Error
          ? error.message
          : "A photo could not be prepared.";
    }
  }
  isPreparingPhotos.value = false;
}

function removePhoto(id: string) {
  const photo = photos.value.find((item) => item.id === id);
  if (photo) URL.revokeObjectURL(photo.url);
  photos.value = photos.value.filter((item) => item.id !== id);
}

async function requestPublish() {
  formError.value = getMomentFormError(draft, photos.value.length);
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
        specialDate: draft.specialDate || undefined,
        publishAt: draft.publishAt
          ? new Date(draft.publishAt).toISOString()
          : undefined,
      },
    });
    momentId = created.id;
    publishState.value = "uploading";
    for (const [index, photo] of photos.value.entries()) {
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
    shareUrl.value = `${window.location.origin}/m/${published.slug}`;
    const QR = await import("qrcode");
    qrDataUrl.value = await QR.toDataURL(shareUrl.value, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
    });
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

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    formError.value = "Could not copy the link. Select it manually.";
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
      text: "I made a ChlatWork Moment for you ❤️",
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
    statusMessage?: string;
    message?: string;
  };
  const message =
    fetchError.data?.message ??
    fetchError.data?.statusMessage ??
    fetchError.statusMessage ??
    fetchError.message;
  return Array.isArray(message)
    ? message.join(", ")
    : message || "Your Moment could not be published. Please try again.";
}

onMounted(() => {
  void fetchMe();
});
onBeforeUnmount(() => {
  photos.value.forEach((photo) => URL.revokeObjectURL(photo.url));
});
</script>

<template>
  <div class="moments-creator">
    <section v-if="publishState === 'done'" class="success-card">
      <div class="success-icon">
        <Check class="h-8 w-8" aria-hidden="true" />
      </div>
      <p class="creator-eyebrow">Ready to share</p>
      <h1>Your Moment is ready ❤️</h1>
      <p class="success-copy">
        Only people with this link can open it. ChlatWork keeps Moment pages out
        of search engines.
      </p>
      <div class="share-panel">
        <img
          :src="qrDataUrl"
          alt="QR code for the published Moment"
          class="qr-image"
        />
        <div class="min-w-0 flex-1">
          <label for="moment-link" class="field-label">Share link</label>
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
              />{{ copied ? "Copied" : "Copy link" }}
            </button>
            <button type="button" class="secondary-button" @click="shareMoment">
              <Share2 class="h-4 w-4" />Share
            </button>
            <button type="button" class="secondary-button" @click="downloadQr">
              <Download class="h-4 w-4" />Download QR
            </button>
          </div>
        </div>
      </div>
      <NuxtLink :to="`/m/${publishedSlug}`" class="preview-link" target="_blank"
        >Open the receiver experience <ArrowRight class="h-4 w-4"
      /></NuxtLink>
      <span class="mx-2 text-rose-200" aria-hidden="true">·</span>
      <NuxtLink to="/moments" class="preview-link"
        >Manage your Moments</NuxtLink
      >
    </section>

    <template v-else>
      <header class="creator-header">
        <p class="creator-eyebrow">
          <Sparkles class="h-4 w-4" aria-hidden="true" /> ChlatWork Moments
        </p>
        <h1>Create a little place on the internet for someone special.</h1>
        <p>
          Pick a few details and photos. ChlatWork turns them into a personal,
          interactive celebration—no page builder needed.
        </p>
      </header>

      <ol class="stepper" aria-label="Moment creation progress">
        <li
          v-for="item in 4"
          :key="item"
          :class="{ active: step === item, complete: step > item }"
        >
          <span>{{ step > item ? "✓" : item }}</span>
          <small>{{
            ["Person", "Photos", "Story", "Preview"][item - 1]
          }}</small>
        </li>
      </ol>

      <form
        class="creator-card"
        @submit.prevent="step < 4 ? nextStep() : requestPublish()"
      >
        <section v-if="step === 1" aria-labelledby="step-one-title">
          <p class="step-label">Step 1 of 4</p>
          <h2 id="step-one-title">Who are we celebrating?</h2>
          <label for="recipient-name" class="field-label mt-6"
            >Their name</label
          >
          <input
            id="recipient-name"
            v-model="draft.recipientName"
            maxlength="80"
            required
            class="field-input mt-2"
            placeholder="Neth"
            autocomplete="off"
          />
          <fieldset class="mt-7">
            <legend class="field-label">Choose an occasion</legend>
            <div class="occasion-grid mt-3">
              <label
                v-for="occasion in MOMENT_OCCASIONS"
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
          <p class="step-label">Step 2 of 4</p>
          <h2 id="step-two-title">Choose your favorite photos</h2>
          <p class="step-copy">
            Add 1–10 JPG, PNG, or WebP photos. We resize them and remove
            location/device metadata before upload.
          </p>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
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
              isPreparingPhotos ? "Preparing photos…" : "Choose or drop photos"
            }}</strong>
            <span>{{ photos.length }} / {{ MAX_MOMENT_PHOTOS }} added</span>
          </button>
          <p v-if="photoError" role="alert" class="error-message">
            {{ photoError }}
          </p>
          <div v-if="photos.length" class="selected-photos">
            <figure v-for="(photo, index) in photos" :key="photo.id">
              <img :src="photo.url" :alt="`Selected photo ${index + 1}`" />
              <button
                type="button"
                :aria-label="`Remove photo ${index + 1}`"
                @click="removePhoto(photo.id)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
              <figcaption>{{ index === 0 ? "Hero" : index + 1 }}</figcaption>
            </figure>
          </div>
        </section>

        <section v-else-if="step === 3" aria-labelledby="step-three-title">
          <p class="step-label">Step 3 of 4</p>
          <h2 id="step-three-title">Tell the story in your words</h2>
          <div class="mt-6 grid gap-5">
            <div>
              <label for="moment-title" class="field-label">Title</label
              ><input
                id="moment-title"
                v-model="draft.title"
                maxlength="120"
                class="field-input mt-2"
                @input="titleTouched = true"
              />
            </div>
            <div>
              <label for="moment-message" class="field-label"
                >Your message</label
              ><textarea
                id="moment-message"
                v-model="draft.message"
                maxlength="3000"
                rows="6"
                class="field-input mt-2 resize-y"
              />
              <p class="character-count">{{ draft.message.length }} / 3000</p>
            </div>
            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label for="special-date" class="field-label"
                  >Special date <span>(optional)</span></label
                ><input
                  id="special-date"
                  v-model="draft.specialDate"
                  type="date"
                  class="field-input mt-2"
                />
                <p class="field-help">Used for the day counter.</p>
              </div>
              <div>
                <label for="unlock-date" class="field-label"
                  >Scheduled unlock <span>(optional)</span></label
                ><input
                  id="unlock-date"
                  v-model="draft.publishAt"
                  type="datetime-local"
                  :min="minimumUnlockDate"
                  class="field-input mt-2"
                />
                <p class="field-help">Until then, they see a countdown.</p>
              </div>
            </div>
            <div>
              <label for="secret-message" class="field-label"
                >Secret surprise</label
              ><textarea
                id="secret-message"
                v-model="draft.secretMessage"
                maxlength="1500"
                rows="4"
                class="field-input mt-2 resize-y"
              />
              <p class="field-help">
                Revealed after they hold the gift button.
              </p>
            </div>
          </div>
        </section>

        <section v-else aria-labelledby="step-four-title">
          <p class="step-label">Step 4 of 4</p>
          <h2 id="step-four-title">Choose the feeling, then preview</h2>
          <fieldset class="mt-6">
            <legend class="field-label">Theme</legend>
            <div class="theme-grid mt-3">
              <label
                v-for="theme in MOMENT_THEMES"
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
                <Eye class="inline h-4 w-4" /> Receiver preview
              </p>
              <p>
                Scroll inside the preview to experience the complete Moment.
              </p>
            </div>
          </div>
          <div class="experience-preview">
            <MomentExperience :moment="previewMoment" preview />
          </div>
          <div class="privacy-note">
            <LockKeyhole class="h-5 w-5" aria-hidden="true" />
            <div>
              <strong>Private by default</strong>
              <p>
                The published page is unlisted, excluded from search engines,
                and accessible only to people with its link.
              </p>
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
            <ArrowLeft class="h-4 w-4" />Back
          </button>
          <span v-else />
          <button
            type="submit"
            class="primary-button"
            :disabled="isPublishing || isPreparingPhotos"
          >
            <LoaderCircle v-if="isPublishing" class="h-4 w-4 animate-spin" />
            <Sparkles v-else-if="step === 4" class="h-4 w-4" />
            {{ step === 4 ? progressLabel : "Continue" }}
            <ArrowRight v-if="step < 4" class="h-4 w-4" />
          </button>
        </footer>
      </form>
    </template>

    <AuthLoginDialog
      :open="showLogin"
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
:global(.dark) .moments-creator {
  color: #f5f5f7;
}
:global(.dark) .creator-header > p:last-child,
:global(.dark) .step-copy {
  color: #b8bdc7;
}
:global(.dark) .creator-card {
  border-color: rgba(255, 255, 255, 0.13);
  background: #0d0f12;
  box-shadow: none;
}
:global(.dark) .field-label {
  color: #e8e9ed;
}
:global(.dark) .field-input {
  border-color: rgba(255, 255, 255, 0.15);
  background: #070809;
  color: white;
}
:global(.dark) .choice-card,
:global(.dark) .theme-card {
  border-color: rgba(255, 255, 255, 0.14);
  color: #d7d9df;
}
:global(.dark) .choice-card.selected,
:global(.dark) .theme-card.selected {
  border-color: #f08baa;
  background: rgba(220, 79, 118, 0.12);
  color: #ffabc2;
}
:global(.dark) .drop-zone {
  border-color: rgba(240, 139, 170, 0.5);
  background: rgba(220, 79, 118, 0.08);
}
:global(.dark) .secondary-button {
  border-color: rgba(255, 255, 255, 0.15);
  background: #111318;
  color: white;
}
:global(.dark) .privacy-note {
  border-color: rgba(103, 232, 249, 0.25);
  background: rgba(34, 211, 238, 0.08);
  color: #a5f3fc;
}
:global(.dark) .privacy-note p {
  color: #a7cbd2;
}
:global(.dark) .form-actions {
  border-color: rgba(255, 255, 255, 0.1);
}
:global(.dark) .success-card {
  border-color: rgba(240, 139, 170, 0.25);
  background: linear-gradient(145deg, #111318, #1b1116);
}
:global(.dark) .share-panel {
  border-color: rgba(255, 255, 255, 0.12);
  background: #090a0c;
}
</style>
