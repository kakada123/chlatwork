<script setup lang="ts" generic="T = string">
import { computed, getCurrentInstance, nextTick, normalizeClass, onBeforeUnmount, onMounted, onUpdated, ref, useAttrs, useId, useSlots, watch } from "vue";
import { Check, ChevronDown, Search } from "lucide-vue-next";
import { filterSelectOptions, readSelectOptions, selectValuesEqual, type SelectOption } from "~/lib/modern-select";
import { getDatePickerPosition } from "~/lib/date-picker-position";

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<{
  modelValue?: T;
  value?: T;
  modelModifiers?: { number?: boolean; trim?: boolean };
  disabled?: boolean;
  required?: boolean;
  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
}>(), { disabled: false, required: false, multiple: false, placeholder: "Select an option", searchPlaceholder: "Search options…" });
const emit = defineEmits<{ "update:modelValue": [value: T]; change: [event: Event]; input: [event: Event] }>();
const attrs = useAttrs();
const slots = useSlots();
const instance = getCurrentInstance();
const generatedId = useId();
const controlId = computed(() => String(attrs.id ?? `${generatedId}-select`));
const listId = `${generatedId}-options`;
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const native = ref<HTMLSelectElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const search = ref<HTMLInputElement | null>(null);
const isOpen = ref(false);
const query = ref("");
const activeIndex = ref(-1);
const invalid = ref(false);
const implicitLabel = ref("");
const panelStyle = ref<Record<string, string>>({});
const localValue = ref<unknown>();
let options: SelectOption[] = [];

const nativeModel = computed({
  get: () => Object.hasOwn(instance?.vnode.props ?? {}, "modelValue") ? props.modelValue
    : Object.hasOwn(instance?.vnode.props ?? {}, "value") ? props.value : localValue.value,
  set: (value: unknown) => {
    const normalize = (item: unknown) => {
      if (typeof item !== "string") return item;
      const text = props.modelModifiers?.trim ? item.trim() : item;
      const numeric = Number.parseFloat(text);
      return props.modelModifiers?.number && !Number.isNaN(numeric) ? numeric : text;
    };
    const next = Array.isArray(value) ? value.map(normalize) : normalize(value);
    localValue.value = next;
    invalid.value = false;
    emit("update:modelValue", next as T);
  },
});

function renderOptions() {
  // Slot contents are read during rendering so async option lists stay reactive in SSR and on the client.
  options = readSelectOptions(slots.default?.() ?? []);
  return options;
}
function selected(option: SelectOption) {
  return props.multiple && Array.isArray(nativeModel.value)
    ? nativeModel.value.some((value) => selectValuesEqual(value, option.value))
    : selectValuesEqual(nativeModel.value, option.value);
}
function selectedLabel(items: SelectOption[]) {
  return items.filter(selected).map((option) => option.label).join(", ") || props.placeholder;
}
function refreshLabel() {
  if (attrs["aria-label"] || attrs["aria-labelledby"]) return;
  const labelText = (node: Node): string => {
    if (node === root.value) return "";
    if (node.nodeType === 3) return node.textContent ?? "";
    return Array.from(node.childNodes).map(labelText).join(" ");
  };
  const labels = Array.from(trigger.value?.labels ?? []);
  const next = labels.map(labelText).join(" ").replace(/\s+/g, " ").trim();
  if (next !== implicitLabel.value) implicitLabel.value = next;
}
function triggerLabel() {
  if (attrs["aria-labelledby"]) return undefined;
  const label = attrs["aria-label"] || implicitLabel.value;
  return label ? `${label}: ${selectedLabel(renderOptions())}` : undefined;
}
async function revealActiveOption() {
  await nextTick();
  const option = activeOption();
  if (isOpen.value && option) document.getElementById(`${listId}-${option.index}`)?.scrollIntoView({ block: "nearest" });
}
function filteredOptions() { return filterSelectOptions(options, query.value); }
function activeOption() {
  const available = filteredOptions().filter((option) => !option.disabled);
  return available.find((option) => option.index === activeIndex.value) ?? available[0];
}
function layoutClass() {
  // Preserve callers' sizing and positioning while this shared control owns its surface and padding.
  return normalizeClass(attrs.class).split(/\s+/).filter((token) => {
    const utility = token.split(":").at(-1) ?? "";
    return /^(?:-?m[trblxy]?-|(?:min-|max-)?[wh]-|flex(?:-|$)|grow|shrink|basis-|self-|order-|col-|row-|grid-|hidden$|block$|inline-|font-mono$)/.test(utility);
  });
}
function nativeAttrs() {
  return Object.fromEntries(Object.entries(attrs).filter(([key]) =>
    !["class", "style", "id", "autofocus", "tabindex"].includes(key) && !key.startsWith("aria-") && !key.startsWith("on")));
}
function updatePosition() {
  if (!isOpen.value || !trigger.value || !panel.value) return;
  const anchor = trigger.value.getBoundingClientRect();
  // The visible viewport shrinks when a mobile search keyboard opens.
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const viewportWidth = viewport?.width ?? document.documentElement.clientWidth;
  const width = Math.max(0, Math.min(Math.max(anchor.width, 240), viewportWidth - 24));
  const relativeAnchor = { left: anchor.left - left, top: anchor.top - top, bottom: anchor.bottom - top };
  const position = getDatePickerPosition(relativeAnchor, { width, height: panel.value.scrollHeight }, {
    width: viewportWidth, height: viewport?.height ?? window.innerHeight,
  }, "bottom");
  const widthChanged = panelStyle.value.width !== `${width}px`;
  const next = { width: `${width}px`, left: `${position.left + left}px`, top: `${position.top + top}px`, maxHeight: `${position.maxHeight}px` };
  if (Object.entries(next).some(([key, value]) => panelStyle.value[key] !== value)) panelStyle.value = next;
  if (widthChanged) void nextTick(updatePosition);
}
function outsidePointer(event: Event) {
  if (!root.value?.contains(event.target as Node)) close(false);
}
function removeListeners() {
  document.removeEventListener("pointerdown", outsidePointer, true);
  window.removeEventListener("resize", updatePosition);
  window.removeEventListener("scroll", updatePosition, true);
  window.visualViewport?.removeEventListener("resize", updatePosition);
  window.visualViewport?.removeEventListener("scroll", updatePosition);
}
async function open() {
  if (props.disabled || isOpen.value) return;
  query.value = "";
  activeIndex.value = options.find((option) => selected(option) && !option.disabled)?.index ?? -1;
  isOpen.value = true;
  await nextTick();
  if (!isOpen.value || !panel.value) return;
  // Keep the popup in the control's DOM subtree for dialog focus traps while escaping ancestor overflow.
  panel.value.showPopover?.();
  updatePosition();
  search.value?.focus();
  void revealActiveOption();
  document.addEventListener("pointerdown", outsidePointer, true);
  window.addEventListener("resize", updatePosition);
  window.addEventListener("scroll", updatePosition, true);
  window.visualViewport?.addEventListener("resize", updatePosition);
  window.visualViewport?.addEventListener("scroll", updatePosition);
}
function close(restoreFocus = true) {
  if (!isOpen.value) return;
  isOpen.value = false;
  removeListeners();
  if (restoreFocus) trigger.value?.focus();
}
function choose(index: number) {
  const option = options.find((item) => item.index === index);
  if (props.disabled || !option || option.disabled || !native.value) return;
  if (props.multiple) native.value.options[index].selected = !native.value.options[index].selected;
  else native.value.selectedIndex = index;
  // Dispatch the real select events so existing @change handlers still receive an HTMLSelectElement target.
  native.value.dispatchEvent(new Event("input", { bubbles: true }));
  native.value.dispatchEvent(new Event("change", { bubbles: true }));
  if (!props.multiple) close();
}
function handleSearch(event: Event) {
  query.value = (event.target as HTMLInputElement).value;
  activeIndex.value = filteredOptions().find((option) => !option.disabled)?.index ?? -1;
  void revealActiveOption();
}
function handleKey(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault(); event.stopPropagation(); close();
  } else if (event.key === "Enter") {
    event.preventDefault();
    const option = activeOption();
    if (option) choose(option.index);
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const available = filteredOptions().filter((option) => !option.disabled);
    if (!available.length) return;
    const index = available.findIndex((option) => option.index === activeIndex.value);
    const next = index < 0 ? (event.key === "ArrowDown" ? 0 : available.length - 1)
      : (index + (event.key === "ArrowDown" ? 1 : -1) + available.length) % available.length;
    activeIndex.value = available[next].index;
    void revealActiveOption();
  }
}
function handleFocusOut(event: FocusEvent) {
  if (event.relatedTarget === trigger.value || !root.value?.contains(event.relatedTarget as Node | null)) close(false);
}
function handleInvalid(event: Event) {
  event.preventDefault(); invalid.value = true; trigger.value?.focus();
}
watch(() => props.disabled, (disabled) => { if (disabled) close(false); });
onMounted(refreshLabel);
onUpdated(() => { refreshLabel(); if (isOpen.value) updatePosition(); });
onBeforeUnmount(() => {
  if (isOpen.value) removeListeners();
  // Pending nextTick callbacks must not reopen or refocus a picker after navigation.
  isOpen.value = false;
});
defineExpose({ focus: () => trigger.value?.focus(), close });
</script>

<template>
  <span ref="root" :class="['modern-select', layoutClass()]" :style="attrs.style" @focusout="handleFocusOut">
    <select
      :id="`${controlId}--native`" ref="native" v-model="nativeModel" v-bind="nativeAttrs()"
      :disabled="props.disabled" :required="props.required" :multiple="props.multiple"
      tabindex="-1" aria-hidden="true" class="modern-select-native"
      @change="emit('change', $event)" @input="emit('input', $event)" @invalid="handleInvalid"
      @click.prevent="open" @focus="trigger?.focus()"
    ><slot /></select>
    <button
      :id="controlId" ref="trigger" type="button" class="modern-select-trigger"
      :disabled="props.disabled" :aria-label="triggerLabel()" :aria-labelledby="attrs['aria-labelledby']"
      :aria-describedby="invalid ? `${generatedId}-error` : attrs['aria-describedby']"
      :aria-invalid="invalid || attrs['aria-invalid']" :aria-expanded="isOpen" :aria-controls="listId" aria-haspopup="listbox"
      :title="attrs.title" :tabindex="attrs.tabindex" :autofocus="attrs.autofocus"
      @click.stop="isOpen ? close() : open()" @keydown.down.prevent="open" @keydown.up.prevent="open"
    >
      <span>{{ selectedLabel(renderOptions()) }}</span><ChevronDown class="modern-select-chevron" :class="{ 'is-open': isOpen }" :size="16" aria-hidden="true" />
    </button>
    <span v-if="invalid" :id="`${generatedId}-error`" role="alert" class="modern-select-error">Please choose an option.</span>
    <span v-if="isOpen" ref="panel" popover="manual" class="modern-select-popover" :style="panelStyle" @click.stop @keydown.esc.stop.prevent="close()">
      <span class="modern-select-search"><Search :size="16" aria-hidden="true" /><input ref="search" type="search" :value="query" :placeholder="props.searchPlaceholder" aria-label="Search options" role="combobox" aria-autocomplete="list" aria-expanded="true" :aria-controls="listId" :aria-activedescendant="activeOption() ? `${listId}-${activeOption()!.index}` : undefined" autocomplete="off" @input="handleSearch" @keydown="handleKey" /></span>
      <span :id="listId" role="listbox" :aria-multiselectable="props.multiple || undefined" class="modern-select-options">
        <template v-for="(option, index) in filteredOptions()" :key="option.index">
          <span v-if="option.group && (!index || filteredOptions()[index - 1]?.group !== option.group)" class="modern-select-group">{{ option.group }}</span>
          <button :id="`${listId}-${option.index}`" type="button" role="option" tabindex="-1" :disabled="option.disabled" :aria-selected="selected(option)" class="modern-select-option" :class="{ 'is-selected': selected(option), 'is-active': activeOption()?.index === option.index }" @mouseenter="activeIndex = option.index" @mousedown.prevent @click="choose(option.index)"><span>{{ option.label }}</span><Check v-if="selected(option)" :size="16" aria-hidden="true" /></button>
        </template>
        <span v-if="!filteredOptions().length" role="status" class="modern-select-empty">No options found.</span>
      </span>
    </span>
  </span>
</template>

<style scoped>
.modern-select { --select-bg: #fff; --select-text: #15283e; --select-muted: #64748b; --select-border: #d6e0ec; --select-hover: #f0f9ff; display: inline-grid; position: relative; min-width: 0; max-width: 100%; min-height: 44px; vertical-align: middle; font-size: 14px; }
html.dark .modern-select { --select-bg: #101820; --select-text: #f1f5f9; --select-muted: #a1afbf; --select-border: #334155; --select-hover: #1c2938; }
.modern-select-native { position: absolute; width: 1px; height: 1px; padding: 0; border: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; pointer-events: none; }
.modern-select-trigger { display: flex; width: 100%; min-width: 0; min-height: 44px; height: 100%; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid var(--select-border); border-radius: 12px; padding: 10px 14px; background: var(--select-bg); color: var(--select-text); text-align: left; font: inherit; font-weight: 600; transition: border-color 150ms, box-shadow 150ms, background-color 150ms; }
.modern-select-trigger > span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.modern-select-trigger:hover:not(:disabled) { border-color: #38bdf8; }
.modern-select-trigger:focus-visible, .modern-select-trigger[aria-expanded="true"] { outline: none; border-color: #38bdf8; box-shadow: 0 0 0 3px #38bdf81f; }
.modern-select-trigger:disabled { cursor: not-allowed; opacity: 0.5; }
.modern-select-trigger[aria-invalid="true"] { border-color: #fb7185; }
.modern-select-chevron { flex-shrink: 0; color: var(--select-muted); transition: transform 150ms; }
.modern-select-chevron.is-open { transform: rotate(180deg); }
.modern-select-popover { position: fixed; inset: auto; z-index: 10000; display: flex; flex-direction: column; margin: 0; min-height: 0; overflow: hidden; border: 1px solid var(--select-border); border-radius: 16px; padding: 0; background: var(--select-bg); color: var(--select-text); box-shadow: 0 18px 54px #02061730; }
.modern-select-search { display: flex; flex: none; align-items: center; gap: 9px; border-bottom: 1px solid var(--select-border); padding: 8px 12px; color: var(--select-muted); }
.modern-select-search svg { flex-shrink: 0; }
.modern-select-search input { width: 100%; min-width: 0; min-height: 40px; border: 0; padding: 6px 0; background: transparent; color: var(--select-text); font-size: 14px; outline: none; box-shadow: none; }
.modern-select-search input::placeholder { color: var(--select-muted); }
.modern-select-options { display: block; min-height: 0; max-height: min(260px, calc(100dvh - 8rem)); overflow-y: auto; overscroll-behavior: contain; padding: 6px; scrollbar-width: thin; }
.modern-select-option { display: flex; width: 100%; min-height: 44px; align-items: center; justify-content: space-between; gap: 12px; border: 0; border-radius: 10px; padding: 10px 12px; background: transparent; color: var(--select-text); text-align: left; font-size: 14px; font-weight: 500; cursor: pointer; }
.modern-select-option > span { min-width: 0; overflow-wrap: anywhere; }
.modern-select-option > svg { flex-shrink: 0; }
.modern-select-option.is-active:not(:disabled), .modern-select-option:hover:not(:disabled) { background: var(--select-hover); }
.modern-select-option.is-selected, .modern-select-option.is-selected:hover { background: #a5f3fc; color: #0f172a; font-weight: 700; }
.modern-select-option:disabled { cursor: not-allowed; opacity: 0.4; }
.modern-select-group { display: block; padding: 9px 12px 5px; color: var(--select-muted); font-size: 11px; font-weight: 700; }
.modern-select-empty { display: block; padding: 24px 12px; color: var(--select-muted); text-align: center; font-size: 13px; }
.modern-select-error { padding-top: 5px; color: #e11d48; font-size: 12px; }
@media (max-width: 639px) { .modern-select-search input { font-size: 16px; } }
</style>
