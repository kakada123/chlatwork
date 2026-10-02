import { BadRequestException } from '@nestjs/common';
import { isIP } from 'node:net';

const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'account',
  'auth',
  'chlatwork',
  'creator',
  'help',
  'link',
  'login',
  'logout',
  'me',
  'profiles',
  'public',
  'settings',
  'support',
  'tools',
  'www',
]);

export function normalizeProfileSlug(value: string) {
  const slug = value.trim().toLowerCase();
  if (
    !/^[a-z0-9][a-z0-9_-]{1,38}[a-z0-9]$/.test(slug) ||
    RESERVED_SLUGS.has(slug)
  ) {
    throw new BadRequestException(
      'Use 3–40 letters, numbers, hyphens, or underscores. This username may be reserved.',
    );
  }
  return slug;
}

export function normalizeLinkUrl(value: string) {
  // Reject control characters before URL parsing, which otherwise silently removes them.
  if (/[\u0000-\u0020\u007f]/.test(value) || value.length > 2048) {
    throw new BadRequestException(
      'Use a valid link without spaces or control characters.',
    );
  }
  if (/^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+$/i.test(value)) return value;
  if (/^tel:\+?[0-9().-]{3,30}$/i.test(value)) return value;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BadRequestException(
      'Use a full http:// or https:// link, email (mailto:), or phone (tel:).',
    );
  }
  const host = parsed.hostname.toLowerCase();
  if (
    !['https:', 'http:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    isIP(host) ||
    host.includes(':') ||
    !host.includes('.') ||
    /(^|\.)(localhost|local|internal)$/.test(host)
  ) {
    throw new BadRequestException(
      'Use a public web address without embedded credentials.',
    );
  }
  return parsed.href;
}

export function normalizeImageUrl(value: string) {
  if (!value) return null;
  const url = normalizeLinkUrl(value);
  if (!url.startsWith('https://'))
    throw new BadRequestException('Image URLs must use HTTPS.');
  return url;
}

export function detectLinkType(value: string) {
  if (/^mailto:/i.test(value)) return 'email';
  if (/^tel:/i.test(value)) return 'phone';
  const host = new URL(value).hostname.toLowerCase();
  const platforms: Record<string, string[]> = {
    instagram: ['instagram.com'],
    facebook: ['facebook.com', 'fb.com'],
    linkedin: ['linkedin.com'],
    tiktok: ['tiktok.com'],
    youtube: ['youtube.com', 'youtu.be'],
    telegram: ['t.me', 'telegram.me'],
    github: ['github.com'],
    x: ['x.com', 'twitter.com'],
    discord: ['discord.com', 'discord.gg'],
    whatsapp: ['wa.me', 'whatsapp.com'],
  };
  return (
    Object.entries(platforms).find(([, hosts]) =>
      hosts.some((domain) => host === domain || host.endsWith(`.${domain}`)),
    )?.[0] ?? 'custom'
  );
}

export function validateReorder(existing: string[], requested: string[]) {
  if (
    existing.length !== requested.length ||
    new Set(requested).size !== requested.length ||
    requested.some((id) => !existing.includes(id))
  ) {
    throw new BadRequestException('Include each of your links exactly once.');
  }
}
