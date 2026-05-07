export type JsonFormatResult = {
  output: string;
  error: string;
  errorLine: number | null;
  errorColumn: number | null;
  errorPreview: string;
};

export type JwtDecodeResult = {
  header: string;
  payload: string;
  signature: string;
  expiresAt: string;
  issuedAt: string;
  notBefore: string;
  warning: string;
  error: string;
};

export type CronFieldResult = {
  raw: string;
  values: Set<number>;
  description: string;
  isWildcard: boolean;
};

export type CronParseResult = {
  fields: {
    minute: CronFieldResult;
    hour: CronFieldResult;
    dayOfMonth: CronFieldResult;
    month: CronFieldResult;
    dayOfWeek: CronFieldResult;
  } | null;
  explanation: string[];
  error: string;
};

export type HashAlgorithm = "MD5" | "SHA-1" | "SHA-256" | "SHA-512";

const textEncoder = () => new TextEncoder();
const textDecoder = () => new TextDecoder("utf-8", { fatal: true });

export const COMMON_TIME_ZONES = [
  "UTC",
  "Asia/Phnom_Penh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
];

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

export function base64ToBytes(value: string) {
  const clean = value.replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export function encodeUtf8ToBase64(value: string) {
  return bytesToBase64(textEncoder().encode(value));
}

export function decodeBase64ToUtf8(value: string) {
  return textDecoder().decode(base64ToBytes(value));
}

export function base64UrlDecodeToString(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return decodeBase64ToUtf8(normalized + padding);
}

export function formatJson(value: string, mode: "pretty" | "minify"): JsonFormatResult {
  try {
    const parsed = JSON.parse(value);
    return {
      output: mode === "pretty" ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed),
      error: "",
      errorLine: null,
      errorColumn: null,
      errorPreview: "",
    };
  } catch (error: any) {
    const message = error?.message ?? "Invalid JSON.";
    const positionMatch =
      message.match(/position\s+(\d+)/i) ?? message.match(/char(?:acter)?\s+(\d+)/i);
    const position = positionMatch ? Number(positionMatch[1]) : null;
    const location = position === null ? null : getLineColumn(value, position);
    const lineText =
      location?.line === null || !location
        ? ""
        : value.split(/\r?\n/)[location.line - 1] ?? "";

    return {
      output: "",
      error: message,
      errorLine: location?.line ?? null,
      errorColumn: location?.column ?? null,
      errorPreview: lineText,
    };
  }
}

export function getLineColumn(value: string, position: number) {
  const before = value.slice(0, position);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

export function decodeJwt(token: string): JwtDecodeResult {
  const trimmed = token.trim();
  const parts = trimmed.split(".");

  if (!trimmed) {
    return emptyJwtResult("Paste a JWT to decode it.");
  }

  if (parts.length < 2) {
    return emptyJwtResult("A JWT should contain at least header and payload sections.");
  }

  try {
    const headerObject = JSON.parse(base64UrlDecodeToString(parts[0]));
    const payloadObject = JSON.parse(base64UrlDecodeToString(parts[1]));
    const payload = payloadObject as Record<string, unknown>;

    return {
      header: JSON.stringify(headerObject, null, 2),
      payload: JSON.stringify(payloadObject, null, 2),
      signature: parts[2] ? `${parts[2].slice(0, 24)}${parts[2].length > 24 ? "..." : ""}` : "",
      expiresAt: formatJwtNumericDate(payload.exp),
      issuedAt: formatJwtNumericDate(payload.iat),
      notBefore: formatJwtNumericDate(payload.nbf),
      warning: "Decoded only. Signature and claims are not verified.",
      error: "",
    };
  } catch (error: any) {
    return emptyJwtResult(error?.message ?? "Unable to decode JWT.");
  }
}

function emptyJwtResult(error: string): JwtDecodeResult {
  return {
    header: "",
    payload: "",
    signature: "",
    expiresAt: "",
    issuedAt: "",
    notBefore: "",
    warning: "Decoded only. Signature and claims are not verified.",
    error,
  };
}

export function formatJwtNumericDate(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }

  const date = new Date(value * 1000);
  const status = Date.now() > date.getTime() ? "expired" : "active";
  return `${date.toISOString()} (${status})`;
}

export function generateUuidV4() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  fillRandomBytes(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

export function generatePassword(options: {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
}) {
  const pools = [
    options.lowercase ? "abcdefghijklmnopqrstuvwxyz" : "",
    options.uppercase ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "",
    options.numbers ? "0123456789" : "",
    options.symbols ? "!@#$%^&*()-_=+[]{};:,.?/~" : "",
  ].filter(Boolean);

  if (pools.length === 0) {
    throw new Error("Select at least one character set.");
  }

  const length = Math.max(4, Math.min(256, Math.trunc(options.length)));
  const required = pools.map((pool) => pool[randomInt(pool.length)]);
  const all = pools.join("");

  while (required.length < length) {
    required.push(all[randomInt(all.length)]);
  }

  for (let i = required.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join("");
}

function fillRandomBytes(bytes: Uint8Array) {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
    return;
  }

  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
}

function randomInt(max: number) {
  const bytes = new Uint32Array(1);

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
    return bytes[0] % max;
  }

  return Math.floor(Math.random() * max);
}

export function parseTimestampInput(value: string) {
  const numeric = Number(value.trim());
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const milliseconds = Math.abs(numeric) < 100000000000 ? numeric * 1000 : numeric;
  return new Date(milliseconds);
}

export function formatDateInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function toDateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function zonedDateTimeToUtcMillis(value: string, timeZone: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second = "0"] = match;
  const localUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  let utcMillis = localUtc;

  for (let i = 0; i < 4; i += 1) {
    const offset = getTimeZoneOffsetMillis(new Date(utcMillis), timeZone);
    utcMillis = localUtc - offset;
  }

  return utcMillis;
}

function getTimeZoneOffsetMillis(date: Date, timeZone: string) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asUtc - date.getTime();
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

export function parseCronExpression(expression: string): CronParseResult {
  const parts = expression.trim().split(/\s+/).filter(Boolean);

  if (parts.length !== 5) {
    return {
      fields: null,
      explanation: [],
      error: "Use standard 5-field cron: minute hour day-of-month month day-of-week.",
    };
  }

  try {
    const fields = {
      minute: parseCronField(parts[0], 0, 59, "minute"),
      hour: parseCronField(parts[1], 0, 23, "hour"),
      dayOfMonth: parseCronField(parts[2], 1, 31, "day of month"),
      month: parseCronField(parts[3], 1, 12, "month", MONTH_NAMES),
      dayOfWeek: parseCronField(parts[4], 0, 6, "day of week", DAY_NAMES, true),
    };

    return {
      fields,
      explanation: [
        `Minute: ${fields.minute.description}`,
        `Hour: ${fields.hour.description}`,
        `Day of month: ${fields.dayOfMonth.description}`,
        `Month: ${fields.month.description}`,
        `Day of week: ${fields.dayOfWeek.description}`,
      ],
      error: "",
    };
  } catch (error: any) {
    return {
      fields: null,
      explanation: [],
      error: error?.message ?? "Invalid cron expression.",
    };
  }
}

function parseCronField(
  raw: string,
  min: number,
  max: number,
  label: string,
  names: Record<string, number> = {},
  normalizeSevenToZero = false,
): CronFieldResult {
  const values = new Set<number>();
  const totalValues = max - min + 1;
  const chunks = raw.toLowerCase().split(",");

  for (const chunk of chunks) {
    if (!chunk) {
      throw new Error(`Invalid ${label} field.`);
    }

    const [rangePart, stepPart, extra] = chunk.split("/");
    if (extra !== undefined) {
      throw new Error(`Invalid ${label} step syntax.`);
    }

    const step = stepPart === undefined ? 1 : Number(stepPart);
    if (!Number.isInteger(step) || step < 1) {
      throw new Error(`Invalid ${label} step.`);
    }

    let start = min;
    let end = max;

    if (rangePart !== "*" && rangePart !== "?") {
      const range = rangePart.split("-");

      if (range.length === 1) {
        start = parseCronValue(range[0], names, normalizeSevenToZero);
        end = start;
      } else if (range.length === 2) {
        start = parseCronValue(range[0], names, normalizeSevenToZero);
        end = parseCronValue(range[1], names, normalizeSevenToZero);
      } else {
        throw new Error(`Invalid ${label} range.`);
      }
    }

    if (start < min || start > max || end < min || end > max || start > end) {
      throw new Error(`Invalid ${label} value.`);
    }

    for (let value = start; value <= end; value += step) {
      values.add(value);
    }
  }

  return {
    raw,
    values,
    description: describeCronField(raw, values, totalValues, label, names),
    isWildcard: values.size === totalValues,
  };
}

function parseCronValue(
  value: string,
  names: Record<string, number>,
  normalizeSevenToZero: boolean,
) {
  const namedValue = names[value];
  const parsed = namedValue ?? Number(value);

  if (normalizeSevenToZero && parsed === 7) {
    return 0;
  }

  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid cron value: ${value}.`);
  }

  return parsed;
}

function describeCronField(
  raw: string,
  values: Set<number>,
  totalValues: number,
  label: string,
  names: Record<string, number>,
) {
  if (values.size === totalValues) {
    const step = raw.match(/^\*\/(\d+)$/)?.[1];
    return step ? `every ${step} ${label}s` : `every ${label}`;
  }

  const displayValues = Array.from(values)
    .sort((a, b) => a - b)
    .map((value) => {
      const name = Object.entries(names).find(([, namedValue]) => namedValue === value)?.[0];
      return name ? name.slice(0, 3) : String(value);
    });

  return `at ${displayValues.join(", ")}`;
}

export function getNextCronRuns(expression: string, count = 5) {
  const parsed = parseCronExpression(expression);
  if (!parsed.fields) {
    return { runs: [] as Date[], error: parsed.error, explanation: parsed.explanation };
  }

  const runs: Date[] = [];
  const cursor = new Date();
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const maxAttempts = 60 * 24 * 366 * 6;

  for (let attempt = 0; attempt < maxAttempts && runs.length < count; attempt += 1) {
    if (matchesCronDate(cursor, parsed.fields)) {
      runs.push(new Date(cursor));
    }

    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return {
    runs,
    error: runs.length ? "" : "No matching run time found within six years.",
    explanation: parsed.explanation,
  };
}

function matchesCronDate(date: Date, fields: NonNullable<CronParseResult["fields"]>) {
  if (!fields.minute.values.has(date.getMinutes())) return false;
  if (!fields.hour.values.has(date.getHours())) return false;
  if (!fields.month.values.has(date.getMonth() + 1)) return false;

  const dayOfMonthMatches = fields.dayOfMonth.values.has(date.getDate());
  const dayOfWeekMatches = fields.dayOfWeek.values.has(date.getDay());

  if (!fields.dayOfMonth.isWildcard && !fields.dayOfWeek.isWildcard) {
    return dayOfMonthMatches || dayOfWeekMatches;
  }

  return (
    (fields.dayOfMonth.isWildcard || dayOfMonthMatches) &&
    (fields.dayOfWeek.isWildcard || dayOfWeekMatches)
  );
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const DAY_NAMES: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export async function hashText(value: string, algorithm: HashAlgorithm) {
  if (algorithm === "MD5") {
    return md5(value);
  }

  const digest = await crypto.subtle.digest(algorithm, textEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function md5(value: string) {
  return md5Bytes(textEncoder().encode(value));
}

const MD5_SHIFT = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const MD5_TABLE = Array.from({ length: 64 }, (_, i) =>
  Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0,
);

function md5Bytes(input: Uint8Array) {
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(input);
  bytes[input.length] = 0x80;

  const bitLength = input.length * 8;
  const low = bitLength >>> 0;
  const high = Math.floor(bitLength / 0x100000000) >>> 0;

  for (let i = 0; i < 4; i += 1) {
    bytes[paddedLength - 8 + i] = (low >>> (8 * i)) & 0xff;
    bytes[paddedLength - 4 + i] = (high >>> (8 * i)) & 0xff;
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = new Array<number>(16);

    for (let i = 0; i < 16; i += 1) {
      const index = offset + i * 4;
      words[i] =
        bytes[index] |
        (bytes[index + 1] << 8) |
        (bytes[index + 2] << 16) |
        (bytes[index + 3] << 24);
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let i = 0; i < 64; i += 1) {
      let f = 0;
      let g = 0;

      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }

      const next = d;
      d = c;
      c = b;
      b = (b + rotateLeft((a + f + MD5_TABLE[i] + words[g]) >>> 0, MD5_SHIFT[i])) >>> 0;
      a = next;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  return [a0, b0, c0, d0].map(wordToLittleEndianHex).join("");
}

function rotateLeft(value: number, shift: number) {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function wordToLittleEndianHex(word: number) {
  return [0, 8, 16, 24]
    .map((shift) => ((word >>> shift) & 0xff).toString(16).padStart(2, "0"))
    .join("");
}
