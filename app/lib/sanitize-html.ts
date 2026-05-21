import DOMPurify from "dompurify";
import type { Config } from "dompurify";

const HTML_SANITIZE_OPTIONS: Config = {
  USE_PROFILES: { html: true },
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: [
    "base",
    "button",
    "embed",
    "form",
    "iframe",
    "input",
    "link",
    "meta",
    "object",
    "script",
    "style",
  ],
};

const SVG_SANITIZE_OPTIONS: Config = {
  USE_PROFILES: { svg: true, svgFilters: true },
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ["foreignObject", "iframe", "script"],
};

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(input: string) {
  return input.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

function canSanitizeInDom() {
  return typeof window !== "undefined" && DOMPurify.isSupported !== false;
}

export function sanitizeHtml(input: string) {
  if (!input) {
    return "";
  }

  // SSR has no browser DOM for DOMPurify, so escape instead of trusting markup.
  if (!canSanitizeInDom()) {
    return escapeHtml(input);
  }

  return DOMPurify.sanitize(input, HTML_SANITIZE_OPTIONS);
}

export function sanitizeSvg(input: string) {
  if (!input) {
    return "";
  }

  if (!canSanitizeInDom()) {
    return "";
  }

  return DOMPurify.sanitize(input, SVG_SANITIZE_OPTIONS);
}
