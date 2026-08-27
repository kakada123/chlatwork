import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ALL_TOOL_PAGE_PATHS } from "../app/data/site-routes.ts";

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const pdfTools = readProjectFile("app/data/pdf-tools.ts");
const toolCategories = readProjectFile("app/data/tool-categories.ts");

function toolDefinition(toolKey: string, nextToolKey: string) {
  const start = pdfTools.indexOf(`key: "${toolKey}"`);
  const end = pdfTools.indexOf(`key: "${nextToolKey}"`, start + 1);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  return pdfTools.slice(start, end);
}

test("paused PDF tools keep direct routes but stay out of discovery", () => {
  const compressPdf = toolDefinition("compress-pdf", "remove-pdf-pages");
  const textToPdf = toolDefinition("text-to-pdf", "invoice-to-pdf");

  assert.match(compressPdf, /enabled: false/);
  assert.match(compressPdf, /status: "soon"/);
  assert.match(compressPdf, /comingSoonNotice:/);
  assert.match(textToPdf, /enabled: false/);
  assert.equal(ALL_TOOL_PAGE_PATHS.includes("/tools/compress-pdf"), true);
  assert.equal(ALL_TOOL_PAGE_PATHS.includes("/tools/text-to-pdf"), true);
});

test("HTML to PDF is discovered as a developer tool only", () => {
  const htmlToPdf = toolDefinition("html-to-pdf", "text-to-pdf");
  const pdfCategory = toolCategories.slice(
    toolCategories.indexOf('key: "pdf"'),
    toolCategories.indexOf('key: "image"'),
  );
  const developerCategory = toolCategories.slice(
    toolCategories.indexOf('key: "developer-tools"'),
    toolCategories.indexOf('key: "security-encoding"'),
  );

  assert.match(htmlToPdf, /category: "Developer Tools"/);
  assert.doesNotMatch(pdfCategory, /"html-to-pdf"/);
  assert.match(developerCategory, /"html-to-pdf"/);
});
