import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse, compileStyle } from "@vue/compiler-sfc";
import postcss from "postcss";
import { is } from "css-select";
import { Element } from "domhandler";

test("compiled Food dark overlays target their surfaces rather than the document root", () => {
  const html = new Element("html", { class: "dark" });
  const body = new Element("body", {});
  const shell = new Element("div", {
    class: "food-shell",
    "data-v-food-theme": "",
  });
  const hero = new Element("div", {
    class: "food-hero",
    "data-v-food-theme": "",
  });
  const unrelated = new Element("div", { class: "other-product" });
  html.children = [body];
  body.parent = html;
  body.children = [shell, unrelated];
  shell.parent = body;
  unrelated.parent = body;
  shell.children = [hero];
  hero.parent = shell;

  for (const [filename, surface] of [
    ["app/layouts/food.vue", shell],
    ["app/pages/food.vue", hero],
  ] as const) {
    const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
    const style = compileStyle({
      filename,
      id: "data-v-food-theme",
      source: descriptor.styles[0].content,
      scoped: true,
    });
    assert.deepEqual(style.errors, []);
    let overlays = 0;
    postcss.parse(style.code).walkRules((rule) => {
      // Identify dark paint declarations, then exercise their compiled selectors against a DOM tree.
      if (
        !rule.nodes.some(
          (node) => node.type === "decl" && node.value.includes("12 15 20"),
        )
      )
        return;
      overlays++;
      assert.equal(
        is(surface, rule.selector),
        true,
        `${filename}: dark overlay must reach its surface`,
      );
      assert.equal(
        is(html, rule.selector),
        false,
        `${filename}: dark overlay must not paint the document root`,
      );
      assert.equal(is(unrelated, rule.selector), false);
      html.attribs.class = "";
      assert.equal(
        is(surface, rule.selector),
        false,
        `${filename}: dark overlay must switch off in light mode`,
      );
      html.attribs.class = "dark";
    });
    assert.ok(overlays > 0, `${filename}: missing dark overlay`);
  }
});
