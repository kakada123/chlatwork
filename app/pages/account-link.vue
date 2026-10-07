<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  Check,
  GripVertical,
  Link2,
  Plus,
  Trash2,
  Upload,
} from "lucide-vue-next";
import draggable from "vuedraggable";
import LinkProfileCard from "~/components/link/LinkProfileCard.vue";
import LinkPlatformIcon from "~/components/link/LinkPlatformIcon.vue";
import LinkShare from "~/components/link/LinkShare.vue";
import {
  createLinkProfile,
  getLinkEditingOrder,
  LINK_THEMES,
  profileSaveBody,
  reorderEnabledProfileLinks,
} from "~/lib/link-profile";
import { getAuthErrorMessage } from "~/composables/useAuth";
import { prepareMomentImage } from "~/lib/moment-image";
import type { LinkProfile, ProfileLink } from "~/types/link-profile";

// A standalone explicit route avoids nesting the existing account page around this editor.
definePageMeta({
  path: "/account/link/:section?",
  middleware: "auth",
  // Keep the same editor instance when changing sections so unsaved edits and the preview survive.
  key: "account-link-editor",
  validate: (route) =>
    !route.params.section ||
    ["profile", "links", "appearance", "share", "analytics"].includes(
      String(route.params.section),
    ),
});
useSeoMeta({
  title: "Your page | ChlatWork Link",
  robots: "noindex, nofollow",
});
const route = useRoute();
const { user } = useAuth();
const tabs = [
  { id: "profile", label: "Profile" },
  { id: "links", label: "Links" },
  { id: "appearance", label: "Appearance" },
  { id: "share", label: "Share" },
  { id: "analytics", label: "Analytics" },
];
const section = computed(() => String(route.params.section || "profile"));
if (!tabs.some((tab) => tab.id === section.value))
  throw createError({
    statusCode: 404,
    statusMessage: "Editor section not found.",
  });
const { data: initial, error: loadError } = await useFetch<LinkProfile | null>(
  "/api/profiles/me",
);
const saved = ref<LinkProfile | null>(
  initial.value ? structuredClone(toRaw(initial.value)) : null,
);
const draft = ref<LinkProfile>(
  initial.value
    ? structuredClone(toRaw(initial.value))
    : createLinkProfile(user.value?.name || ""),
);
type EditorLink = ProfileLink & { editorKey: string };
const editorLinks = ref<EditorLink[]>([]);
const newestLinkKeys = ref<string[]>([]);
const editingLinks = computed({
  get: () => getLinkEditingOrder(editorLinks.value, newestLinkKeys.value),
  set: (links: EditorLink[]) => {
    newestLinkKeys.value = [];
    editorLinks.value = links;
  },
});
let nextKey = 0;
function loadLinks(links: ProfileLink[]) {
  newestLinkKeys.value = [];
  editorLinks.value = links.map((link) => ({
    ...link,
    editorKey: String(++nextKey),
  }));
}
loadLinks(draft.value.links);
watch(
  editorLinks,
  (links) => {
    draft.value.links = links.map(({ editorKey: _key, ...link }) => link);
  },
  { deep: true },
);
const busy = ref(false);
const message = ref("");
const failure = ref(
  loadError.value ? getAuthErrorMessage(loadError.value) : "",
);
const avatarChanged = ref(false);
const backgroundChanged = ref(false);
const preview = computed(() => ({ ...draft.value, links: editorLinks.value }));
const savedUrl = computed(() =>
  saved.value?.slug ? `https://chlatwork.com/u/${saved.value.slug}` : "",
);
const totalClicks = computed(
  () =>
    saved.value?.links.reduce(
      (total, link) => total + (link.clickCount || 0),
      0,
    ) || 0,
);
const dirty = computed(
  () =>
    JSON.stringify(
      profileSaveBody(
        draft.value,
        avatarChanged.value,
        backgroundChanged.value,
      ),
    ) !==
    JSON.stringify(
      profileSaveBody(
        saved.value || createLinkProfile(user.value?.name || ""),
        avatarChanged.value,
        backgroundChanged.value,
      ),
    ),
);
const beforeUnload = (event: BeforeUnloadEvent) => {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = "";
  }
};
onMounted(() => window.addEventListener("beforeunload", beforeUnload));
onBeforeUnmount(() => window.removeEventListener("beforeunload", beforeUnload));
onBeforeRouteLeave((to) => {
  if (
    !to.path.startsWith("/account/link") &&
    dirty.value &&
    !window.confirm("Leave without saving your changes?")
  )
    return false;
});

async function save(publish?: boolean) {
  if (busy.value || loadError.value) return false;
  failure.value = "";
  message.value = "";
  if (!draft.value.slug.trim() || !draft.value.displayName.trim()) {
    failure.value = "Enter a username and display name in Profile.";
    return false;
  }
  const body = profileSaveBody(
    {
      ...draft.value,
      ...(publish === undefined ? {} : { isPublished: publish }),
    },
    avatarChanged.value,
    backgroundChanged.value,
  );
  busy.value = true;
  try {
    const response = await $fetch<LinkProfile>("/api/profiles/me", {
      method: "PATCH",
      body,
    });
    saved.value = structuredClone(response);
    draft.value = structuredClone(response);
    loadLinks(response.links);
    avatarChanged.value = false;
    backgroundChanged.value = false;
    message.value =
      publish === true
        ? "Your page is published and ready to share."
        : publish === false
          ? "Your page is unpublished."
          : "Changes saved.";
    return true;
  } catch (error) {
    failure.value = getAuthErrorMessage(error);
    return false;
  } finally {
    busy.value = false;
  }
}
async function addLink() {
  if (editorLinks.value.length >= 50) return;
  const editorKey = String(++nextKey);
  editorLinks.value.push({
    editorKey,
    title: "",
    url: "",
    isEnabled: true,
  });
  newestLinkKeys.value.unshift(editorKey);
  await nextTick();
  document.getElementById(`link-title-${editorKey}`)?.focus();
}
function removeLink(editorKey: string) {
  editorLinks.value = editorLinks.value.filter(
    (link) => link.editorKey !== editorKey,
  );
  newestLinkKeys.value = newestLinkKeys.value.filter((key) => key !== editorKey);
}
function moveLink(editorKey: string, direction: number) {
  const index = editorLinks.value.findIndex((link) => link.editorKey === editorKey);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= editorLinks.value.length) return;
  newestLinkKeys.value = [];
  const [link] = editorLinks.value.splice(index, 1);
  if (link) editorLinks.value.splice(target, 0, link);
}
function reorderPreview(links: ProfileLink[]) {
  if (busy.value || loadError.value) return;
  editorLinks.value = reorderEnabledProfileLinks(editorLinks.value, links);
  newestLinkKeys.value = [];
}
function chooseTheme(id: string) {
  draft.value.theme = id;
  draft.value.backgroundMode = "preset";
  draft.value.colorMode = "preset";
  draft.value.buttonStyle = id === "glass" ? "glass" : "solid";
  draft.value.font = id === "developer" ? "mono" : "sans";
}
async function upload(event: Event, kind: "avatar" | "background") {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || !saved.value || busy.value) return;
  busy.value = true;
  failure.value = "";
  message.value = "";
  try {
    const photo = await prepareMomentImage(file);
    if (photo.size > 5 * 1024 * 1024)
      throw new Error("Choose a photo of 5MB or smaller after compression.");
    const form = new FormData();
    form.append("file", photo);
    const result = await $fetch<LinkProfile>(`/api/profiles/me/media/${kind}`, {
      method: "POST",
      body: form,
    });
    const field = kind === "avatar" ? "avatarUrl" : "backgroundUrl";
    const flag = kind === "avatar" ? "hasAvatarUpload" : "hasBackgroundUpload";
    draft.value[field] = result[field];
    draft.value[flag] = true;
    saved.value[field] = result[field];
    saved.value[flag] = true;
    if (kind === "avatar") avatarChanged.value = false;
    else {
      backgroundChanged.value = false;
      draft.value.backgroundMode = "image";
    }
    message.value = "Photo uploaded. Save any other changes when you’re ready.";
  } catch (error) {
    failure.value = getAuthErrorMessage(error);
  } finally {
    busy.value = false;
  }
}
async function refreshAnalytics() {
  if (busy.value) return;
  busy.value = true;
  failure.value = "";
  try {
    saved.value = await $fetch<LinkProfile | null>("/api/profiles/me");
  } catch (error) {
    failure.value = getAuthErrorMessage(error);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="link-editor mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
    <NuxtLink
      to="/account"
      class="mb-6 hidden items-center gap-2 text-sm text-slate-500 dark:text-white/60 sm:inline-flex"
      ><ArrowLeft :size="16" /> Account</NuxtLink
    >
    <header class="mb-8 flex flex-wrap items-center justify-between gap-5">
      <div>
        <p
          class="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-sky-600 dark:text-cyan-300"
        >
          <Link2 :size="18" /> ChlatWork Link
        </p>
        <h1 class="text-3xl font-bold tracking-tight">
          Your corner of the internet.
        </h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-white/60">
          Choose your style. Add your links. Share anywhere.
        </p>
      </div>
      <span
        class="rounded-full px-3 py-1.5 text-xs font-semibold"
        :class="
          saved?.isPublished
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60'
        "
        >{{ saved?.isPublished ? "Published" : "Draft" }}</span
      >
    </header>
    <div
      v-if="failure"
      class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      role="alert"
    >
      {{ failure }}
      <button
        v-if="loadError"
        type="button"
        class="ml-2 underline"
        @click="reloadNuxtApp()"
      >
        Retry
      </button>
    </div>
    <p
      v-if="message"
      class="mb-5 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"
      role="status"
    >
      <Check :size="18" />{{ message }}
    </p>
    <div class="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section
        class="editor-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-7"
      >
        <nav
          class="mb-7 flex gap-1 overflow-x-auto border-b border-slate-100 pb-3 dark:border-white/10"
          aria-label="Profile editor sections"
        >
          <NuxtLink
            v-for="tab in tabs"
            :key="tab.id"
            :to="`/account/link/${tab.id}`"
            :aria-current="section === tab.id ? 'page' : undefined"
            class="whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold"
            :class="
              section === tab.id
                ? 'bg-sky-50 text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200'
                : 'text-slate-500 dark:text-white/60'
            "
            >{{ tab.label }}</NuxtLink
          >
        </nav>
        <fieldset :disabled="busy || !!loadError" class="min-w-0 space-y-6">
          <template v-if="section === 'profile'">
            <label
              >Username<input
                v-model="draft.slug"
                maxlength="40"
                placeholder="kakada"
                autocapitalize="none"
                spellcheck="false"
              /><small
                >chlatwork.com/u/{{ draft.slug || "your-name" }} · 3–40 letters,
                numbers, - or _</small
              ></label
            >
            <label
              >Display name<input
                v-model="draft.displayName"
                maxlength="100"
                placeholder="Ngen Kakada"
            /></label>
            <label
              >Headline<input
                v-model="draft.headline"
                maxlength="160"
                placeholder="Backend Developer"
            /></label>
            <label
              >Bio<textarea
                v-model="draft.bio"
                maxlength="320"
                rows="3"
                placeholder="Building useful stuff."
              /><small>{{ draft.bio.length }}/320</small></label
            >
            <div>
              <p class="field-label">Profile photo</p>
              <label class="upload-button"
                ><Upload :size="16" /> Upload photo<input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  :disabled="!saved"
                  @change="upload($event, 'avatar')" /></label
              ><small>{{
                saved
                  ? "Photos upload immediately, including on published pages."
                  : "Save your profile before uploading photos."
              }}</small>
            </div>
            <label
              >Or use an image URL<input
                :value="
                  draft.hasAvatarUpload && !avatarChanged
                    ? ''
                    : draft.avatarUrl || ''
                "
                type="url"
                placeholder="https://example.com/photo.jpg"
                @input="
                  draft.avatarUrl = ($event.target as HTMLInputElement).value;
                  avatarChanged = true;
                "
            /></label>
            <button
              v-if="draft.avatarUrl"
              type="button"
              class="text-sm text-red-600"
              @click="
                draft.avatarUrl = null;
                avatarChanged = true;
              "
            >
              Remove profile photo
            </button>
            <label
              >SEO title<input
                v-model="draft.seoTitle"
                maxlength="100"
                placeholder="Defaults to your display name"
            /></label>
            <label
              >SEO description<textarea
                v-model="draft.seoDescription"
                maxlength="200"
                rows="2"
                placeholder="Defaults to your bio or headline"
              />
            </label>
          </template>
          <template v-if="section === 'links'">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold">Your links</h2>
                <small>Drag the handle or use the arrows to reorder.</small>
                <small>
                  New links appear here first and on your shared page last.
                </small>
              </div>
              <button
                type="button"
                class="secondary-button"
                :disabled="editorLinks.length >= 50"
                @click="addLink"
              >
                <Plus :size="16" /> Add link
              </button>
            </div>
            <p
              v-if="!editorLinks.length"
              class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-white/20"
            >
              Add your first link. Websites, social profiles, email, and phone
              links are welcome.
            </p>
            <ClientOnly
              ><draggable
                v-model="editingLinks"
                item-key="editorKey"
                handle=".drag-handle"
                :animation="150"
                :disabled="busy"
                class="space-y-4"
              >
                <template #item="{ element }"
                  ><article
                    class="link-edit-row rounded-2xl border border-slate-200 p-4 dark:border-white/10"
                  >
                    <div class="mb-4 flex items-center gap-3">
                      <button
                        type="button"
                        class="drag-handle cursor-grab touch-none p-1 text-slate-400"
                        aria-label="Drag to reorder"
                      >
                        <GripVertical :size="20" /></button
                      ><LinkPlatformIcon
                        :url="element.url"
                        class="size-5"
                      /><span class="flex-1 text-xs text-slate-500"
                        >Link {{ editorLinks.indexOf(element) + 1 }}</span
                      ><label class="enabled-label"
                        ><input v-model="element.isEnabled" type="checkbox" />
                        Enabled</label
                      ><button
                        type="button"
                        class="p-2 text-red-500"
                        :aria-label="`Remove link ${editorLinks.indexOf(element) + 1}`"
                        @click="removeLink(element.editorKey)"
                      >
                        <Trash2 :size="16" />
                      </button>
                    </div>
                    <label
                      >Button title<input
                        v-model="element.title"
                        :id="`link-title-${element.editorKey}`"
                        maxlength="80"
                        placeholder="My Instagram" /></label
                    ><label class="mt-3"
                      >URL<input
                        v-model="element.url"
                        maxlength="2048"
                        placeholder="https://… · mailto:… · tel:…"
                        autocapitalize="none"
                        spellcheck="false"
                    /></label>
                    <div class="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        :disabled="editorLinks.indexOf(element) === 0"
                        class="reorder-button"
                        :aria-label="`Move link ${editorLinks.indexOf(element) + 1} up`"
                        @click="moveLink(element.editorKey, -1)"
                      >
                        <ArrowUp :size="15" /></button
                      ><button
                        type="button"
                        :disabled="
                          editorLinks.indexOf(element) === editorLinks.length - 1
                        "
                        class="reorder-button"
                        :aria-label="`Move link ${editorLinks.indexOf(element) + 1} down`"
                        @click="moveLink(element.editorKey, 1)"
                      >
                        <ArrowDown :size="15" />
                      </button>
                    </div></article
                ></template> </draggable
              ><template #fallback
                ><p class="text-sm text-slate-500">
                  Loading your links…
                </p></template
              ></ClientOnly
            >
            <small
              >{{ editorLinks.length }}/50 links. Changes appear publicly after
              saving.</small
            >
          </template>
          <template v-if="section === 'appearance'">
            <div>
              <h2 class="mb-4 text-lg font-semibold">Pick a starting point</h2>
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  v-for="theme in LINK_THEMES"
                  :key="theme.id"
                  type="button"
                  class="theme-choice"
                  :class="{ selected: draft.theme === theme.id }"
                  :aria-pressed="draft.theme === theme.id"
                  @click="chooseTheme(theme.id)"
                >
                  <span :style="{ background: theme.background }"
                    ><i
                      :style="{
                        background: theme.dark ? '#ffffff50' : '#ffffff',
                        borderRadius: '5px',
                      }" /></span
                  >{{ theme.name }}
                </button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <label
                >Background<select v-model="draft.backgroundMode">
                  <option value="preset">Theme preset</option>
                  <option value="solid">Solid color</option>
                  <option value="gradient">Gradient</option>
                  <option value="image">Photo</option>
                </select></label
              ><label
                >Color mode<select v-model="draft.colorMode">
                  <option value="preset">From theme</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select></label
              >
            </div>
            <div
              v-if="['solid', 'gradient'].includes(draft.backgroundMode)"
              class="grid grid-cols-2 gap-4"
            >
              <label
                >Background color<input
                  v-model="draft.backgroundColor"
                  type="color" /></label
              ><label v-if="draft.backgroundMode === 'gradient'"
                >Gradient color<input
                  v-model="draft.gradientColor"
                  type="color"
              /></label>
            </div>
            <template v-if="draft.backgroundMode === 'image'"
              ><div>
                <label class="upload-button"
                  ><Upload :size="16" /> Upload background<input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    :disabled="!saved"
                    @change="upload($event, 'background')" /></label
                ><small>{{
                  saved
                    ? "Photos upload immediately. Save to apply the photo background style."
                    : "Save your profile before uploading photos."
                }}</small>
              </div>
              <label
                >Or use a background URL<input
                  :value="
                    draft.hasBackgroundUpload && !backgroundChanged
                      ? ''
                      : draft.backgroundUrl || ''
                  "
                  type="url"
                  placeholder="https://example.com/background.jpg"
                  @input="
                    draft.backgroundUrl = (
                      $event.target as HTMLInputElement
                    ).value;
                    backgroundChanged = true;
                  " /></label
              ><button
                v-if="draft.backgroundUrl"
                type="button"
                class="text-sm text-red-600"
                @click="
                  draft.backgroundUrl = null;
                  backgroundChanged = true;
                "
              >
                Remove background photo
              </button></template
            >
            <div class="grid grid-cols-2 gap-4">
              <label
                >Font<select v-model="draft.font">
                  <option value="sans">Modern</option>
                  <option value="serif">Editorial</option>
                  <option value="mono">Monospace</option>
                </select></label
              ><label
                >Card radius<select v-model="draft.radius">
                  <option value="rounded">Rounded</option>
                  <option value="pill">Pill</option>
                  <option value="square">Square</option>
                </select></label
              >
            </div>
            <label
              >Button style<select v-model="draft.buttonStyle">
                <option value="solid">Solid</option>
                <option value="outline">Outline</option>
                <option value="glass">Glass / blur</option>
              </select></label
            >
            <label class="enabled-label"
              ><input v-model="draft.showBranding" type="checkbox" /> Show “Made
              with ChlatWork”</label
            >
          </template>
          <template v-if="section === 'share'"
            ><h2 class="text-lg font-semibold">Share your page</h2>
            <p v-if="dirty" class="text-sm text-amber-700 dark:text-amber-300">
              Save your changes before sharing. This URL points to your last
              published page.
            </p>
            <LinkShare
              :url="savedUrl"
              :title="saved?.displayName || 'ChlatWork Link'"
              :published="!!saved?.isPublished"
          /></template>
          <template v-if="section === 'analytics'"
            ><div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Page activity</h2>
              <button
                type="button"
                class="secondary-button"
                @click="refreshAnalytics"
              >
                Refresh
              </button>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="stat">
                <small>Profile views</small
                ><strong>{{ (saved?.viewCount || 0).toLocaleString() }}</strong>
              </div>
              <div class="stat">
                <small>Link clicks</small
                ><strong>{{ totalClicks.toLocaleString() }}</strong>
              </div>
            </div>
            <p class="text-xs text-slate-500 dark:text-white/60">
              Aggregate counts since creation, including repeat visits. Deleted
              links are removed from click totals. No visitor identities are
              stored.
            </p>
            <div
              v-for="link in saved?.links || []"
              :key="link.id"
              class="flex items-center gap-3 border-b border-slate-100 py-3 dark:border-white/10"
            >
              <LinkPlatformIcon :url="link.url" class="size-5 shrink-0" /><span
                class="min-w-0 flex-1 break-words text-sm"
                >{{ link.title
                }}<small v-if="!link.isEnabled">Disabled</small></span
              ><strong class="text-sm">{{
                (link.clickCount || 0).toLocaleString()
              }}</strong>
            </div></template
          >
        </fieldset>
        <div
          class="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5 dark:border-white/10"
        >
          <button
            type="button"
            class="primary-button"
            :disabled="busy || !!loadError"
            @click="save()"
          >
            {{
              busy
                ? "Saving…"
                : saved?.isPublished
                  ? "Save changes"
                  : "Save draft"
            }}</button
          ><button
            v-if="!saved?.isPublished"
            type="button"
            class="secondary-button"
            :disabled="busy || !!loadError"
            @click="save(true)"
          >
            Publish page</button
          ><button
            v-else
            type="button"
            class="text-sm text-slate-500 underline dark:text-white/60"
            :disabled="busy || !!loadError"
            @click="save(false)"
          >
            Unpublish</button
          ><span v-if="dirty" class="text-xs text-amber-600 dark:text-amber-300"
            >Unsaved changes</span
          >
        </div>
      </section>
      <aside
        class="mx-auto w-full max-w-[360px] lg:sticky lg:top-6"
        aria-label="Live mobile preview"
      >
        <p
          class="mb-4 text-center text-xs font-semibold uppercase tracking-[.16em] text-slate-400"
        >
          Live mobile preview
        </p>
        <div
          class="overflow-hidden rounded-[38px] border-[8px] border-slate-900 shadow-2xl"
        >
          <LinkProfileCard
            :profile="preview"
            preview
            sortable
            :disabled="busy || !!loadError"
            @reorder="reorderPreview"
          />
        </div>
        <p class="mt-4 text-center text-xs text-slate-500 dark:text-white/60">
          Drag preview links or use Alt + ↑/↓ to reorder. Save to update your
          shared page.
        </p>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.editor-panel label:not(.enabled-label):not(.upload-button) {
  display: grid;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}
.editor-panel input:not([type="checkbox"]):not([type="file"]),
.editor-panel textarea,
.editor-panel select {
  width: 100%;
  border: 1px solid #94a3b850;
  border-radius: 12px;
  padding: 11px 13px;
  background: transparent;
  color: inherit;
  font-size: 14px;
  font-weight: 400;
}
.editor-panel select option {
  background: #fff;
  color: #0f172a;
}
.editor-panel input[type="color"] {
  height: 44px;
  padding: 4px;
}
.editor-panel input:focus,
.editor-panel textarea:focus,
.editor-panel select:focus {
  outline: 2px solid #38bdf8;
  outline-offset: 2px;
}
small {
  display: block;
  font-size: 11px;
  color: #64748b;
  font-weight: 400;
  line-height: 1.6;
}
:global(.dark) small {
  color: #94a3b8;
}
.primary-button,
.secondary-button,
.upload-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 12px;
  padding: 11px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.primary-button {
  background: #0284c7;
  color: #fff;
}
.secondary-button,
.upload-button {
  border: 1px solid #94a3b850;
}
.upload-button {
  position: relative;
  overflow: hidden;
  margin-bottom: 8px;
}
.upload-button input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
}
.upload-button:focus-within {
  outline: 2px solid #38bdf8;
  outline-offset: 2px;
}
.field-label {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
}
.enabled-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
}
.enabled-label input {
  accent-color: #0284c7;
  width: 16px;
  height: 16px;
}
.theme-choice {
  padding: 7px;
  border: 2px solid transparent;
  border-radius: 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
}
.theme-choice.selected {
  border-color: #38bdf8;
}
.theme-choice span {
  display: grid;
  place-items: center;
  height: 64px;
  border-radius: 8px;
  margin-bottom: 7px;
}
.theme-choice i {
  height: 8px;
  width: 50%;
  box-shadow:
    0 12px 0 #ffffff80,
    0 -12px 0 #ffffff80;
}
.reorder-button {
  padding: 5px;
  border: 1px solid #94a3b850;
  border-radius: 6px;
}
.stat {
  border: 1px solid #94a3b850;
  border-radius: 16px;
  padding: 20px;
}
.stat strong {
  display: block;
  font-size: 28px;
  margin-top: 6px;
}
button:disabled,
input:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
