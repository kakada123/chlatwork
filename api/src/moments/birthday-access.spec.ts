import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { createHmac } from 'node:crypto';
import {
  THROTTLER_LIMIT,
  THROTTLER_TTL,
  THROTTLER_TRACKER,
} from '@nestjs/throttler/dist/throttler.constants';
import { MomentsService } from './moments.service';
import { MomentsController } from './moments.controller';
import {
  createBirthdayAccess,
  issueBirthdayAccessToken,
  readBirthdayUnlock,
  readBirthdayAccessState,
  resolveBirthdayAccessEdit,
  stripBirthdayAccess,
  verifyBirthdayAccessToken,
} from './birthday-access';

const ID = '00000000-0000-4000-8000-000000000001';
const NOW = Date.parse('2026-11-03T04:00:00.000Z');
const access = { day: 29, month: 2, secret: 'a'.repeat(64) };
const clip = { trackId: 'hbd-001', startMs: 0, endMs: 1000 };
const hero = (birthdayAccess: unknown = access) => ({
  id: 'hero',
  type: 'HERO',
  position: 0,
  data: { title: 'Private title', birthdayAccess, birthdayAudio: clip },
});
function fixture(change: object = {}) {
  const moment = {
    id: ID,
    slug: 'birthday-card',
    status: 'PUBLISHED',
    groupWorkspaceId: null,
    occasion: 'BIRTHDAY',
    recipientName: 'Sophea',
    title: 'Private title',
    theme: 'ROMANTIC',
    publishAt: null,
    expiresAt: null,
    blocks: [
      hero(),
      {
        id: 'message',
        type: 'MESSAGE',
        position: 1,
        data: { message: 'Private message' },
      },
      {
        id: 'secret',
        type: 'SECRET',
        position: 2,
        data: { message: 'Private surprise' },
      },
    ],
    media: [{ id: 'photo', position: 0 }],
    ...change,
  };
  const prisma = {
    moment: { findUnique: jest.fn().mockResolvedValue(moment) },
    momentMedia: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'photo',
        content: Buffer.from('RIFF0000WEBPdata'),
        mimeType: 'image/webp',
        moment,
      }),
    },
  };
  return { service: new MomentsService(prisma as never), prisma, moment };
}

describe('birthday date and private access helpers', () => {
  it.each([
    { day: 1, month: 1 },
    { day: 29, month: 2 },
    { day: 31, month: 12 },
  ])('accepts a real day/month without collecting a year: %o', (value) => {
    expect(readBirthdayUnlock(value)).toEqual(value);
  });
  it.each([
    null,
    [],
    {},
    { day: 0, month: 1 },
    { day: 32, month: 1 },
    { day: 31, month: 4 },
    { day: 30, month: 2 },
    { day: 1.2, month: 1 },
    { day: '1', month: 1 },
    { day: 1, month: 13 },
    { day: 1, month: 1, year: 2026 },
    { day: 1, month: 1, secret: 'chosen-key' },
  ])('rejects invalid or over-specified birthday input: %o', (value) => {
    expect(readBirthdayUnlock(value)).toBeNull();
  });
  it('generates a random private key and distinguishes absent from corrupt stored access', () => {
    const first = createBirthdayAccess({ day: 29, month: 2 });
    const second = createBirthdayAccess({ day: 29, month: 2 });
    expect(first.secret).toMatch(/^[a-f0-9]{64}$/);
    expect(second.secret).not.toBe(first.secret);
    expect(readBirthdayAccessState([])).toEqual({ kind: 'none' });
    expect(readBirthdayAccessState([hero(null)])).toEqual({ kind: 'invalid' });
    expect(readBirthdayAccessState([hero()])).toEqual({
      kind: 'configured',
      access,
    });
    expect(readBirthdayAccessState([hero(), hero()])).toEqual({
      kind: 'invalid',
    });
  });
  it('preserves unchanged dates, rotates changed dates, and makes removal explicit', () => {
    expect(resolveBirthdayAccessEdit([hero()], undefined)).toEqual(access);
    expect(resolveBirthdayAccessEdit([hero()], { day: 29, month: 2 })).toEqual(
      access,
    );
    const changed = resolveBirthdayAccessEdit([hero()], { day: 3, month: 11 })!;
    expect(changed).toEqual(expect.objectContaining({ day: 3, month: 11 }));
    expect((changed as typeof access).secret).not.toBe(access.secret);
    expect(resolveBirthdayAccessEdit([hero()], null)).toBeUndefined();
    expect(resolveBirthdayAccessEdit([hero(null)], undefined)).toEqual({
      invalid: true,
    });
  });
  it('removes private data without mutating stored blocks', () => {
    const data = hero().data;
    expect(stripBirthdayAccess(data)).toEqual({
      title: 'Private title',
      birthdayAudio: clip,
    });
    expect(data.birthdayAccess).toEqual(access);
  });
});

describe('birthday unlock capabilities', () => {
  it('binds a one-hour capability to the moment and the current private key', () => {
    const token = issueBirthdayAccessToken(ID, access, NOW);
    expect(verifyBirthdayAccessToken(token, ID, access, NOW)).toBe(true);
    expect(
      verifyBirthdayAccessToken(token, 'another-moment', access, NOW),
    ).toBe(false);
    expect(
      verifyBirthdayAccessToken(
        token,
        ID,
        { ...access, secret: 'b'.repeat(64) },
        NOW,
      ),
    ).toBe(false);
    expect(verifyBirthdayAccessToken(token, ID, access, NOW + 3_600_000)).toBe(
      false,
    );
    expect(verifyBirthdayAccessToken(token + 'x', ID, access, NOW)).toBe(false);
  });
  it.each([
    undefined,
    '',
    'v1.0.bad',
    'x'.repeat(1000),
    'v1.999999999999.zzzz',
  ])('rejects malformed tokens safely: %s', (value) => {
    expect(verifyBirthdayAccessToken(value, ID, access, NOW)).toBe(false);
  });
  it('rejects otherwise signed capabilities beyond the maximum expiry bound', () => {
    const expiry = Math.floor(NOW / 1000) + 3601;
    const signature = createHmac('sha256', Buffer.from(access.secret, 'hex'))
      .update(`moment-birthday-access:v1:${ID}:${expiry}`)
      .digest('base64url');
    expect(
      verifyBirthdayAccessToken(`v1.${expiry}.${signature}`, ID, access, NOW),
    ).toBe(false);
  });
});

describe('birthday public privacy boundary', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it('returns only the birthday challenge and safe library audio before unlock', async () => {
    const { service } = fixture();
    expect(await service.getPublic('birthday-card')).toEqual({
      status: 'birthday-locked',
      slug: 'birthday-card',
      recipientName: 'Sophea',
      theme: 'ROMANTIC',
      birthdayAudio: clip,
    });
  });
  it('unlocks a matching birthday and strips private access even from ready output', async () => {
    const { service } = fixture();
    const { token, maxAge } = await service.unlockBirthday('birthday-card', {
      day: 29,
      month: 2,
    });
    expect(maxAge).toBe(3600);
    const result = await service.getPublic('birthday-card', token);
    expect(result.status).toBe('ready');
    expect(JSON.stringify(result)).not.toContain('birthdayAccess');
    expect(JSON.stringify(result)).not.toContain(access.secret);
    expect(JSON.stringify(result)).toContain('Private message');
  });
  it('does not reveal which date field is wrong', async () => {
    const { service } = fixture();
    await expect(
      service.unlockBirthday('birthday-card', { day: 28, month: 2 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.unlockBirthday('birthday-card', { day: 30, month: 2 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect((await service.getPublic('birthday-card', 'forged')).status).toBe(
      'birthday-locked',
    );
  });
  it('keeps a scheduled lock ahead of the birthday challenge and capability', async () => {
    const f = fixture({ publishAt: new Date(NOW + 60_000) });
    const token = issueBirthdayAccessToken(ID, access, NOW);
    expect(await f.service.getPublic('birthday-card', token)).toEqual({
      status: 'locked',
      recipientName: 'Sophea',
      unlockAt: new Date(NOW + 60_000).toISOString(),
    });
    await expect(
      f.service.unlockBirthday('birthday-card', { day: 29, month: 2 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      f.service.getPublicMedia('birthday-card', 'photo', false, token),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it.each([
    { status: 'DRAFT' },
    { groupWorkspaceId: 'private-group' },
    { expiresAt: new Date(NOW - 1) },
  ])(
    'preserves publication, group and expiry boundaries: %o',
    async (change) => {
      const { service } = fixture(change);
      const error = 'expiresAt' in change ? GoneException : NotFoundException;
      await expect(service.getPublic('birthday-card')).rejects.toBeInstanceOf(
        error,
      );
      await expect(
        service.unlockBirthday('birthday-card', { day: 29, month: 2 }),
      ).rejects.toBeInstanceOf(error);
      await expect(
        service.getPublicMedia('birthday-card', 'photo'),
      ).rejects.toBeInstanceOf(error);
    },
  );
  it('requires a valid capability before returning protected media bytes', async () => {
    const f = fixture();
    await expect(
      f.service.getPublicMedia('birthday-card', 'photo'),
    ).rejects.toBeInstanceOf(NotFoundException);
    const token = issueBirthdayAccessToken(ID, access, NOW);
    expect(
      await f.service.getPublicMedia('birthday-card', 'photo', false, token),
    ).toEqual(
      expect.objectContaining({
        mimeType: 'image/webp',
        birthdayProtected: true,
      }),
    );
    expect(f.prisma.momentMedia.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          moment: {
            include: { blocks: { select: { type: true, data: true } } },
          },
        },
      }),
    );
  });
  it.each([null, {}, { ...access, secret: 'invalid' }, { ...access, day: 32 }])(
    'fails closed for corrupt stored access: %o',
    async (value) => {
      const { service } = fixture({ blocks: [hero(value)] });
      expect((await service.getPublic('birthday-card')).status).toBe(
        'birthday-locked',
      );
      await expect(
        service.unlockBirthday('birthday-card', { day: 29, month: 2 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.getPublicMedia('birthday-card', 'photo'),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );
  it('keeps existing ungated Moments unchanged', async () => {
    const { service } = fixture({
      blocks: [{ ...hero(), data: { title: 'Ordinary birthday' } }],
    });
    expect((await service.getPublic('birthday-card')).status).toBe('ready');
    expect(
      (await service.getPublicMedia('birthday-card', 'photo'))
        .birthdayProtected,
    ).toBe(false);
  });
  it('validates birthday-only create settings and stores only server-generated private keys', async () => {
    const prisma = {
      moment: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: ID, slug: 'created' }),
      },
    };
    const service = new MomentsService(prisma as never);
    const dto = {
      recipientName: 'Sophea',
      title: 'Birthday',
      message: 'A message',
      secretMessage: '',
      occasion: 'BIRTHDAY',
      theme: 'ROMANTIC',
      birthdayUnlock: { day: 29, month: 2 },
    };
    await service.create('owner', dto as never);
    expect(
      prisma.moment.create.mock.calls[0][0].data.blocks.create[0].data
        .birthdayAccess,
    ).toEqual(
      expect.objectContaining({
        day: 29,
        month: 2,
        secret: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    await expect(
      service.create('owner', { ...dto, occasion: 'LOVE' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create('owner', {
        ...dto,
        birthdayUnlock: { day: 31, month: 4 },
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('birthday gate defensive integration', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());
  it('treats misplaced private settings as corrupt and blocks content, media, and token issuance', async () => {
    const f = fixture({ blocks: [{ ...hero(), type: 'MESSAGE' }] });
    expect((await f.service.getPublic('birthday-card')).status).toBe(
      'birthday-locked',
    );
    await expect(
      f.service.getPublicMedia('birthday-card', 'photo'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      f.service.unlockBirthday('birthday-card', { day: 29, month: 2 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rejects expired capabilities at both content and media boundaries', async () => {
    const f = fixture();
    const { token } = await f.service.unlockBirthday('birthday-card', {
      day: 29,
      month: 2,
    });
    jest.setSystemTime(NOW + 3_600_000);
    expect((await f.service.getPublic('birthday-card', token)).status).toBe(
      'birthday-locked',
    );
    await expect(
      f.service.getPublicMedia('birthday-card', 'photo', false, token),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('omits invalid audio metadata from the locked response', async () => {
    const block = hero();
    const f = fixture({
      blocks: [
        {
          ...block,
          data: {
            ...block.data,
            birthdayAudio: {
              trackId: 'untrusted-file',
              startMs: 0,
              endMs: 1000,
            },
          },
        },
      ],
    });
    expect(await f.service.getPublic('birthday-card')).not.toHaveProperty(
      'birthdayAudio',
    );
  });
  it.each([undefined, '', 'stale-token'])(
    'uses no-store whenever a capability header is present: %s',
    async (header) => {
      const moments = {
        getPublicMedia: jest.fn().mockResolvedValue({
          content: Buffer.from('photo'),
          mimeType: 'image/webp',
          birthdayProtected: false,
        }),
      };
      const controller = new MomentsController(
        moments as never,
        null as never,
        null as never,
        null as never,
      );
      const response = { setHeader: jest.fn() };
      await controller.getMedia(
        'birthday',
        'photo',
        undefined,
        response as never,
        header,
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        header === undefined ? 'private, max-age=86400' : 'private, no-store',
      );
    },
  );
});

describe('birthday challenge attempt rate limiting', () => {
  it('allows ten attempts per fifteen minutes for a single card and client IP', () => {
    const handler = MomentsController.prototype.unlockBirthday;
    expect(Reflect.getMetadata(`${THROTTLER_LIMIT}default`, handler)).toBe(10);
    expect(Reflect.getMetadata(`${THROTTLER_TTL}default`, handler)).toBe(
      900_000,
    );
    const tracker = Reflect.getMetadata(
      `${THROTTLER_TRACKER}default`,
      handler,
    ) as (request: unknown) => string;
    const first = tracker({ ip: '192.0.2.1', params: { slug: 'birthday-a' } });
    expect(tracker({ ip: '192.0.2.1', params: { slug: 'birthday-a' } })).toBe(
      first,
    );
    expect(
      tracker({ ip: '192.0.2.1', params: { slug: 'birthday-b' } }),
    ).not.toBe(first);
    expect(
      tracker({ ip: '192.0.2.2', params: { slug: 'birthday-a' } }),
    ).not.toBe(first);
    expect(first).not.toContain('192.0.2.1');
    expect(first).not.toContain('birthday-a');
  });
});
