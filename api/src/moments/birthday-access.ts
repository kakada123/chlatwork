import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export interface BirthdayUnlock {
  day: number;
  month: number;
}
export interface BirthdayAccess extends BirthdayUnlock {
  secret: string;
}
export type BirthdayAccessState =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'configured'; access: BirthdayAccess };
interface HeroBlock {
  type: string;
  data: unknown;
}
export const BIRTHDAY_ACCESS_MAX_AGE = 3600;

export function birthdayUnlockAttemptTracker(request: {
  ip?: unknown;
  params?: { slug?: unknown };
}): string {
  // Nuxt shares an egress IP, so a challenge attempt budget must also be scoped to its individual card.
  const ip = typeof request.ip === 'string' ? request.ip : 'unknown';
  const slug =
    typeof request.params?.slug === 'string' ? request.params.slug : 'unknown';
  return createHash('sha256')
    .update(JSON.stringify([ip, slug]))
    .digest('hex');
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readBirthdayUnlock(value: unknown): BirthdayUnlock | null {
  if (!record(value) || Object.keys(value).length !== 2) return null;
  const { day, month } = value;
  if (
    typeof day !== 'number' ||
    typeof month !== 'number' ||
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12
  )
    return null;
  // A fixed leap year validates DD/MM while allowing February 29 without collecting a birth year.
  const date = new Date(Date.UTC(2024, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? { day, month }
    : null;
}

export function createBirthdayAccess(value: BirthdayUnlock): BirthdayAccess {
  return { ...value, secret: randomBytes(32).toString('hex') };
}

export function readBirthdayAccessState(
  blocks: readonly HeroBlock[] = [],
): BirthdayAccessState {
  const configured = blocks.filter(
    (block) =>
      record(block.data) && Object.hasOwn(block.data, 'birthdayAccess'),
  );
  if (!configured.length) return { kind: 'none' };
  if (configured.length !== 1 || configured[0].type !== 'HERO')
    return { kind: 'invalid' };
  const value = (configured[0].data as Record<string, unknown>).birthdayAccess;
  if (
    !record(value) ||
    Object.keys(value).length !== 3 ||
    typeof value.secret !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.secret)
  )
    return { kind: 'invalid' };
  const date = readBirthdayUnlock({ day: value.day, month: value.month });
  return date
    ? { kind: 'configured', access: { ...date, secret: value.secret } }
    : { kind: 'invalid' };
}

export function stripBirthdayAccess<T>(data: T): T {
  if (!record(data) || !Object.hasOwn(data, 'birthdayAccess')) return data;
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => key !== 'birthdayAccess'),
  ) as T;
}

export function resolveBirthdayAccessEdit(
  blocks: readonly HeroBlock[],
  change: BirthdayUnlock | null | undefined,
): BirthdayAccess | { invalid: true } | undefined {
  if (change === null) return undefined;
  const previous = readBirthdayAccessState(blocks);
  if (change === undefined) {
    // Preserve protection even for corrupt settings until the owner explicitly repairs or removes it.
    return previous.kind === 'configured'
      ? previous.access
      : previous.kind === 'invalid'
        ? { invalid: true }
        : undefined;
  }
  if (
    previous.kind === 'configured' &&
    previous.access.day === change.day &&
    previous.access.month === change.month
  )
    return previous.access;
  return createBirthdayAccess(change);
}

function signature(
  momentId: string,
  expiry: number,
  access: BirthdayAccess,
): string {
  return createHmac('sha256', Buffer.from(access.secret, 'hex'))
    .update(`moment-birthday-access:v1:${momentId}:${expiry}`)
    .digest('base64url');
}

export function issueBirthdayAccessToken(
  momentId: string,
  access: BirthdayAccess,
  nowMs = Date.now(),
): string {
  const expiry = Math.floor(nowMs / 1000) + BIRTHDAY_ACCESS_MAX_AGE;
  return `v1.${expiry}.${signature(momentId, expiry, access)}`;
}

export function verifyBirthdayAccessToken(
  token: unknown,
  momentId: string,
  access: BirthdayAccess,
  nowMs = Date.now(),
): boolean {
  if (typeof token !== 'string' || token.length > 64) return false;
  const match = /^v1\.([1-9]\d{0,11})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return false;
  const expiry = Number(match[1]);
  const now = Math.floor(nowMs / 1000);
  if (
    !Number.isSafeInteger(expiry) ||
    expiry <= now ||
    expiry > now + BIRTHDAY_ACCESS_MAX_AGE
  )
    return false;
  return timingSafeEqual(
    Buffer.from(match[2], 'ascii'),
    Buffer.from(signature(momentId, expiry, access), 'ascii'),
  );
}

export function birthdayDateMatches(
  expected: BirthdayUnlock,
  supplied: BirthdayUnlock,
): boolean {
  const text = (date: BirthdayUnlock) =>
    `${String(date.day).padStart(2, '0')}${String(date.month).padStart(2, '0')}`;
  return timingSafeEqual(
    Buffer.from(text(expected)),
    Buffer.from(text(supplied)),
  );
}
