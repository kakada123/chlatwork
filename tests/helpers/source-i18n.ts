import assert from "node:assert/strict";
import { parse } from "@vue/compiler-sfc";
import { parse as parseTemplate } from "@vue/compiler-dom";
import english from "../../app/locales/en/index.ts";
import khmer from "../../app/locales/km/index.ts";

function keysFor(expected: string | RegExp) {
  return Object.entries(english).filter(([, value]) => typeof expected === "string" ? value === expected : expected.test(value)).map(([key]) => key);
}

/** Source-structure tests follow the key actually referenced, without hard-coding one locale's copy. */
export function assertSourceMessage(source: string, expected: string | RegExp) {
  const keys = keysFor(expected);
  assert.ok(keys.some(key => source.includes(key) && Object.hasOwn(khmer, key)), `Missing keyed message: ${expected}`);
}

export function sourceMessagePosition(source: string, expected: string) {
  const positions = keysFor(expected).map(key => source.indexOf(key)).filter(index => index >= 0);
  return positions.length ? Math.min(...positions) : -1;
}

export function assertTranslatedAttribute(source: string, expected: string, tag?: string, attribute = "aria-label") {
  const keys = keysFor(expected);
  const { descriptor } = parse(source);
  assert.ok(descriptor.template);
  let found = false;
  const visit = (node: any) => {
    if (node.type === 1 && (!tag || node.tag === tag)) {
      found ||= node.props.some((prop: any) => prop.type === 7 && prop.name === "bind" && prop.arg?.content === attribute && keys.some(key => prop.exp?.content.includes(key)));
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(parseTemplate(descriptor.template.content));
  assert.ok(found, `Missing translated ${attribute}: ${expected}${tag ? ` on ${tag}` : ""}`);
}
