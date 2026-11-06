import assert from "node:assert/strict";
import test from "node:test";
import { loadSourceData } from "./helpers/load-source-data.ts";

const { TOOLS } = loadSourceData("app/lib/tool-registry.ts");
const { TOOL_TRANSLATIONS } = loadSourceData("app/composables/useLanguage.ts");
const { PDF_TOOLS } = loadSourceData("app/data/pdf-tools.ts");
const { localizePdfTool } = loadSourceData("app/data/pdf-tools-km.ts");
const { TOOL_GUIDES } = loadSourceData("app/data/tool-guides.ts");
const { TOOL_GUIDES_KM, localizeToolGuide } = loadSourceData("app/data/tool-guides-km.ts");
const { DEVELOPER_GUIDES } = loadSourceData("app/data/developer-guides.ts");
const { localizeDeveloperGuide } = loadSourceData("app/data/developer-guides-km.ts");
const { POSTS } = loadSourceData("app/data/posts.ts");
const { localizePost } = loadSourceData("app/data/posts-km.ts");
const khmer = (value: string, label: string) => assert.match(value, /[\u1780-\u17ff]/u, label);

test("every registered tool has explicit Khmer discovery copy and a guide", () => {
  for (const tool of TOOLS) {
    assert.ok(TOOL_TRANSLATIONS.km[tool.key], tool.key);
    khmer(TOOL_TRANSLATIONS.km[tool.key].description, `${tool.key} description`);
    assert.ok(TOOL_GUIDES_KM[tool.key], `${tool.key} guide must not use generic fallback`);
  }
});

test("all PDF copy is Khmer without altering processing options or discovery state", () => {
  for (const tool of PDF_TOOLS) {
    assert.equal(localizePdfTool(tool, "en"), tool);
    const localized = localizePdfTool(tool, "km");
    for (const key of ["name", "description", "metaTitle", "metaDescription", "privacyNote", "actionLabel", "emptyState"]) khmer(localized[key], `${tool.key} ${key}`);
    for (const field of ["betaNotice", "comingSoonNotice"]) if (tool[field]) khmer(localized[field], `${tool.key} ${field}`);
    for (const faq of localized.faq) { khmer(faq.question, tool.key); khmer(faq.answer, tool.key); }
    for (const step of localized.howItWorks) khmer(step, tool.key);
    for (const key of ["key", "route", "accept", "multiple", "enabled", "status", "related", "category", "iconPath", "iconPaths"]) assert.deepEqual(localized[key], tool[key], `${tool.key} ${key}`);
  }
});

test("Khmer tool guides never fall back to English examples, FAQs or metadata", () => {
  for (const guide of TOOL_GUIDES) {
    const localized = localizeToolGuide(guide, "km", { ...guide.tool, ...TOOL_TRANSLATIONS.km[guide.tool.key] });
    for (const field of ["metaTitle", "metaDescription", "heroTitle", "heroDescription", "ctaLabel"]) khmer(localized[field], `${guide.tool.key} ${field}`);
    for (const field of ["whatIs", "whyUse", "steps", "useCases", "tips", "privacy"]) for (const value of localized[field] ?? []) khmer(value, `${guide.tool.key} ${field}`);
    if (guide.practicalExamples?.length) assert.equal(localized.practicalExamples.length, guide.practicalExamples.length, guide.tool.key);
    for (const example of localized.practicalExamples ?? []) {
      for (const field of ["title", "scenario", "result"]) khmer(example[field], `${guide.tool.key} example ${field}`);
      for (const step of example.steps) khmer(step, guide.tool.key);
    }
    assert.equal(localizeToolGuide(guide, "en"), guide);
  }
});

test("developer guides translate warnings and instructions while preserving every executable example", () => {
  for (const guide of DEVELOPER_GUIDES) {
    const localized = localizeDeveloperGuide(guide, "km");
    for (const field of ["title", "summary", "metaTitle", "metaDescription", "duration"]) khmer(localized[field], `${guide.slug} ${field}`);
    assert.equal(localized.steps.length, guide.steps.length);
    for (const [index, step] of localized.steps.entries()) {
      khmer(step.title, guide.slug); khmer(step.description, guide.slug);
      if (guide.steps[index].warning) khmer(step.warning, `${guide.slug} warning`);
      if (guide.steps[index].note) khmer(step.note, `${guide.slug} note`);
      assert.deepEqual(step.commands, guide.steps[index].commands);
    }
    for (const value of [...localized.prerequisites, ...localized.verification]) khmer(value, guide.slug);
    assert.equal(localizeDeveloperGuide(guide, "en"), guide);
  }
});

test("published editorial copy is translated while original dates and author identity are preserved", () => {
  for (const post of POSTS) {
    const localized = localizePost(post, "km");
    for (const field of ["title", "description", "dek", "displayDate", "imageAlt", "editorialNote"]) khmer(localized[field], field);
    for (const field of ["slug", "path", "publishedAt", "updatedAt", "author", "imagePath", "readingMinutes"]) assert.equal(localized[field], post[field]);
    assert.equal(localized.sections.length, post.sections.length);
    for (const section of localized.sections) for (const value of [section.title, section.category, ...section.paragraphs, ...section.whyItMatters]) khmer(value, post.slug);
    for (const field of ["developerWatch", "securityWatch", "marketSnapshot", "keyTakeaways"]) for (const value of localized[field]) khmer(value, field);
    assert.equal(localizePost(post, "en"), post);
  }
});
