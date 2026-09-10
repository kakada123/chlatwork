import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  INTERCEPTORS_METADATA,
} from '@nestjs/common/constants';
import { Readable } from 'node:stream';
import { of } from 'rxjs';
import { createCanvas } from '@napi-rs/canvas';
import { createHash } from 'node:crypto';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  MemberKhqrAdminController,
  MemberKhqrImageController,
} from './member-khqr.controller';
import { MAX_KHQR_BYTES, MemberKhqrService } from './member-khqr.service';

describe('MemberKhqrService', () => {
  const chatId = '-1001234567890';
  const observedMembers = [
    { telegramUserId: '1', displayName: 'Sovan Krusna', isActive: true },
    { telegramUserId: '2', displayName: 'Kakada Ngen', isActive: true },
    { telegramUserId: '3', displayName: 'Phann Phearun', isActive: true },
    { telegramUserId: '4', displayName: 'Veng E Sorn', isActive: true },
  ];
  let png: Buffer;
  let jpeg: Buffer;
  beforeAll(async () => {
    const canvas = createCanvas(16, 16);
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = 'black';
    context.fillRect(2, 2, 6, 6);
    png = await canvas.encode('png');
    jpeg = await canvas.encode('jpeg');
  });

  function setup() {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockImplementation(async (sql) =>
          sql.join('').includes('FROM telegram_group_members')
            ? observedMembers
            : [],
        ),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    return { prisma, service: new MemberKhqrService(prisma as never) };
  }

  it('lists only observed group members, using database uploads only', async () => {
    const { prisma, service } = setup();
    prisma.$queryRaw
      .mockResolvedValueOnce([
        ...observedMembers,
        { telegramUserId: '123', displayName: 'New Member', isActive: true },
      ])
      .mockResolvedValueOnce([
        {
          memberKey: 'tg_2',
          version: 'a'.repeat(64),
          updatedAt: new Date('2026-09-10T00:00:00Z'),
        },
        { memberKey: 'sna', version: 'b'.repeat(64), updatedAt: new Date() },
      ]);
    const result = await service.list(chatId);
    const { members } = result;
    expect(result.chatId).toBe(chatId);
    expect(prisma.$queryRaw.mock.calls[0].slice(1)).toEqual([BigInt(chatId)]);
    expect(members).toHaveLength(5);
    expect(members.find((member) => member.key === 'tg_2')?.imageUrl).toBe(
      `/api/member-khqr/tg_2?v=${'a'.repeat(64)}`,
    );
    expect(
      members.find((member) => member.key === 'tg_1')?.imageUrl,
    ).toBeNull();
    expect(
      members.find((member) => member.key === 'tg_4')?.imageUrl,
    ).toBeNull();
    expect(
      members.find((member) => member.key === 'tg_123')?.imageUrl,
    ).toBeNull();
  });

  it('saves the original PNG only for the selected member', async () => {
    const { prisma, service } = setup();
    const result = await service.upload(chatId, 'tg_2', {
      buffer: png,
      mimetype: 'image/png',
    });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    const [, key, content, version] = prisma.$executeRaw.mock.calls[0];
    expect(key).toBe('tg_2');
    expect(content).toEqual(png);
    expect(version).toBe(createHash('sha256').update(content).digest('hex'));
    expect(result.imageUrl).toBe(`/api/member-khqr/tg_2?v=${version}`);
  });

  it('keeps uploaded images attached to IDs when members share or change names', async () => {
    const { prisma, service } = setup();
    let displayName = 'Same name';
    prisma.$queryRaw.mockImplementation(async (sql) => {
      if (sql.join('').includes('FROM telegram_group_members')) {
        return [
          { telegramUserId: '1', displayName, isActive: true },
          { telegramUserId: '2', displayName: 'Same name', isActive: true },
        ];
      }
      return [
        {
          memberKey: 'tg_1',
          version: 'a'.repeat(64),
          updatedAt: new Date('2026-09-10T00:00:00Z'),
        },
      ];
    });
    const before = (await service.list(chatId)).members;
    expect(before[0].imageUrl).toBe(
      `/api/member-khqr/tg_1?v=${'a'.repeat(64)}`,
    );
    expect(before[1].imageUrl).toBeNull();
    displayName = 'Renamed member';
    const after = (await service.list(chatId)).members;
    expect(after[0]).toEqual({ ...before[0], displayName });
    expect(after[1].imageUrl).toBeNull();
  });

  it('accepts uploads for observed members without a static image mapping', async () => {
    const { prisma, service } = setup();
    prisma.$queryRaw.mockResolvedValueOnce([
      { telegramUserId: '123', displayName: 'New Member', isActive: true },
    ]);
    await service.upload(chatId, 'tg_123', {
      buffer: png,
      mimetype: 'image/png',
    });
    expect(prisma.$executeRaw.mock.calls[0][1]).toBe('tg_123');
  });

  it.each(['../sna', 'unknown', 'tg_999', 'kakada'])(
    'rejects unknown member %s without writing',
    async (key) => {
      const { prisma, service } = setup();
      await expect(
        service.upload(chatId, key, { buffer: png, mimetype: 'image/png' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    },
  );

  it('rejects missing, oversized and unsupported files without writing', async () => {
    const { prisma, service } = setup();
    for (const file of [
      undefined,
      { buffer: Buffer.alloc(MAX_KHQR_BYTES + 1), mimetype: 'image/png' },
      { buffer: Buffer.from('<svg></svg>'), mimetype: 'image/png' },
      { buffer: png.subarray(0, 20), mimetype: 'image/png' },
    ]) {
      await expect(service.upload(chatId, 'tg_1', file)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it.each(['image/jpeg', 'image/png', 'application/octet-stream', ''])(
    'saves JPEG bytes even when the upload reports %s',
    async (mimetype) => {
      const { prisma, service } = setup();
      await service.upload(chatId, 'tg_1', { buffer: jpeg, mimetype });
      expect(prisma.$executeRaw.mock.calls[0][2]).toEqual(jpeg);
      const controller = new MemberKhqrImageController(service);
      prisma.$queryRaw.mockResolvedValueOnce([
        { content: Uint8Array.from(jpeg) },
      ]);
      const response = await controller.image('tg_1');
      expect(response.getHeaders().type).toBe('image/jpeg');
      const chunks: Buffer[] = [];
      for await (const chunk of response.getStream())
        chunks.push(Buffer.from(chunk));
      expect(Buffer.concat(chunks)).toEqual(jpeg);
    },
  );

  it('keeps PNG bytes without strict checksum or dimension validation', async () => {
    const { prisma, service } = setup();
    const exported = Buffer.from(png);
    exported.writeUInt32BE(3000, 16);
    await service.upload(chatId, 'tg_1', {
      buffer: exported,
      mimetype: 'image/png',
    });
    expect(prisma.$executeRaw.mock.calls[0][2]).toEqual(exported);
  });

  it('serves PNG with its actual type and never serves unsupported stored content', async () => {
    const { prisma, service } = setup();
    const controller = new MemberKhqrImageController(service);
    prisma.$queryRaw.mockResolvedValueOnce([{ content: Uint8Array.from(png) }]);
    expect((await controller.image('tg_1')).getHeaders().type).toBe(
      'image/png',
    );
    prisma.$queryRaw.mockResolvedValueOnce([
      { content: Buffer.from('<svg></svg>') },
    ]);
    await expect(controller.image('tg_1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns PNG bytes and reports missing images as 404', async () => {
    const { prisma, service } = setup();
    prisma.$queryRaw.mockResolvedValueOnce([{ content: Uint8Array.from(png) }]);
    await expect(service.image('tg_1')).resolves.toEqual(png);
    await expect(service.image('tg_4')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.image('../sna')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('protects both listing and upload with authentication and ADMIN authorization', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, MemberKhqrAdminController),
    ).toEqual([JwtAuthGuard, AdminGuard]);
    const guard = new AdminGuard();
    const context = (role?: string) => ({
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    });
    expect(() => guard.canActivate(context() as never)).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(context('USER') as never)).toThrow(
      ForbiddenException,
    );
    expect(guard.canActivate(context('ADMIN') as never)).toBe(true);
  });

  it.each(['', '0', '123', '-0', '-9007199254740992', 'all'])(
    'rejects invalid group %s before reading members',
    async (group) => {
      const { prisma, service } = setup();
      await expect(service.list(group)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.upload(group, 'tg_1', { buffer: png, mimetype: 'image/png' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    },
  );

  it('never merges two groups or permits an upload to a different group roster', async () => {
    const { prisma, service } = setup();
    const otherGroup = '-1009876543210';
    prisma.$queryRaw.mockImplementation(async (sql, ...values) => {
      if (sql.join('').includes('FROM telegram_group_members')) {
        return values[0] === BigInt(chatId)
          ? [
              {
                telegramUserId: '1',
                displayName: 'Sovan Krusna',
                isActive: true,
              },
            ]
          : [
              {
                telegramUserId: '2',
                displayName: 'Kakada Ngen',
                isActive: true,
              },
            ];
      }
      return [];
    });
    expect(
      (await service.list(chatId)).members.map((member) => member.key),
    ).toEqual(['tg_1']);
    expect(
      (await service.list(otherGroup)).members.map((member) => member.key),
    ).toEqual(['tg_2']);
    await expect(
      service.upload(otherGroup, 'tg_1', {
        buffer: png,
        mimetype: 'image/png',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('does not show members for an empty group or accept their uploads', async () => {
    const { prisma, service } = setup();
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(service.list(chatId)).resolves.toEqual({
      chatId,
      members: [],
    });
    await expect(
      service.upload(chatId, 'tg_2', { buffer: png, mimetype: 'image/png' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it.each([1, 2])(
    'accepts exactly one multipart image (%i supplied)',
    async (count) => {
      const [Interceptor] = Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        MemberKhqrAdminController.prototype.upload,
      );
      const parts = Array.from({ length: count }, () =>
        Buffer.concat([
          Buffer.from(
            '--test-boundary\r\nContent-Disposition: form-data; name="image"; filename="qr.png"\r\nContent-Type: image/png\r\n\r\n',
          ),
          png,
          Buffer.from('\r\n'),
        ]),
      );
      const body = Buffer.concat([
        ...parts,
        Buffer.from('--test-boundary--\r\n'),
      ]);
      const request = Object.assign(Readable.from(body), {
        headers: {
          'content-type': 'multipart/form-data; boundary=test-boundary',
          'content-length': String(body.length),
        },
      });
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({}),
        }),
      };
      const next = { handle: jest.fn(() => of(null)) };
      const result = new Interceptor().intercept(context, next);
      if (count === 1) {
        await result;
        expect(next.handle).toHaveBeenCalled();
        expect(
          (request as typeof request & { file: { buffer: Buffer } }).file
            .buffer,
        ).toEqual(png);
      } else {
        await expect(result).rejects.toBeInstanceOf(BadRequestException);
        expect(next.handle).not.toHaveBeenCalled();
      }
    },
  );
});
