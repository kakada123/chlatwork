import { extractSecurityLinks } from './security-links';
import {
  SECURITY_CATEGORIES,
  URL_THREAT_TYPES,
  type SecurityScanResult,
} from './security.types';
import type { TelegramMessage } from './telegram-bot.types';

export const OWNER_DETAILS_MAX_LENGTH = 3000;

function truncate(value: string, limit: number) {
  if (value.length <= limit) return value;
  // Do not leave an invalid UTF-16 surrogate at a Telegram/JSON boundary.
  return value.slice(0, limit - 1).replace(/[\uD800-\uDBFF]$/, '') + '…';
}

function printable(value: unknown) {
  return typeof value === 'string'
    ? value
        .slice(0, 4096)
        .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

function safeLink(value: string) {
  try {
    const url = new URL(
      /^(?:https?:)?\/\//i.test(value)
        ? value
        : /^[\w.-]+(?::\d+)?(?:\/|$)/.test(value)
          ? `https://${value}`
          : value,
    );
    if (!['https:', 'http:'].includes(url.protocol))
      return '[Unsupported link]';
    // Display a recognizable destination without credentials, query tokens, fragments or clickable links.
    const hidden = !!(url.username || url.password || url.search || url.hash);
    const display = `${url.protocol === 'https:' ? 'hxxps' : 'hxxp'}://${url.host.replace(/\./g, '[.]')}${url.pathname.replace(/\./g, '[.]')}`;
    return (
      truncate(display, 260) + (hidden ? ' [private URL fields hidden]' : '')
    );
  } catch {
    return '[Invalid link]';
  }
}

function field(value: unknown, limit: number) {
  // Sender names, filenames and disguised labels can themselves contain URLs.
  return truncate(
    printable(value).replace(/(?:https?:\/\/|www\.)[^\s<>]+/gi, safeLink),
    limit,
  );
}

function time(value: Date) {
  return Number.isFinite(value.getTime())
    ? new Date(value.getTime() + 7 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ') + ' UTC+07 (Phnom Penh)'
    : 'Unavailable';
}

function score(value: number) {
  return Number.isFinite(value)
    ? `${Math.max(0, Math.min(100, Math.round(value)))}/100`
    : 'Unavailable';
}

/** Owner-only, bounded metadata snapshot: no message body, attachment bytes or Telegram file token. */
export function buildSecurityOwnerDetails(
  message: TelegramMessage,
  result: SecurityScanResult,
  scannedAt = new Date(),
) {
  const sender = [
    field(message.from?.first_name, 80),
    field(message.from?.last_name, 80),
  ]
    .filter(Boolean)
    .join(' ');
  const username =
    typeof message.from?.username === 'string' &&
    /^[a-zA-Z0-9_]{1,32}$/.test(message.from.username)
      ? `@${message.from.username}`
      : '';
  const lines = [
    'Details / ព័ត៌មានលម្អិត',
    `Sender / អ្នកផ្ញើ: ${sender || 'Sender unavailable'}${username ? ` (${username})` : ''}`,
    `Sender ID: ${message.from?.id ?? 'Unavailable'} · Chat ID: ${message.chat.id}`,
    `Sent / ពេលផ្ញើ: ${time(new Date((message.date ?? NaN) * 1000))}`,
    `Scanned / ពេលស្កេន: ${time(scannedAt)}`,
    `Risk / កម្រិតហានិភ័យ: ${score(result.riskScore)} · Confidence: ${score(result.confidence)}`,
    `Categories: ${result.categories.filter((category) => SECURITY_CATEGORIES.includes(category)).join(', ') || 'None'}`,
  ];
  if (message.document) {
    lines.push(
      `File / ឯកសារ: ${field(message.document.file_name, 200) || 'Unnamed document'}`,
    );
    lines.push(
      `Type: ${field(message.document.mime_type, 80) || 'Not provided'}`,
    );
    const size = message.document.file_size;
    if (typeof size === 'number' && Number.isSafeInteger(size) && size >= 0) {
      lines.push(
        `Reported size: ${size} bytes${size >= 1024 ? ` (${(size / (size >= 1048576 ? 1048576 : 1024)).toFixed(1)} ${size >= 1048576 ? 'MiB' : 'KiB'})` : ''}`,
      );
    }
    lines.push(
      'File name/type/size are reported by Telegram, not proof of file contents.',
    );
  }
  lines.push(
    `File scan: ${result.fileScan?.status ?? 'Not performed'}${result.fileScan?.reason ? ` (${result.fileScan.reason})` : ''}`,
  );
  lines.push(
    `Link scan: ${result.urlScan?.status ?? 'Not performed'}${result.urlScan?.reason ? ` (${result.urlScan.reason})` : ''}${result.urlScan?.status === 'not_listed' ? ' (no reputation match; not proof of safety)' : ''}`,
  );
  const threats = result.urlScan?.threatTypes?.filter((type) =>
    URL_THREAT_TYPES.includes(type),
  );
  if (threats?.length) lines.push(`Link threats: ${threats.join(', ')}`);
  const links = extractSecurityLinks(message);
  const targets = links.filter(
    (link, index) =>
      links.findIndex((item) => item.target === link.target) === index,
  );
  if (targets.length) {
    lines.push(`Links / តំណ (${targets.length}; displayed safely):`);
    for (const [index, link] of targets.slice(0, 5).entries()) {
      const label = field(
        links.find((item) => item.target === link.target && item.label)?.label,
        60,
      );
      lines.push(
        `${index + 1}. ${safeLink(printable(link.target))}${label ? ` · Label: ${label}` : ''}`,
      );
    }
    if (targets.length > 5)
      lines.push(`… ${targets.length - 5} more link(s) omitted.`);
    lines.push(
      'A message-level finding may not identify which individual link triggered it.',
    );
  }
  return truncate(lines.join('\n'), OWNER_DETAILS_MAX_LENGTH);
}
