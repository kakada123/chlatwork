import assert from "node:assert/strict";
import test from "node:test";
import { Fragment, h } from "vue";
import { filterSelectOptions, readSelectOptions, selectValuesEqual } from "../app/lib/modern-select.ts";

test("select options preserve typed values, groups, disabled states, and empty choices", () => {
  const options = readSelectOptions([
    h("option", { value: "" }, "Any"),
    h(Fragment, null, [h("option", { value: 0 }, "Zero"), h("option", { value: 1.6 }, "Balanced")]),
    h("optgroup", { label: "Unavailable", disabled: "" }, [h("option", { value: "x" }, "Option X")]),
  ]);
  assert.deepEqual(options.map(({ value, label, disabled, group, index }) => ({ value, label, disabled, group, index })), [
    { value: "", label: "Any", disabled: false, group: "", index: 0 },
    { value: 0, label: "Zero", disabled: false, group: "", index: 1 },
    { value: 1.6, label: "Balanced", disabled: false, group: "", index: 2 },
    { value: "x", label: "Option X", disabled: true, group: "Unavailable", index: 3 },
  ]);
});

test("search matches labels and groups with Khmer and normalized Latin text", () => {
  const options = readSelectOptions([
    h("option", { value: "coffee" }, "Coffee"),
    h("optgroup", { label: "ម្ហូប" }, [h("option", { value: "food" }, "អាហារ")]),
  ]);
  assert.deepEqual(filterSelectOptions(options, "  ＣＯＦＦ  ").map((item) => item.value), ["coffee"]);
  assert.deepEqual(filterSelectOptions(options, "ម្ហូប").map((item) => item.value), ["food"]);
  assert.equal(filterSelectOptions(options, "missing").length, 0);
});

test("numeric labels and implicit option values follow native select equality", () => {
  const [option] = readSelectOptions([h("option", null, " USD ")]);
  assert.equal(option.value, "USD");
  assert.ok(selectValuesEqual(0, "0"));
  assert.ok(!selectValuesEqual(0, ""));
  assert.ok(!selectValuesEqual(null, undefined));
});
