import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  HEADERS_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import {
  THROTTLER_LIMIT,
  THROTTLER_TTL,
  THROTTLER_SKIP,
} from '@nestjs/throttler/dist/throttler.constants';
import { createCanvas } from '@napi-rs/canvas';
import {
  MomentBlockType,
  MomentOccasion,
  MomentStatus,
  MomentTheme,
} from '@prisma/client';
import { BirthdayMomentEditorService } from './birthday-moment-editor.service';
import type { MomentUpload } from './moments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MomentsController } from './moments.controller';

const ID = '00000000-0000-4000-8000-000000000001';
const USER = '00000000-0000-4000-8000-000000000002';
const PHOTO_A = '00000000-0000-4000-8000-000000000003';
const PHOTO_B = '00000000-0000-4000-8000-000000000004';
const PHOTO_NEW = '00000000-0000-4000-8000-000000000005';
const story = {
  version: 1,
  enabled: true,
  theme: 'LUXURY_GOLD',
  scenes: ['gift', 'cake', 'memories', 'message', 'secret', 'celebration'],
  teaser: 'A surprise',
  cake: { design: 'CLASSIC', candles: 4 },
  memories: [
    { caption: 'First', date: '' },
    { caption: 'Second', date: '' },
  ],
  allowReplay: true,
  allowReactions: true,
};
const draft = {
  recipientName: 'Sophea',
  occasion: 'BIRTHDAY',
  title: 'A golden birthday',
  message: 'Enjoy your special day!',
  secretMessage: '',
  theme: 'ELEGANT',
  birthdayStory: story,
  birthdayAudio: { trackId: 'hbd-001', startMs: 0, endMs: 1000 },
  specialDate: '2026-11-03',
};
const payload = (
  moment: object = draft,
  photoOrder: string[] = [PHOTO_B, PHOTO_A],
) => JSON.stringify({ moment, photoOrder });
function savedMoment(change: object = {}) {
  return {
    id: ID,
    creatorId: USER,
    groupWorkspaceId: null,
    slug: 'stable-link',
    status: MomentStatus.PUBLISHED,
    occasion: MomentOccasion.BIRTHDAY,
    recipientName: 'Before',
    title: 'Before',
    theme: MomentTheme.ROMANTIC,
    publishAt: null,
    expiresAt: new Date('2099-12-31T00:00:00Z'),
    publishedAt: new Date('2026-01-01T00:00:00Z'),
    blocks: [
      MomentBlockType.HERO,
      MomentBlockType.MESSAGE,
      MomentBlockType.GALLERY,
      MomentBlockType.SECRET,
    ].map((type, position) => ({
      id: `block-${type}`,
      type,
      position,
      data: type === 'HERO' ? { title: 'Before' } : {},
    })),
    media: [
      { id: PHOTO_A, position: 0 },
      { id: PHOTO_B, position: 1 },
    ],
    ...change,
  };
}
function fixture(change: object = {}) {
  const moment = savedMoment(change);
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: ID }]),
    moment: {
      findFirst: jest.fn().mockResolvedValue(moment),
      update: jest.fn().mockResolvedValue({
        id: ID,
        slug: moment.slug,
        status: moment.status,
      }),
    },
    momentBlock: {
      deleteMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'new-counter' }),
    },
    momentMedia: {
      deleteMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: PHOTO_NEW }),
    },
  };
  const prisma = {
    moment: { findFirst: jest.fn().mockResolvedValue(moment) },
    momentMedia: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(),
  };
  let committed = false;
  prisma.$transaction.mockImplementation(async (work) => {
    const result = await work(tx);
    committed = true;
    return result;
  });
  return {
    service: new BirthdayMomentEditorService(prisma as never),
    prisma,
    tx,
    moment,
    committed: () => committed,
  };
}
async function png(): Promise<MomentUpload> {
  const canvas = createCanvas(2, 2);
  canvas.getContext('2d').fillRect(0, 0, 2, 2);
  const buffer = await canvas.encode('png');
  return {
    buffer,
    size: buffer.length,
    mimetype: 'image/png',
    originalname: '../memory.png',
  };
}

describe('birthday owner editor reads', () => {
  it('returns owner-private editor metadata without storage content or identity fields', async () => {
    const f = fixture();
    const result = await f.service.get(USER, ID);
    expect(result).toEqual({
      id: ID,
      slug: 'stable-link',
      status: 'PUBLISHED',
      recipientName: 'Before',
      occasion: 'BIRTHDAY',
      title: 'Before',
      theme: 'ROMANTIC',
      publishAt: null,
      expiresAt: '2099-12-31T00:00:00.000Z',
      blocks: f.moment.blocks,
      media: [
        {
          id: PHOTO_A,
          position: 0,
          url: `/api/moments/${ID}/edit/media/${PHOTO_A}`,
        },
        {
          id: PHOTO_B,
          position: 1,
          url: `/api/moments/${ID}/edit/media/${PHOTO_B}`,
        },
      ],
    });
    expect(f.prisma.moment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: ID,
          creatorId: USER,
          groupWorkspaceId: null,
          occasion: 'BIRTHDAY',
        },
      }),
    );
  });
  it.each([
    { creatorId: 'another-user' },
    { groupWorkspaceId: 'group-id' },
    { occasion: MomentOccasion.LOVE },
  ])('conceals inaccessible moments: %o', async (change) => {
    const f = fixture(change);
    await expect(f.service.get(USER, ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      f.service.update(USER, ID, payload(), []),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });
  it('serves only WebP bytes selected through the owner-private relation', async () => {
    const f = fixture();
    const content = Buffer.from('RIFF0000WEBPdata');
    f.prisma.momentMedia.findFirst.mockResolvedValue({
      content,
      mimeType: 'image/webp',
    } as never);
    expect(await f.service.getMedia(USER, ID, PHOTO_A)).toEqual(content);
    expect(f.prisma.momentMedia.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: PHOTO_A,
          moment: {
            id: ID,
            creatorId: USER,
            groupWorkspaceId: null,
            occasion: 'BIRTHDAY',
          },
        },
      }),
    );
  });
});

describe('birthday atomic edit validation', () => {
  it.each([
    ['invalid JSON', '{broken'],
    [
      'unknown envelope',
      JSON.stringify({ moment: draft, photoOrder: [], extra: true }),
    ],
    ['non-birthday', payload({ ...draft, occasion: 'LOVE' })],
    ['unknown DTO field', payload({ ...draft, creatorId: USER })],
    ['blank text', payload({ ...draft, message: '   ' })],
    [
      'invalid audio clip',
      payload({
        ...draft,
        birthdayAudio: { trackId: 'hbd-001', startMs: 0, endMs: 999999 },
      }),
    ],
    [
      'invalid story',
      payload({ ...draft, birthdayStory: { ...story, theme: 'BAD' } }),
    ],
    ['invalid calendar date', payload({ ...draft, specialDate: '2026-02-30' })],
    ['unsafe URL', payload({ ...draft, mapUrl: 'javascript:alert(1)' })],
    ['duplicate photos', payload(draft, [PHOTO_A, PHOTO_A])],
    ['unknown photo', payload(draft, ['00000000-0000-4000-8000-000000000099'])],
    ['invalid photo protocol', payload(draft, ['https://private/photo'])],
    ['missing new upload', payload(draft, ['new:0'])],
    ['invalid upload index', payload(draft, ['new:01'])],
    ['oversized payload', 'x'.repeat(80001)],
  ])('rejects %s before any mutation', async (_label, body) => {
    const f = fixture();
    await expect(f.service.update(USER, ID, body, [])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
    expect(f.tx.moment.update).not.toHaveBeenCalled();
  });
  it('rejects unreferenced uploads and mismatched content types before writing', async () => {
    for (const [order, file] of [
      [[], await png()],
      [['new:0'], { ...(await png()), mimetype: 'image/jpeg' }],
    ] as const) {
      const f = fixture();
      await expect(
        f.service.update(USER, ID, payload(draft, [...order]), [file]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(f.prisma.$transaction).not.toHaveBeenCalled();
    }
  });
  it('rejects aggregate uploads above the BFF-safe budget with safe 413 before decoding', async () => {
    const f = fixture();
    const file = {
      buffer: Buffer.alloc(4_000_000),
      size: 4_000_000,
      mimetype: 'image/png',
      originalname: 'photo.png',
    };
    await expect(
      f.service.update(USER, ID, payload(draft, ['new:0']), [file]),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(f.prisma.moment.findFirst).not.toHaveBeenCalled();
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });
  it('rejects corrupt WebP signatures despite a matching MIME declaration', async () => {
    const f = fixture();
    const buffer = Buffer.from('RIFF0000WEBPnot-an-image');
    await expect(
      f.service.update(USER, ID, payload(draft, ['new:0']), [
        {
          buffer,
          size: buffer.length,
          mimetype: 'image/webp',
          originalname: 'broken.webp',
        },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });
  it('accepts a genuine WebP image and retains its normalized bytes', async () => {
    const f = fixture();
    const canvas = createCanvas(2, 2);
    const buffer = await canvas.encode('webp', 82);
    await f.service.update(USER, ID, payload(draft, ['new:0']), [
      {
        buffer,
        size: buffer.length,
        mimetype: 'image/webp',
        originalname: 'memory.webp',
      },
    ]);
    expect(
      Buffer.from(f.tx.momentMedia.create.mock.calls[0][0].data.content).equals(
        buffer,
      ),
    ).toBe(true);
  });
});

describe('birthday editor persistence', () => {
  it('locks, rechecks ownership and atomically preserves identity/status while editing blocks and reordered media', async () => {
    const f = fixture();
    await expect(
      f.service.update(USER, ID, payload(draft, [PHOTO_B, 'new:0']), [
        await png(),
      ]),
    ).resolves.toEqual({ id: ID, slug: 'stable-link', status: 'PUBLISHED' });
    expect(f.tx.$queryRaw).toHaveBeenCalled();
    expect(f.tx.$queryRaw.mock.calls[0][0].join('?')).toMatch(
      /creator_id.*occasion.*group_workspace_id.*FOR UPDATE/s,
    );
    expect(f.tx.moment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: ID,
          creatorId: USER,
          groupWorkspaceId: null,
          occasion: 'BIRTHDAY',
        },
      }),
    );
    const update = f.tx.moment.update.mock.calls[0][0];
    expect(update).toEqual({
      where: { id: ID },
      data: {
        recipientName: 'Sophea',
        title: 'A golden birthday',
        theme: 'ELEGANT',
      },
      select: { id: true, slug: true, status: true },
    });
    expect(f.tx.momentMedia.deleteMany).toHaveBeenCalledWith({
      where: { momentId: ID, id: { notIn: [PHOTO_B] } },
    });
    expect(f.tx.momentMedia.update).toHaveBeenCalledWith({
      where: { id: PHOTO_B },
      data: { position: 0 },
    });
    const created = f.tx.momentMedia.create.mock.calls[0][0].data;
    expect(created).toEqual(
      expect.objectContaining({
        momentId: ID,
        position: 1,
        mimeType: 'image/webp',
        originalName: 'memory.webp',
      }),
    );
    expect(Buffer.from(created.content).toString('ascii', 8, 12)).toBe('WEBP');
    expect(created.byteSize).toBe(created.content.length);
    expect(f.tx.momentBlock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'block-HERO' },
        data: expect.objectContaining({
          position: 0,
          data: expect.objectContaining({
            title: draft.title,
            birthdayAudio: draft.birthdayAudio,
            birthdayStory: story,
          }),
        }),
      }),
    );
    expect(f.committed()).toBe(true);
  });
  it('rechecks access under the row lock before any write', async () => {
    const f = fixture();
    f.tx.$queryRaw.mockResolvedValue([]);
    await expect(
      f.service.update(USER, ID, payload(), []),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(f.tx.momentBlock.deleteMany).not.toHaveBeenCalled();
    expect(f.committed()).toBe(false);
  });
  it('revalidates media ownership against the locked snapshot', async () => {
    const f = fixture();
    f.tx.moment.findFirst.mockResolvedValue({ ...f.moment, media: [] });
    await expect(
      f.service.update(USER, ID, payload(), []),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(f.tx.momentMedia.deleteMany).not.toHaveBeenCalled();
    expect(f.tx.momentBlock.deleteMany).not.toHaveBeenCalled();
  });
  it('does not commit partial edits when a media write fails', async () => {
    const f = fixture();
    f.tx.momentMedia.create.mockRejectedValue(
      new Error('write failed') as never,
    );
    await expect(
      f.service.update(USER, ID, payload(draft, ['new:0']), [await png()]),
    ).rejects.toThrow();
    expect(f.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(f.committed()).toBe(false);
  });
  it('clears explicit null dates, validates schedule order, and keeps omitted dates unchanged', async () => {
    const f = fixture();
    await f.service.update(
      USER,
      ID,
      payload({ ...draft, publishAt: null, expiresAt: null }),
      [],
    );
    expect(f.tx.moment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ publishAt: null, expiresAt: null }),
      }),
    );
    const invalid = fixture();
    await expect(
      invalid.service.update(
        USER,
        ID,
        payload({
          ...draft,
          publishAt: '2099-12-31T00:00:00Z',
          expiresAt: '2099-01-01T00:00:00Z',
        }),
        [],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(invalid.tx.moment.update).not.toHaveBeenCalled();
  });
  it('keeps drafts as drafts and disallows published simple mode without any photos', async () => {
    const f = fixture({ status: MomentStatus.DRAFT });
    await f.service.update(
      USER,
      ID,
      payload({ ...draft, birthdayStory: undefined }, []),
      [],
    );
    expect(f.tx.moment.update.mock.calls[0][0].data.status).toBeUndefined();
    const published = fixture();
    await expect(
      published.service.update(
        USER,
        ID,
        payload({ ...draft, birthdayStory: undefined }, []),
        [],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(published.prisma.$transaction).not.toHaveBeenCalled();
  });
  it('allows content edits on an expired card when submitted dates are unchanged', async () => {
    const expiresAt = new Date('2020-01-01T00:00:00.000Z');
    const f = fixture({ expiresAt, publishAt: null });
    await expect(
      f.service.update(
        USER,
        ID,
        payload({
          ...draft,
          publishAt: null,
          expiresAt: expiresAt.toISOString(),
        }),
        [],
      ),
    ).resolves.toEqual({ id: ID, slug: 'stable-link', status: 'PUBLISHED' });
  });
});

describe('birthday editor route protection', () => {
  it.each([
    ['getBirthdayMomentForEdit', ':id/edit'],
    ['getBirthdayMomentEditorMedia', ':id/edit/media/:mediaId'],
    ['updateBirthdayMoment', ':id/edit'],
  ])('requires JWT and disables caches for %s', (method, path) => {
    const handler =
      MomentsController.prototype[method as keyof MomentsController];
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(
      JwtAuthGuard,
    );
    expect(Reflect.getMetadata(HEADERS_METADATA, handler)).toContainEqual({
      name: 'Cache-Control',
      value: 'no-store',
    });
  });
  it('retains the ordinary global throttle without a shared-BFF-IP override', () => {
    const handler = MomentsController.prototype.updateBirthdayMoment;
    expect(
      Reflect.getMetadata(`${THROTTLER_LIMIT}default`, handler),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(`${THROTTLER_TTL}default`, handler),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(`${THROTTLER_SKIP}default`, handler),
    ).toBeUndefined();
  });
});
