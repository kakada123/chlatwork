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
import { MemberKhqrAdminController } from './member-khqr.controller';
import { MAX_KHQR_BYTES, MemberKhqrService } from './member-khqr.service';

describe('MemberKhqrService', () => {
  let png: Buffer;
  beforeAll(async () => {
    const canvas = createCanvas(16, 16);
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, 16, 16);
    context.fillStyle = 'black';
    context.fillRect(2, 2, 6, 6);
    png = await canvas.encode('png');
  });

  function setup() {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    return { prisma, service: new MemberKhqrService(prisma as never) };
  }

  it('lists configured and observed members, preferring member-specific uploads', async () => {
    const { prisma, service } = setup();
    prisma.$queryRaw
      .mockResolvedValueOnce([
        { telegramUserId: '123', displayName: 'New Member', isActive: true },
      ])
      .mockResolvedValueOnce([
        {
          memberKey: 'kakada',
          version: 'a'.repeat(64),
          updatedAt: new Date('2026-09-10T00:00:00Z'),
        },
      ]);
    const members = await service.list();
    expect(members).toHaveLength(10);
    expect(members.find((member) => member.key === 'kakada')?.imageUrl).toBe(
      `/api/member-khqr/kakada?v=${'a'.repeat(64)}`,
    );
    expect(members.find((member) => member.key === 'sna')?.imageUrl).toBe(
      '/images/khqr/sna.png',
    );
    expect(
      members.find((member) => member.key === 'venge')?.imageUrl,
    ).toBeNull();
    expect(
      members.find((member) => member.key === 'tg_123')?.imageUrl,
    ).toBeNull();
  });

  it('decodes and saves a PNG only for the selected member', async () => {
    const { prisma, service } = setup();
    const result = await service.upload('kakada', {
      buffer: png,
      mimetype: 'image/png',
    });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    const [, key, content, version] = prisma.$executeRaw.mock.calls[0];
    expect(key).toBe('kakada');
    expect(content.subarray(0, 8)).toEqual(png.subarray(0, 8));
    expect(version).toBe(createHash('sha256').update(content).digest('hex'));
    expect(result.imageUrl).toBe(`/api/member-khqr/kakada?v=${version}`);
  });

  it('accepts uploads for observed members without a static image mapping', async () => {
    const { prisma, service } = setup();
    prisma.$queryRaw.mockResolvedValueOnce([{ telegramUserId: '123' }]);
    await service.upload('tg_123', { buffer: png, mimetype: 'image/png' });
    expect(prisma.$executeRaw.mock.calls[0][1]).toBe('tg_123');
  });

  it.each(['../sna', 'unknown', 'tg_999'])(
    'rejects unknown member %s without writing',
    async (key) => {
      const { prisma, service } = setup();
      await expect(
        service.upload(key, { buffer: png, mimetype: 'image/png' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    },
  );

  it('rejects missing, oversized, mislabeled and corrupted files without writing', async () => {
    const { prisma, service } = setup();
    for (const file of [
      undefined,
      { buffer: Buffer.alloc(MAX_KHQR_BYTES + 1), mimetype: 'image/png' },
      { buffer: png, mimetype: 'image/svg+xml' },
      { buffer: Buffer.from('<svg></svg>'), mimetype: 'image/png' },
      { buffer: png.subarray(0, 33), mimetype: 'image/png' },
    ]) {
      await expect(service.upload('sna', file)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('rejects excessive dimensions before decoding the PNG', async () => {
    const { prisma, service } = setup();
    const oversized = Buffer.from(png);
    oversized.writeUInt32BE(100_000, 16);
    await expect(
      service.upload('sna', { buffer: oversized, mimetype: 'image/png' }),
    ).rejects.toThrow('2048');
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('returns PNG bytes and reports missing images as 404', async () => {
    const { prisma, service } = setup();
    prisma.$queryRaw.mockResolvedValueOnce([{ content: png }]);
    await expect(service.image('sna')).resolves.toEqual(png);
    await expect(service.image('venge')).rejects.toBeInstanceOf(
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
