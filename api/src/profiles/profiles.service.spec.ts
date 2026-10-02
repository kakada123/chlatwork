import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createCanvas } from '@napi-rs/canvas';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateProfileDto } from './dto/profile.dto';
import { normalizeProfileImage, ProfilesService } from './profiles.service';

const userId = '11111111-1111-4111-8111-111111111111';
const linkId = '22222222-2222-4222-8222-222222222222';
const profile = () => ({
  id: 'profile',
  userId,
  slug: 'kakada',
  displayName: 'Kakada',
  avatarUrl: null,
  backgroundUrl: null,
  isPublished: true,
  viewCount: 12,
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [],
  links: [
    {
      id: linkId,
      profileId: 'profile',
      title: 'GitHub',
      url: 'https://github.com',
      isEnabled: true,
      clickCount: 9,
    },
  ],
});
function setup() {
  const prisma = {
    $queryRaw: jest.fn(),
    linkProfile: {
      findUnique: jest.fn().mockResolvedValue(profile()),
      findFirst: jest.fn().mockResolvedValue(profile()),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue(profile()),
    },
    profileLink: {
      deleteMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn(),
    },
    profileImage: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
  return {
    prisma,
    service: new ProfilesService(
      prisma as never,
      { isEnabled: jest.fn().mockResolvedValue(true) } as never,
    ),
  };
}

describe('ProfilesService', () => {
  it('rejects foreign or duplicated link IDs before replacing saved links', async () => {
    const { prisma, service } = setup();
    await expect(
      service.update(userId, {
        links: [{ id: 'foreign', title: 'Link', url: 'https://example.com' }],
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update(userId, {
        links: [
          { id: linkId, title: 'One', url: 'https://example.com' },
          { id: linkId, title: 'Two', url: 'https://example.com' },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.profileLink.deleteMany).not.toHaveBeenCalled();
  });
  it('does not edit or delete another account’s link', async () => {
    const { prisma, service } = setup();
    await expect(
      service.editLink(userId, 'foreign', { title: 'Hijack' }),
    ).rejects.toThrow(NotFoundException);
    await expect(service.deleteLink(userId, 'foreign')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.profileLink.update).not.toHaveBeenCalled();
    expect(prisma.profileLink.delete).not.toHaveBeenCalled();
    expect(prisma.linkProfile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    );
  });
  it('uses publication, link-enabled, and account-active conditions for atomic counts', async () => {
    const { prisma, service } = setup();
    await service.recordView('Kakada');
    await service.recordClick('kakada', linkId);
    expect(prisma.linkProfile.updateMany).toHaveBeenCalledWith({
      where: { slug: 'kakada', isPublished: true, user: { isActive: true } },
      data: { viewCount: { increment: 1 } },
    });
    expect(prisma.profileLink.updateMany).toHaveBeenCalledWith({
      where: {
        id: linkId,
        isEnabled: true,
        profile: {
          slug: 'kakada',
          isPublished: true,
          user: { isActive: true },
        },
      },
      data: { clickCount: { increment: 1 } },
    });
    prisma.profileLink.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.recordClick('kakada', linkId)).rejects.toThrow(
      NotFoundException,
    );
  });
  it('removes owner identity and analytics from the public response', async () => {
    const { prisma, service } = setup();
    const publicProfile = await service.publicProfile('kakada');
    expect(publicProfile).not.toHaveProperty('userId');
    expect(publicProfile).not.toHaveProperty('viewCount');
    expect(publicProfile.links[0]).not.toHaveProperty('clickCount');
    expect(publicProfile.links[0]).not.toHaveProperty('profileId');
    expect(prisma.linkProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'kakada', isPublished: true, user: { isActive: true } },
        include: expect.objectContaining({
          links: expect.objectContaining({ where: { isEnabled: true } }),
        }),
      }),
    );
  });
  it('maps unique username conflicts to a useful error', async () => {
    const { prisma, service } = setup();
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate slug', {
        code: 'P2002',
        clientVersion: '6',
      }),
    );
    await expect(service.update(userId, { slug: 'taken' })).rejects.toThrow(
      ConflictException,
    );
  });
  it('reorders only a complete set of owned links', async () => {
    const { prisma, service } = setup();
    await expect(service.reorder(userId, [])).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.profileLink.update).not.toHaveBeenCalled();
    await service.reorder(userId, [linkId]);
    expect(prisma.profileLink.update).toHaveBeenCalledWith({
      where: { id: linkId },
      data: { position: 0 },
    });
  });
});

describe('Profile DTO and photo validation', () => {
  it('rejects null booleans, unsupported themes, and oversized link collections', async () => {
    for (const data of [
      { isPublished: null },
      { theme: 'arbitrary-css' },
      {
        links: Array.from({ length: 51 }, () => ({
          title: 'Link',
          url: 'https://example.com',
        })),
      },
      { backgroundColor: 'url(javascript:alert(1))' },
    ]) {
      expect(
        (await validate(plainToInstance(UpdateProfileDto, data))).length,
      ).toBeGreaterThan(0);
    }
  });
  it('rejects spoofed photo content and normalizes genuine images to WebP', async () => {
    await expect(
      normalizeProfileImage({
        buffer: Buffer.from('<svg></svg>'),
        mimetype: 'image/png',
      }),
    ).rejects.toThrow(BadRequestException);
    const canvas = createCanvas(20, 20);
    const png = await canvas.encode('png');
    const normalized = await normalizeProfileImage({
      buffer: png,
      mimetype: 'image/png',
    });
    expect(normalized.toString('ascii', 8, 12)).toBe('WEBP');
    await expect(
      normalizeProfileImage({ buffer: normalized, mimetype: 'image/webp' }),
    ).resolves.toBeInstanceOf(Buffer);
    const hugePng = Buffer.from(png);
    hugePng.writeUInt32BE(16000, 16);
    hugePng.writeUInt32BE(16000, 20);
    await expect(
      normalizeProfileImage({ buffer: hugePng, mimetype: 'image/png' }),
    ).rejects.toThrow('16 megapixels');
    await expect(
      normalizeProfileImage({ buffer: png, mimetype: 'image/jpeg' }),
    ).rejects.toThrow(BadRequestException);
  });
});
