import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import englishTools from "../app/locales/en/tools.ts";
import khmerTools from "../app/locales/km/tools.ts";
import englishCommands from "../app/locales/en/developerCommands.ts";
import khmerCommands from "../app/locales/km/developerCommands.ts";
import { hasTranslation, translateMessage } from "../app/lib/i18n.ts";

const roots = ["app/pages/tools", "app/components/pdf-tools", "app/components/image-to-pdf", "app/components/qr", "app/components/barcode", "app/components/wifi-qr", "app/components/scanner", "app/components/developer-tools", "app/components/developer-commands"];
const files = roots.flatMap((root) => readdirSync(root, { recursive: true }).filter((path) => String(path).endsWith(".vue")).map((path) => `${root}/${path}`)).filter((path) => path !== "app/pages/tools/pdf.vue");
files.push("app/components/ImageCompressor.vue", "app/components/ResultBox.vue", "app/pages/developer-commands.vue", "app/data/tool-ui-km.ts", "app/lib/invoice-pdf.ts");

test("tool and developer-command catalogs have matching, nonempty semantic messages", () => {
  for (const [english, khmer] of [[englishTools, khmerTools], [englishCommands, khmerCommands]]) {
    assert.deepEqual(Object.keys(english).sort(), Object.keys(khmer).sort());
    for (const [key, value] of Object.entries(english)) {
      assert.match(key, /^(?:tools|developerCommands)\.[A-Za-z0-9_.-]+$/);
      assert.ok(value.length, key);
      assert.ok((khmer as Record<string, string>)[key]?.length, key);
    }
  }
});

test("owned tool consumers reference existing semantic keys in both languages", () => {
  for (const file of files) {
    const source = readFileSync(file, "utf8").replaceAll("&quot;", '"').replaceAll("&#39;", "'");
    for (const match of source.matchAll(/["'](tools\.[A-Za-z0-9_.-]+)["']/g)) {
      const key = match[1];
      if (key.endsWith(".")) continue; // Dynamic families are checked through their catalog coverage tests.
      assert.ok(hasTranslation("en", key), `${file}: ${key} (en)`);
      assert.ok(hasTranslation("km", key), `${file}: ${key} (km)`);
    }
  }
});

test("tool translation keys preserve identifiers and interpolate named values", () => {
  assert.equal(translateMessage("en", "tools.qr.generate"), "Generate");
  assert.equal(translateMessage("km", "tools.qr.generate"), "បង្កើត");
  assert.equal(translateMessage("en", "tools.imageToPdf.selectedCount.other", { count: 4 }), "4 images selected");
  assert.match(translateMessage("km", "tools.imageToPdf.selectedCount.other", { count: 4 }), /4/);
  assert.equal(translateMessage("en", "tools.invoice.labels.title"), "INVOICE");
  assert.equal(translateMessage("km", "tools.invoice.labels.title"), "វិក្កយបត្រ");
});
