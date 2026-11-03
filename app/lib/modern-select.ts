import { Comment, isVNode, type VNode } from "vue";

export type SelectOption = {
  value: unknown;
  label: string;
  disabled: boolean;
  group: string;
  index: number;
};

function textContent(children: unknown): string {
  if (Array.isArray(children)) return children.map(textContent).join("");
  if (isVNode(children)) return children.type === Comment ? "" : textContent(children.children);
  return typeof children === "string" || typeof children === "number" ? String(children) : "";
}

/** Read the existing option slots without changing their values or business rules. */
export function readSelectOptions(nodes: VNode[]): SelectOption[] {
  const options: SelectOption[] = [];
  function visit(children: unknown, group = "", groupDisabled = false) {
    if (Array.isArray(children)) {
      children.forEach((child) => visit(child, group, groupDisabled));
      return;
    }
    if (!isVNode(children) || children.type === Comment) return;
    const props = children.props ?? {};
    const disabled = groupDisabled || props.disabled === "" || Boolean(props.disabled);
    if (children.type === "option") {
      const label = textContent(children.children).replace(/\s+/g, " ").trim();
      options.push({
        value: Object.hasOwn(props, "value") ? props.value : label,
        label, disabled, group, index: options.length,
      });
    } else {
      visit(children.children, children.type === "optgroup" ? String(props.label ?? "") : group, disabled);
    }
  }
  visit(nodes);
  return options;
}

export function filterSelectOptions(options: SelectOption[], query: string): SelectOption[] {
  const normalize = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase();
  const term = normalize(query);
  return term ? options.filter((option) => normalize(`${option.label} ${option.group}`).includes(term)) : options;
}

export function selectValuesEqual(left: unknown, right: unknown): boolean {
  if (left == null || right == null) return left === right;
  return Object.is(left, right) || String(left) === String(right);
}
