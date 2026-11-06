import assert from "node:assert/strict";
import test from "node:test";
import { createRenderer, createSSRApp, h, nextTick, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import { ModernSelect, modernSelectIsKhmer } from "./helpers/load-modern-select.ts";

class HostNode extends EventTarget {
  tag: string;
  text = "";
  parent: HostNode | null = null;
  children: HostNode[] = [];
  props: Record<string, any> = {};
  style: Record<string, string> = {};
  selected = false;
  _inputValue: unknown;
  scrollRequests = 0;
  constructor(tag: string) { super(); this.tag = tag; }
  get multiple() { return Boolean(this.props.multiple); }
  get options(): HostNode[] { return this.children.flatMap((child) => child.tag === "option" ? [child] : child.options); }
  get selectedIndex() { return this.options.findIndex((option) => option.selected); }
  set selectedIndex(index: number) { this.options.forEach((option, position) => { option.selected = position === index; }); }
  get value(): any {
    if (this.tag === "select") return this.options[this.selectedIndex]?.value ?? "";
    return this.tag === "option" ? this.props.value ?? this.text : this._inputValue ?? this.props.value ?? this.text;
  }
  set value(value: unknown) { this._inputValue = value; }
  get scrollHeight() { return 280; }
  get nodeType() { return this.tag === "text" ? 3 : 1; }
  get childNodes() { return this.children; }
  get textContent(): string { return this.text + this.children.map((child) => child.textContent).join(""); }
  get labels(): HostNode[] { const label = this.closest("label"); return label ? [label] : []; }
  closest(tag: string): HostNode | null { let node: HostNode | null = this; while (node) { if (node.tag === tag) return node; node = node.parent; } return null; }
  getBoundingClientRect() { return { left: 16, top: 100, bottom: 144, width: 200, height: 44 }; }
  contains(node: HostNode | null) { while (node) { if (node === this) return true; node = node.parent; } return false; }
  focus() { (document as any).activeElement = this; }
  showPopover() {}
  hidePopover() {}
  scrollIntoView() { this.scrollRequests++; }
}
const renderer = createRenderer<HostNode, HostNode>({
  createElement: (tag) => new HostNode(tag),
  createText: (text) => Object.assign(new HostNode("text"), { text }),
  createComment: () => new HostNode("comment"),
  insert(child, parent, anchor) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(index < 0 ? parent.children.length : index, 0, child);
  },
  remove(child) { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); child.parent = null; },
  setText(node, text) { node.text = text; },
  setElementText(node, text) { node.text = text; node.children = []; },
  patchProp(node, key, _previous, value) {
    node.props[key] = value;
    if (key === "value" && node.tag === "option") Object.assign(node, { _value: value });
    if (key === "value") node.value = value;
    if (/^on[A-Z]/.test(key) && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
  },
  parentNode: (node) => node.parent,
  nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
});

async function mountSelect(initialValue: any = "food", modifiers = {}, label = "") {
  const previous = ["window", "document"].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  Object.defineProperty(globalThis, "window", { configurable: true, value: Object.assign(new EventTarget(), { innerHeight: 768, innerWidth: 1024 }) });
  Object.defineProperty(globalThis, "document", { configurable: true, value: Object.assign(new EventTarget(), { documentElement: { clientWidth: 1024 }, activeElement: null }) });
  const model = ref(initialValue);
  const disabled = ref(false);
  const items = ref([
    { value: "food", label: "Food", disabled: false },
    { value: "coffee", label: "Coffee", disabled: false },
    { value: "locked", label: "Unavailable", disabled: true },
    { value: 1.6, label: "Balanced", disabled: false },
  ]);
  const changes: Event[] = [];
  const root = new HostNode("root");
  const app = renderer.createApp({
    setup: () => () => {
      const picker = h(ModernSelect, {
      modelValue: model.value, modelModifiers: modifiers, disabled: disabled.value, name: "choice", id: "choice", required: true,
      "onUpdate:modelValue": (value: unknown) => { model.value = value; }, onChange: (event: Event) => changes.push(event),
      }, { default: () => items.value.map((option) => h("option", { value: option.value, disabled: option.disabled }, option.label)) });
      return label ? h("label", [label, picker]) : picker;
    },
  });
  app.mount(root);
  const walk = (node: HostNode): HostNode[] => [node, ...node.children.flatMap(walk)];
  const nodes = () => walk(root);
  Object.assign(document, { getElementById: (id: string) => nodes().find((node) => node.props.id === id) });
  return {
    model, disabled, items, changes, nodes,
    async open() { await nodes().find((node) => node.props.class === "modern-select-trigger")!.props.onClick({ stopPropagation() {} }); await nextTick(); },
    async search(value: string) {
      const input = nodes().find((node) => node.tag === "input")!;
      input.value = value;
      input.dispatchEvent(new Event("input"));
      await nextTick();
    },
    async choose(label: string) {
      const option = nodes().find((node) => node.props.role === "option" && node.children.some((child) => child.text === label));
      assert.ok(option, `missing option ${label}`);
      option.props.onClick();
      await nextTick();
    },
    unmount() {
      app.unmount();
      for (const [name, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
    },
  };
}

test("search selection updates the model and retains the original native change-event target", async () => {
  const view = await mountSelect();
  try {
    await view.open();
    await view.search("  COFF  ");
    assert.equal(view.nodes().filter((node) => node.props.role === "option").length, 1);
    await view.choose("Coffee");
    assert.equal(view.model.value, "coffee");
    assert.equal(view.changes.length, 1);
    assert.equal((view.changes[0].target as HostNode).tag, "select");
    assert.equal((view.changes[0].target as HostNode).value, "coffee");
    assert.equal(view.nodes().find((node) => node.props.class === "modern-select-trigger")!.props["aria-expanded"], false);
  } finally { view.unmount(); }
});

test("numeric values and numeric v-model modifiers preserve calculation types", async () => {
  const view = await mountSelect(1.6, { number: true });
  try {
    await view.open();
    await view.choose("Balanced");
    assert.equal(view.model.value, 1.6);
    assert.equal(typeof view.model.value, "number");
  } finally { view.unmount(); }
});

test("disabled options cannot change a selection and disabling the control closes it", async () => {
  const view = await mountSelect();
  try {
    await view.open();
    await view.choose("Unavailable");
    assert.equal(view.model.value, "food");
    assert.equal(view.changes.length, 0);
    view.disabled.value = true;
    await nextTick();
    assert.ok(!view.nodes().some((node) => node.props.role === "listbox"));
  } finally { view.unmount(); }
});

test("async option updates refresh search and empty-result feedback", async () => {
  const view = await mountSelect();
  try {
    await view.open();
    await view.search("new item");
    assert.ok(view.nodes().some((node) => node.props.role === "status" && node.text === "No options found."));
    view.items.value.push({ value: "new", label: "New item", disabled: false });
    await nextTick();
    await view.choose("New item");
    assert.equal(view.model.value, "new");
  } finally { view.unmount(); }
});

test("keyboard Escape closes only the picker and restores focus", async () => {
  const view = await mountSelect();
  try {
    await view.open();
    const input = view.nodes().find((node) => node.tag === "input")!;
    let prevented = false;
    input.props.onKeydown({ key: "Escape", preventDefault() { prevented = true; }, stopPropagation() {} });
    await nextTick();
    assert.ok(prevented);
    assert.equal((document.activeElement as unknown as HostNode).props.class, "modern-select-trigger");
    assert.ok(!view.nodes().some((node) => node.props.role === "listbox"));
  } finally { view.unmount(); }
});

test("SSR keeps named native form controls, typed options, and label association", async () => {
  const app = createSSRApp({ render: () => h(ModernSelect, { modelValue: "USD", name: "currency", id: "currency", required: true }, { default: () => [h("option", { value: "USD" }, "US Dollar"), h("option", { value: "KHR" }, "Khmer Riel")] }) });
  const html = await renderToString(app);
  assert.match(html, /<select[^>]*name="currency"/);
  assert.match(html, /<button[^>]*id="currency"/);
  assert.match(html, /US Dollar/);
  assert.doesNotMatch(html, /role="listbox"/);
});

test("wrapping labels name the focusable trigger without including every option", async () => {
  const view = await mountSelect("food", {}, "Meal category");
  try {
    await nextTick();
    const trigger = view.nodes().find((node) => node.props.class === "modern-select-trigger")!;
    assert.equal(trigger.props["aria-label"], "Meal category: Food");
    await view.open();
    await view.choose("Coffee");
    assert.equal(trigger.props["aria-label"], "Meal category: Coffee");
  } finally { view.unmount(); }
});

test("keyboard navigation reveals the active option and starts at the first available choice", async () => {
  const view = await mountSelect("missing");
  try {
    await view.open();
    const input = view.nodes().find((node) => node.tag === "input")!;
    input.props.onKeydown({ key: "ArrowDown", preventDefault() {} });
    await nextTick();
    const active = view.nodes().find((node) => node.props.id === input.props["aria-activedescendant"])!;
    assert.match(active.textContent, /Food/);
    assert.ok(active.scrollRequests > 0, "the active row must be scrolled into view");
  } finally { view.unmount(); }
});

test("opening with a mobile keyboard keeps the popup within the visible viewport", async () => {
  const view = await mountSelect();
  try {
    Object.assign(window, { visualViewport: Object.assign(new EventTarget(), { width: 320, height: 320, offsetLeft: 0, offsetTop: 80 }) });
    await view.open();
    const panel = view.nodes().find((node) => node.props.popover === "manual")!;
    assert.equal(panel.props.style.maxHeight, "296px");
    assert.ok(Number.parseFloat(panel.props.style.top) >= 92);
    assert.ok(Number.parseFloat(panel.props.style.width) <= 296);
  } finally { view.unmount(); }
});

test("clearing a controlled model does not resurrect its previous local selection", async () => {
  const view = await mountSelect();
  try {
    await view.open();
    await view.choose("Coffee");
    view.model.value = undefined;
    await nextTick();
    const trigger = view.nodes().find((node) => node.props.class === "modern-select-trigger")!;
    assert.match(trigger.textContent, /Select an option/);
    assert.doesNotMatch(trigger.textContent, /Coffee/);
  } finally { view.unmount(); }
});

test("language changes update picker defaults without changing option values", async () => {
  const view = await mountSelect(null);
  try {
    modernSelectIsKhmer.value = true;
    await nextTick();
    const trigger = view.nodes().find(node => node.props.class === "modern-select-trigger")!;
    assert.match(trigger.textContent, /ជ្រើសរើសជម្រើសមួយ/);
    await view.open();
    const search = view.nodes().find(node => node.tag === "input")!;
    assert.equal(search.props["aria-label"], "ស្វែងរកជម្រើស");
    await view.search("missing choice");
    assert.ok(view.nodes().some(node => node.textContent.includes("រកមិនឃើញជម្រើស។")));
    modernSelectIsKhmer.value = false;
    await nextTick();
    assert.equal(search.props["aria-label"], "Search options");
    await view.search("Coffee");
    await view.choose("Coffee");
    assert.equal(view.model.value, "coffee");
  } finally {
    modernSelectIsKhmer.value = false;
    view.unmount();
  }
});
