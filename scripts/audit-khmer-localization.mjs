import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@vue/compiler-sfc";
import { parse as parseTemplate, NodeTypes } from "@vue/compiler-dom";

const KHMER = /[\u1780-\u17ff\u19e0-\u19ff]/u;
const VISIBLE_ATTRIBUTES = new Set(["placeholder", "aria-label", "title", "alt", "label", "empty-text", "loading-text", "description"]);
// Technical identifiers and product names are deliberately retained in both languages.
const IDENTIFIER = /^(?:ChlatWork(?: (?:Creator|Link))?|Google|Telegram|Facebook|YouTube|GitHub|TikTok|Instagram|LinkedIn|WhatsApp|Discord|PDF|JPG|JPEG|PNG|SVG|WebP|HTML|CSS|JSON|JWT|UUID(?: v4)?|MD5|SHA-?\d+|UTF-?8|ASCII|Base64|URL|QR(?: Code)?|Wi-Fi|WPA\/?WPA2|WEP|SSID|CODE\d+|EAN\d+|UPC|A4|A5|Letter|Legal|UTC|GMT|USD|KHR|EN|px|pt|MB|KB|GB|ms|AM|PM|SSL|SSH|REST APIs?|NestJS|Laravel|Nuxt|Vue(?:\.js)?|Electron|Socket\.IO|PostgreSQL|Redis|Docker|Nginx|PM2|Ubuntu|npm|pnpm|yarn|bun)$/i;

export function needsKhmerTranslation(value) {
  const text = value.replace(/\s+/g, " ").trim();
  return /[A-Za-z]{2}/.test(text) && !KHMER.test(text) && !IDENTIFIER.test(text)
    && !/^(?:https?:\/\/|[\w.+-]+@[\w.-]+\.|[\w.-]+\.(?:com|ts|js|vue|pdf|png|jpg)\b)/i.test(text);
}

/** Find source-authored copy; never inspect user data, secrets, or generated output. */
export function auditVueSource(source, filename = "component.vue") {
  const { descriptor, errors } = parse(source, { filename });
  if (errors.length) throw new Error(`Cannot parse ${filename}`);
  if (!descriptor.template) return [];
  const findings = [];
  const add = (kind, value, line) => {
    if (needsKhmerTranslation(value)) findings.push({ file: filename, line, kind, text: value.replace(/\s+/g, " ").trim() });
  };
  const offset = descriptor.template.loc.start.line - 1;
  const walk = (node, inExample = false, englishOnly = false) => {
    if (node.type === NodeTypes.ELEMENT) {
      inExample ||= ["code", "pre", "script", "style"].includes(node.tag);
      // Explicit English branches are already paired with localized content.
      englishOnly ||= node.props.some(prop => prop.type === NodeTypes.ATTRIBUTE && prop.name === "lang" && prop.value?.content === "en");
      if (!inExample && !englishOnly) for (const prop of node.props) {
        if (prop.type === NodeTypes.ATTRIBUTE && VISIBLE_ATTRIBUTES.has(prop.name) && prop.value) {
          add(`attribute:${prop.name}`, prop.value.content, prop.loc.start.line + offset);
        }
      }
    }
    if (!inExample && !englishOnly && node.type === NodeTypes.TEXT) add("text", node.content, node.loc.start.line + offset);
    for (const child of node.children ?? []) walk(child, inExample, englishOnly);
  };
  walk(parseTemplate(descriptor.template.content));
  return findings;
}

function vueFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? vueFiles(path) : entry.name.endsWith(".vue") ? [path] : [];
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(".");
  const files = ["app/pages", "app/components", "app/layouts", "app/app.vue", "app/error.vue"].flatMap(path =>
    path.endsWith(".vue") ? (() => { try { readFileSync(path); return [resolve(path)]; } catch { return []; } })() : vueFiles(resolve(path)),
  );
  const findings = files.flatMap(path => auditVueSource(readFileSync(path, "utf8"), relative(root, path)));
  if (process.argv.includes("--json")) console.log(JSON.stringify({ scannedFiles: files.length, findings }, null, 2));
  else {
    for (const finding of findings) console.log(`${finding.file}:${finding.line} [${finding.kind}] ${finding.text}`);
    console.log(`Scanned ${files.length} Vue files; ${findings.length} static copy candidates require review.`);
  }
  if (process.argv.includes("--check") && findings.length) process.exitCode = 1;
}
