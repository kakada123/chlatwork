import type { ToolDef } from "~/lib/tool-registry";

const TOOL_SEARCH_ALIASES: Record<string, string[]> = {
  "payback-calculator": ["split bill", "split expense", "group expense"],
  "image-compress": ["compress photo", "reduce image size", "image optimizer"],
  "image-to-pdf": ["jpg to pdf", "png to pdf", "photo to pdf"],
  qr: ["qr code", "qrcode", "scan code"],
  "wifi-qr": ["wifi qr", "wifi qr code", "wifi password", "wireless qr"],
  "text-to-voice": ["text to speech", "tts", "khmer voice"],
  calculator: ["date calculator", "date time converter", "quick math"],
  barcode: ["bar code", "product code"],
  "expense-tracker": ["budget tracker", "spending tracker"],
  "lucky-draw": ["random winner", "raffle", "giveaway"],
  "json-formatter": ["json validator", "pretty json", "minify json"],
  "jwt-decoder": ["decode token", "jwt parser", "bearer token"],
  base64: ["base64 encode", "base64 decode", "file base64"],
  "url-encoder": ["url decode", "query string", "percent encode"],
  "regex-tester": ["regular expression", "regex match"],
  "uuid-generator": ["guid", "unique id"],
  "unix-timestamp": ["epoch time", "date converter", "time converter"],
  "cron-explainer": ["cron parser", "schedule expression"],
  "hash-generator": ["sha256", "md5", "checksum"],
  "password-generator": ["strong password", "random password"],
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getToolSearchText(tool: ToolDef) {
  // Users search with natural names like "wifi qr" or "jpg to pdf", not only exact registry labels.
  return normalizeSearchText(
    [
      tool.name,
      tool.description,
      tool.category,
      tool.key,
      tool.route,
      ...(TOOL_SEARCH_ALIASES[tool.key] ?? []),
    ].join(" "),
  );
}

export function filterTools(tools: ToolDef[], query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return tools;
  }

  const queryTokens = normalizedQuery.split(" ");
  const compactQuery = normalizedQuery.replace(/\s+/g, "");

  return tools.filter((tool) => {
    const searchText = getToolSearchText(tool);
    const compactSearchText = searchText.replace(/\s+/g, "");

    return (
      searchText.includes(normalizedQuery) ||
      compactSearchText.includes(compactQuery) ||
      queryTokens.every(
        (token) =>
          searchText.includes(token) || compactSearchText.includes(token),
      )
    );
  });
}
