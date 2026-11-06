<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useProductCopy } from "~/composables/useProductCopy";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  Check,
  GripVertical,
  Eye,
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
import { useLanguage } from "~/composables/useLanguage";

const { t } = useAppI18n();

const { productText } = useProductCopy();

const { isKhmer } = useLanguage();

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
  title: () => `${t("products.links.your_page")} | ChlatWork Link`,
  robots: "noindex, nofollow",
});
const route = useRoute();
const { destination } = useProductDomain();
const { product } = useProductDomain();
// Share only the view selection with navigation; keep the unsaved draft in this editor.
const mobilePreviewOpen = useState<boolean>("link:mobile-preview", () => false);
watch(() => route.fullPath, () => { mobilePreviewOpen.value = false; });
onBeforeUnmount(() => { mobilePreviewOpen.value = false; });
const { user } = useAuth();
const tabList = [
  { id: "profile", labelKey: "products.links.tabs.profile" },
  { id: "links", labelKey: "products.links.tabs.links" },
  { id: "appearance", labelKey: "products.links.tabs.appearance" },
  { id: "share", labelKey: "products.links.tabs.share" },
  { id: "analytics", labelKey: "products.links.tabs.analytics" },
];
const tabs = computed(() =>
  tabList.map((tab) => ({
    id: tab.id,
    label: t(tab.labelKey),
  })),
);
const section = computed(() => String(route.params.section || "profile"));
if (!tabList.some((tab) => tab.id === section.value))
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
  saved.value?.slug ? destination(`/u/${saved.value.slug}`) : "",
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
    !window.confirm(t("products.links.leave_without_saving_your_changes"))
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
  <main class="link-editor mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12" :class="{ 'link-editor-mobile': product === 'link' }">
    <NuxtLink
      to="/account"
      class="mb-6 hidden items-center gap-2 text-sm text-slate-500 dark:text-white/60 sm:inline-flex"
      ><ArrowLeft :size="16" /> {{ t("products.common.account") }}</NuxtLink
    >
    <header class="mb-8 flex flex-wrap items-center justify-between gap-5">
      <div>
        <p
          class="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-sky-600 dark:text-cyan-300"
        >
          <Link2 :size="18" /> ChlatWork Link
        </p>
        <h1 class="text-3xl font-bold tracking-tight">
          <span v-if="product === 'link'" class="sm:hidden">{{ t("products.links.your_page") }}</span><span :class="product === 'link' ? 'hidden sm:inline' : undefined">{{ t("products.links.your_corner_of_the_internet") }}</span>
        </h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-white/60">
          {{ t("products.links.choose_your_style_add_your_links_share_anywhere") }}
        </p>
      </div>
      <span
        class="rounded-full px-3 py-1.5 text-xs font-semibold"
        :class="
          saved?.isPublished
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60'
        "
        >{{ saved?.isPublished ? (t("products.links.published")) : (t("products.links.draft")) }}</span
      >
    </header>
    <div v-if="product === 'link'" class="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-white/5 sm:hidden" role="group" :aria-label="t(&quot;products.links.editor_view&quot;)">
      <button type="button" class="min-h-11 rounded-xl text-sm font-semibold" :class="!mobilePreviewOpen ? 'bg-white shadow-sm dark:bg-white/10' : 'text-slate-500'" :aria-pressed="!mobilePreviewOpen" aria-controls="link-editor-form" @click="mobilePreviewOpen = false">{{ t("products.links.edit_page") }}</button>
      <button type="button" class="flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold" :class="mobilePreviewOpen ? 'bg-white shadow-sm dark:bg-white/10' : 'text-slate-500'" :aria-pressed="mobilePreviewOpen" aria-controls="link-editor-preview" @click="mobilePreviewOpen = true"><Eye :size="16" aria-hidden="true" />{{ t("products.moments.birthday_wish_generator.preview") }}</button>
    </div>
    <div
      v-if="failure"
      class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      role="alert"
    >
      {{ productText(failure) }}
      <button
        v-if="loadError"
        type="button"
        class="ml-2 underline"
        @click="reloadNuxtApp()"
      >
        {{ t("products.links.retry") }}
      </button>
    </div>
    <p
      v-if="message"
      class="mb-5 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"
      role="status"
    >
      <Check :size="18" />{{ productText(message) }}
    </p>
    <div class="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section
        id="link-editor-form"
        class="editor-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-7"
        :class="{ 'mobile-editor-hidden': product === 'link' && mobilePreviewOpen }"
      >
        <nav
          class="mb-7 flex gap-1 overflow-x-auto border-b border-slate-100 pb-3 dark:border-white/10"
          :aria-label="t(&quot;products.common.profile_editor_sections&quot;)"
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
              >{{ t("products.links.username") }}<input
                v-model="draft.slug"
                maxlength="40"
                placeholder="kakada"
                autocapitalize="none"
                spellcheck="false"
              /><small
                >{{ destination(`/u/${draft.slug || 'your-name'}`).replace(/^https?:\/\//, '') }} {{ t("products.links.3_40_letters_numbers_or") }}</small
              ></label
            >
            <label
              >{{ t("products.links.display_name") }}<input
                v-model="draft.displayName"
                maxlength="100"
                placeholder="Ngen Kakada"
            /></label>
            <label
              >{{ t("products.links.headline") }}<input
                v-model="draft.headline"
                maxlength="160"
                :placeholder="t(&quot;products.links.backend_developer&quot;)"
            /></label>
            <label
              >{{ t("products.links.bio") }}<textarea
                v-model="draft.bio"
                maxlength="320"
                rows="3"
                :placeholder="t(&quot;products.common.building_useful_stuff&quot;)"
              /><small>{{ draft.bio.length }}/320</small></label
            >
            <div>
              <p class="field-label">{{ t("products.links.profile_photo") }}</p>
              <label class="upload-button"
                ><Upload :size="16" /> {{ t("products.links.upload_photo") }}<input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  :disabled="!saved"
                  @change="upload($event, 'avatar')" /></label
              ><small>{{
                saved
                  ? t("products.links.photos_upload_immediately_including_on_published_pages")
                  : t("products.links.save_your_profile_before_uploading_photos")
              }}</small>
            </div>
            <label
              >{{ t("products.links.or_use_an_image_url") }}<input
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
              {{ t("products.links.remove_profile_photo") }}
            </button>
            <label
              >{{ t("products.links.seo_title") }}<input
                v-model="draft.seoTitle"
                maxlength="100"
                :placeholder="t(&quot;products.common.defaults_to_your_display_name&quot;)"
            /></label>
            <label
              >{{ t("products.links.seo_description") }}<textarea
                v-model="draft.seoDescription"
                maxlength="200"
                rows="2"
                :placeholder="t(&quot;products.common.defaults_to_your_bio_or_headline&quot;)"
              />
            </label>
          </template>
          <template v-if="section === 'links'">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold">{{ t("products.links.your_links") }}</h2>
                <small>{{ t("products.links.drag_the_handle_or_use_the_arrows_to_reorder") }}</small>
                <small>
                  {{ t("products.links.new_links_appear_here_first_and_on_your_shared_page_last") }}
                </small>
              </div>
              <button
                type="button"
                class="secondary-button"
                :disabled="editorLinks.length >= 50"
                @click="addLink"
              >
                <Plus :size="16" /> {{ t("products.links.add_link") }}
              </button>
            </div>
            <p
              v-if="!editorLinks.length"
              class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-white/20"
            >
              {{ t("products.links.add_your_first_link_websites_social_profiles_email_and_phone_links_are_welcome") }}
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
                        :aria-label="t(&quot;products.common.drag_to_reorder&quot;)"
                      >
                        <GripVertical :size="20" /></button
                      ><LinkPlatformIcon
                        :url="element.url"
                        class="size-5"
                      /><span class="flex-1 text-xs text-slate-500"
                        >{{ t("products.links.link") }} {{ editorLinks.indexOf(element) + 1 }}</span
                      ><label class="enabled-label"
                        ><input v-model="element.isEnabled" type="checkbox" />
                        {{ t("products.links.enabled") }}</label
                      ><button
                        type="button"
                        class="p-2 text-red-500"
                        :aria-label="`${t(&quot;products.links.remove_link&quot;)} ${editorLinks.indexOf(element) + 1}`"
                        @click="removeLink(element.editorKey)"
                      >
                        <Trash2 :size="16" />
                      </button>
                    </div>
                    <label
                      >{{ t("products.links.button_title") }}<input
                        v-model="element.title"
                        :id="`link-title-${element.editorKey}`"
                        maxlength="80"
                        :placeholder="t(&quot;products.common.my_instagram&quot;)" /></label
                    ><label class="mt-3"
                      >{{ t("products.links.url") }}<input
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
                        :aria-label="`${t(&quot;products.links.move_link&quot;)} ${editorLinks.indexOf(element) + 1} ${t(&quot;products.common.up&quot;)}`"
                        @click="moveLink(element.editorKey, -1)"
                      >
                        <ArrowUp :size="15" /></button
                      ><button
                        type="button"
                        :disabled="
                          editorLinks.indexOf(element) === editorLinks.length - 1
                        "
                        class="reorder-button"
                        :aria-label="`${t(&quot;products.links.move_link&quot;)} ${editorLinks.indexOf(element) + 1} ${t(&quot;products.common.down&quot;)}`"
                        @click="moveLink(element.editorKey, 1)"
                      >
                        <ArrowDown :size="15" />
                      </button>
                    </div></article
                ></template> </draggable
              ><template #fallback
                ><p class="text-sm text-slate-500">
                  {{ t("products.links.loading_your_links") }}
                </p></template
              ></ClientOnly
            >
            <small
              >{{ editorLinks.length }}{{ t("products.links.50_links_changes_appear_publicly_after_saving") }}</small
            >
          </template>
          <template v-if="section === 'appearance'">
            <div>
              <h2 class="mb-4 text-lg font-semibold">{{ t("products.links.pick_a_starting_point") }}</h2>
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
                  >{{ productText(theme.name) }}
                </button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <label
                >{{ t("products.links.background") }}<ModernSelect v-model="draft.backgroundMode">
                  <option value="preset">{{ t("products.links.theme_preset") }}</option>
                  <option value="solid">{{ t("products.links.solid_color") }}</option>
                  <option value="gradient">{{ t("products.links.gradient") }}</option>
                  <option value="image">{{ t("products.links.photo") }}</option>
                </ModernSelect></label
              ><label
                >{{ t("products.links.color_mode") }}<ModernSelect v-model="draft.colorMode">
                  <option value="preset">{{ t("products.links.from_theme") }}</option>
                  <option value="light">{{ t("products.links.light") }}</option>
                  <option value="dark">{{ t("products.links.dark") }}</option>
                </ModernSelect></label
              >
            </div>
            <div
              v-if="['solid', 'gradient'].includes(draft.backgroundMode)"
              class="grid grid-cols-2 gap-4"
            >
              <label
                >{{ t("products.links.background_color") }}<input
                  v-model="draft.backgroundColor"
                  type="color" /></label
              ><label v-if="draft.backgroundMode === 'gradient'"
                >{{ t("products.links.gradient_color") }}<input
                  v-model="draft.gradientColor"
                  type="color"
              /></label>
            </div>
            <template v-if="draft.backgroundMode === 'image'"
              ><div>
                <label class="upload-button"
                  ><Upload :size="16" /> {{ t("products.links.upload_background") }}<input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    :disabled="!saved"
                    @change="upload($event, 'background')" /></label
                ><small>{{
                  saved
                    ? t("products.links.photos_upload_immediately_save_to_apply_the_photo_background_style")
                    : t("products.links.save_your_profile_before_uploading_photos")
                }}</small>
              </div>
              <label
                >{{ t("products.links.or_use_a_background_url") }}<input
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
                {{ t("products.links.remove_background_photo") }}
              </button></template
            >
            <div class="grid grid-cols-2 gap-4">
              <label
                >{{ t("products.links.font") }}<ModernSelect v-model="draft.font">
                  <option value="sans">{{ t("products.food.filters.modern") }}</option>
                  <option value="serif">{{ t("products.links.editorial") }}</option>
                  <option value="mono">{{ t("products.links.monospace") }}</option>
                </ModernSelect></label
              ><label
                >{{ t("products.links.card_radius") }}<ModernSelect v-model="draft.radius">
                  <option value="rounded">{{ t("products.links.rounded") }}</option>
                  <option value="pill">{{ t("products.links.pill") }}</option>
                  <option value="square">{{ t("products.links.square") }}</option>
                </ModernSelect></label
              >
            </div>
            <label
              >{{ t("products.links.button_style") }}<ModernSelect v-model="draft.buttonStyle">
                <option value="solid">{{ t("products.links.solid") }}</option>
                <option value="outline">{{ t("products.links.outline") }}</option>
                <option value="glass">{{ t("products.links.glass_blur") }}</option>
              </ModernSelect></label
            >
            <label class="enabled-label"
              ><input v-model="draft.showBranding" type="checkbox" /> {{ t("products.links.show_made_with_chlat_work") }}</label
            >
          </template>
          <template v-if="section === 'share'"
            ><h2 class="text-lg font-semibold">{{ t("products.links.share_your_page") }}</h2>
            <p v-if="dirty" class="text-sm text-amber-700 dark:text-amber-300">
              {{ t("products.links.save_your_changes_before_sharing_this_url_points_to_your_last_published_page") }}
            </p>
            <LinkShare
              :url="savedUrl"
              :title="saved?.displayName || 'ChlatWork Link'"
              :published="!!saved?.isPublished"
          /></template>
          <template v-if="section === 'analytics'"
            ><div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">{{ t("products.links.page_activity") }}</h2>
              <button
                type="button"
                class="secondary-button"
                @click="refreshAnalytics"
              >
                {{ t("products.common.refresh") }}
              </button>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="stat">
                <small>{{ t("products.links.profile_views") }}</small
                ><strong>{{ (saved?.viewCount || 0).toLocaleString() }}</strong>
              </div>
              <div class="stat">
                <small>{{ t("products.links.link_clicks") }}</small
                ><strong>{{ totalClicks.toLocaleString() }}</strong>
              </div>
            </div>
            <p class="text-xs text-slate-500 dark:text-white/60">
              {{ t("products.links.aggregate_counts_since_creation_including_repeat_visits_deleted_links_are_removed_from_click_totals_no_visitor_identities_are_stored") }}
            </p>
            <div
              v-for="link in saved?.links || []"
              :key="link.id"
              class="flex items-center gap-3 border-b border-slate-100 py-3 dark:border-white/10"
            >
              <LinkPlatformIcon :url="link.url" class="size-5 shrink-0" /><span
                class="min-w-0 flex-1 break-words text-sm"
                >{{ link.title
                }}<small v-if="!link.isEnabled">{{ t("products.links.disabled") }}</small></span
              ><strong class="text-sm">{{
                (link.clickCount || 0).toLocaleString()
              }}</strong>
            </div></template
          >
        </fieldset>
        <div
          class="editor-save-actions mt-8 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5 dark:border-white/10"
        >
          <button
            type="button"
            class="primary-button"
            :disabled="busy || !!loadError"
            @click="save()"
          >
            {{
              busy
                ? t("products.common.saving")
                : saved?.isPublished
                  ? t("products.moments.save_changes")
                  : "Save draft"
            }}</button
          ><button
            v-if="!saved?.isPublished"
            type="button"
            class="secondary-button"
            :disabled="busy || !!loadError"
            @click="save(true)"
          >
            {{ t("products.links.publish_page") }}</button
          ><button
            v-else
            type="button"
            class="text-sm text-slate-500 underline dark:text-white/60"
            :disabled="busy || !!loadError"
            @click="save(false)"
          >
            {{ t("products.links.unpublish") }}</button
          ><span v-if="dirty" class="text-xs text-amber-600 dark:text-amber-300"
            >{{ t("products.links.unsaved_changes") }}</span
          >
        </div>
      </section>
      <aside
        id="link-editor-preview"
        class="mx-auto w-full max-w-[360px] lg:sticky lg:top-6"
        :class="{ 'mobile-editor-hidden': product === 'link' && !mobilePreviewOpen }"
        :aria-label="t(&quot;products.links.live_mobile_preview&quot;)"
      >
        <p
          class="mb-4 text-center text-xs font-semibold uppercase tracking-[.16em] text-slate-400"
        >
          {{ t("products.links.live_mobile_preview") }}
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
          {{ t("products.links.drag_preview_links_or_use_alt_to_reorder_save_to_update_your_shared_page") }}
        </p>
        <button v-if="product === 'link'" type="button" class="mt-4 min-h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold dark:border-white/15 sm:hidden" @click="mobilePreviewOpen = false">{{ t("products.links.continue_editing") }}</button>
      </aside>
    </div>
  </main>
</template>

<style scoped>
@media (max-width: 639px) {
  .link-editor-mobile { padding: .5rem 0 1rem; }
  .link-editor-mobile > header { margin-bottom: 1rem; gap: .75rem; }
  .link-editor-mobile > header > div > p { display: none; }
  .link-editor-mobile > header h1 { font-size: 1.4rem; }
  .link-editor-mobile .mobile-editor-hidden { display: none; }
  .link-editor-mobile .editor-panel { padding: 1rem; border-radius: 1.25rem; }
  .link-editor-mobile .editor-panel > nav { margin: 0 -1rem 1.25rem; padding: 0 .75rem .75rem; }
  .link-editor-mobile .editor-panel > nav a { min-height: 2.75rem; display: flex; align-items: center; padding-left: .65rem; padding-right: .65rem; }
  .link-editor-mobile .editor-save-actions { position: sticky; bottom: calc(4.5rem + env(safe-area-inset-bottom)); z-index: 20; margin: 1.25rem -1rem -1rem; padding: .75rem; background: var(--app-color-page-bg); border-radius: 0 0 1.25rem 1.25rem; gap: .5rem; }
  .link-editor-mobile .editor-save-actions > button { min-height: 2.75rem; }
  .link-editor-mobile .editor-save-actions > .primary-button { flex: 1; }
  .link-editor-mobile :deep(.share-actions) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .link-editor-mobile :deep(.share-actions > a) { grid-column: 1 / -1; }
  .link-editor-mobile :deep(.share-actions > button),
  .link-editor-mobile :deep(.share-actions > a),
  .link-editor-mobile :deep(.share-download) { min-height: 2.75rem; }
  .link-editor-mobile :deep(.share-download) { justify-self: stretch; }
}
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
