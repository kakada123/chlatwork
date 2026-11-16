import { createRenderer } from "vue";

// A small event-capable host lets shared controls run their real Vue render and DOM handlers.
export class ControlNode extends EventTarget {
  tag: string;
  text = "";
  parent: ControlNode | null = null;
  children: ControlNode[] = [];
  props: Record<string, any> = {};
  style: Record<string, string> = {};
  value: any = "";
  open = false;
  constructor(tag: string) {
    super();
    this.tag = tag;
  }
  getRootNode() {
    return document;
  }
  get type() {
    return this.props.type;
  }
  get readOnly() {
    return Boolean(this.props.readonly);
  }
  get nodeType() {
    return this.tag === "text" ? 3 : 1;
  }
  get childNodes() {
    return this.children;
  }
  get textContent(): string {
    return this.text + this.children.map((n) => n.textContent).join("");
  }
  get labels(): ControlNode[] {
    let label = this.parent;
    while (label && label.tag !== "label") label = label.parent;
    if (!label) return [];
    const first = controlNodes(label).find((node) =>
      ["input", "select", "button", "textarea"].includes(node.tag),
    );
    return label.props.for
      ? label.props.for === this.props.id
        ? [label]
        : []
      : first === this
        ? [label]
        : [];
  }
  get offsetWidth() {
    return 340;
  }
  get scrollHeight() {
    return 520;
  }
  matches(selector: string) {
    return selector === ":disabled" && Boolean(this.props.disabled);
  }
  getBoundingClientRect() {
    return { left: 12, top: 220, bottom: 264, width: 340, height: 44 };
  }
  contains(node: ControlNode | null) {
    while (node) {
      if (node === this) return true;
      node = node.parent;
    }
    return false;
  }
  focus() {
    (document as any).activeElement = this;
  }
  showPopover() {}
  hidePopover() {}
}
class ControlDocument extends EventTarget {}
class InputNode extends ControlNode {}
class TextareaNode extends ControlNode {}
export const controlRenderer = createRenderer<ControlNode, ControlNode>({
  insertStaticContent(content, parent, anchor) {
    const node = Object.assign(new ControlNode("static"), {
      text: content,
      parent,
    });
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(index < 0 ? parent.children.length : index, 0, node);
    return [node, node];
  },
  createElement: (tag) =>
    tag === "input"
      ? new InputNode(tag)
      : tag === "textarea"
        ? new TextareaNode(tag)
        : new ControlNode(tag),
  createText: (text) => Object.assign(new ControlNode("text"), { text }),
  createComment: () => new ControlNode("comment"),
  insert(child, parent, anchor) {
    if (child.parent)
      child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(
      index < 0 ? parent.children.length : index,
      0,
      child,
    );
  },
  remove(child) {
    if (child.parent)
      child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = null;
  },
  setText(node, text) {
    node.text = text;
  },
  setElementText(node, text) {
    node.text = text;
    node.children = [];
  },
  patchProp(node, key, previous, value) {
    node.props[key] = value;
    if (key === "value") node.value = value;
    if (/^on[A-Z]/.test(key)) {
      const event = key.slice(2).toLowerCase();
      if (typeof previous === "function")
        node.removeEventListener(event, previous);
      if (typeof value === "function") node.addEventListener(event, value);
    }
  },
  parentNode: (node) => node.parent,
  nextSibling: (node) =>
    node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
});
export const controlNodes = (node: ControlNode): ControlNode[] => [
  node,
  ...node.children.flatMap(controlNodes),
];
export function installControlDocument() {
  const mocks = {
    window: Object.assign(new EventTarget(), {
      innerHeight: 740,
      innerWidth: 375,
    }),
    Document: ControlDocument,
    ShadowRoot: class {},
    document: Object.assign(new ControlDocument(), {
      documentElement: { clientWidth: 375 },
      activeElement: null,
    }),
    Node: ControlNode,
    HTMLElement: ControlNode,
    HTMLInputElement: InputNode,
    HTMLTextAreaElement: TextareaNode,
  };
  const previous = Object.keys(mocks).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  for (const [key, value] of Object.entries(mocks))
    Object.defineProperty(globalThis, key, { configurable: true, value });
  return () => {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  };
}
