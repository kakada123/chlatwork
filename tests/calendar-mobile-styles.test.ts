import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileStyle, parse } from "@vue/compiler-sfc";
import postcss from "postcss";

test("calendar dark styles stay scoped to their calendar elements", () => {
  for (const file of ["index.vue", "date/[date].vue"]) {
    const filename = new URL(
      `../app/pages/tools/khmer-calendar/${file}`,
      import.meta.url,
    );
    const { descriptor } = parse(readFileSync(filename, "utf8"));
    const result = compileStyle({
      source: descriptor.styles[0]!.content,
      id: "data-v-calendar-test",
      scoped: true,
    });
    assert.deepEqual(result.errors, []);
    postcss.parse(result.code).walkRules((rule) => {
      assert.notEqual(
        rule.selector,
        ".dark",
        "A calendar style must not change the document root",
      );
    });
    assert.match(
      result.code,
      /\.dark \.(?:khmer-calendar|calendar-detail)\[data-v-calendar-test\]/,
    );
  }
});
