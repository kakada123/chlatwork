import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { PrismaService } from '../prisma/prisma.service';
import { FeatureAvailabilityService } from '../feature-availability/feature-availability.service';
import {
  detectLinkType,
  normalizeImageUrl,
  normalizeLinkUrl,
  normalizeProfileSlug,
  validateReorder,
} from './profile-policy';
import type {
  CreateProfileLinkDto,
  UpdateProfileDto,
  UpdateProfileLinkDto,
} from './dto/profile.dto';
import { assertProfileImageDimensions } from './profile-image';

const ownerInclude = {
  links: { orderBy: { position: 'asc' as const } },
  images: { select: { kind: true, updatedAt: true } },
};
type OwnerProfile = Prisma.LinkProfileGetPayload<{
  include: typeof ownerInclude;
}>;
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export type ProfileUpload = { buffer: Buffer; mimetype: string };

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: FeatureAvailabilityService,
  ) {}

  async assertEnabled() {
    if (!(await this.availability.isEnabled('website:chlatwork-link')))
      throw new ServiceUnavailableException(
        'ChlatWork Link is temporarily unavailable.',
      );
  }

  async getMine(userId: string) {
    const profile = await this.prisma.linkProfile.findUnique({
      where: { userId },
      include: ownerInclude,
    });
    return profile ? this.present(profile, true) : null;
  }

  private async mutate<T>(
    userId: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // One account lock serializes creation, link limits, replacement, and reordering across tabs.
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        return operation(tx);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'This username is already taken. Choose another.',
        );
      throw error;
    }
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const { links, avatarUrl, backgroundUrl, ...input } = dto;
    const data: Prisma.LinkProfileUpdateInput = { ...input };
    if (dto.slug !== undefined) data.slug = normalizeProfileSlug(dto.slug);
    if (dto.displayName !== undefined) {
      if (!dto.displayName.trim())
        throw new BadRequestException('Enter a display name.');
      data.displayName = dto.displayName.trim();
    }
    if (avatarUrl !== undefined) data.avatarUrl = normalizeImageUrl(avatarUrl);
    if (backgroundUrl !== undefined)
      data.backgroundUrl = normalizeImageUrl(backgroundUrl);
    const saved = await this.mutate(userId, async (tx) => {
      let profile = await tx.linkProfile.findUnique({
        where: { userId },
        include: ownerInclude,
      });
      if (!profile) {
        if (!dto.slug || !dto.displayName?.trim())
          throw new BadRequestException(
            'Choose a username and display name first.',
          );
        profile = await tx.linkProfile.create({
          data: {
            userId,
            slug: normalizeProfileSlug(dto.slug),
            displayName: dto.displayName.trim(),
          },
          include: ownerInclude,
        });
      }
      if (links !== undefined) {
        const ids = links.flatMap((link) => (link.id ? [link.id] : []));
        if (
          new Set(ids).size !== ids.length ||
          ids.some((id) => !profile.links.some((link) => link.id === id))
        )
          throw new BadRequestException(
            'One or more links do not belong to this profile.',
          );
        await tx.profileLink.deleteMany({
          where: { profileId: profile.id, id: { notIn: ids } },
        });
        for (const [position, link] of links.entries()) {
          const values = { ...this.linkValues(link), position };
          if (link.id)
            await tx.profileLink.update({
              where: { id: link.id },
              data: values,
            });
          else
            await tx.profileLink.create({
              data: {
                ...values,
                title: values.title!,
                url: values.url!,
                profileId: profile.id,
              },
            });
        }
      }
      // An explicitly changed image URL replaces the previously uploaded photo.
      for (const [kind, url] of [
        ['avatar', avatarUrl],
        ['background', backgroundUrl],
      ] as const) {
        if (url !== undefined)
          await tx.profileImage.deleteMany({
            where: { profileId: profile.id, kind },
          });
      }
      return tx.linkProfile.update({
        where: { id: profile.id },
        data,
        include: ownerInclude,
      });
    });
    return this.present(saved, true);
  }

  private linkValues(dto: CreateProfileLinkDto | UpdateProfileLinkDto) {
    if (dto.title !== undefined && !dto.title.trim())
      throw new BadRequestException('Enter a link title.');
    const url = dto.url === undefined ? undefined : normalizeLinkUrl(dto.url);
    return {
      title: dto.title?.trim(),
      url,
      type: url ? detectLinkType(url) : undefined,
      isEnabled: dto.isEnabled,
    };
  }

  private async requireMine(tx: Prisma.TransactionClient, userId: string) {
    const profile = await tx.linkProfile.findUnique({
      where: { userId },
      include: ownerInclude,
    });
    if (!profile) throw new NotFoundException('Save your profile first.');
    return profile;
  }

  async addLink(userId: string, dto: CreateProfileLinkDto) {
    return this.mutate(userId, async (tx) => {
      const profile = await this.requireMine(tx, userId);
      if (profile.links.length >= 50)
        throw new BadRequestException('A profile can have up to 50 links.');
      const values = this.linkValues(dto);
      return tx.profileLink.create({
        data: {
          profileId: profile.id,
          title: values.title!,
          url: values.url!,
          type: values.type,
          isEnabled: values.isEnabled,
          position:
            Math.max(-1, ...profile.links.map((link) => link.position)) + 1,
        },
      });
    });
  }

  async editLink(userId: string, id: string, dto: UpdateProfileLinkDto) {
    return this.mutate(userId, async (tx) => {
      const profile = await this.requireMine(tx, userId);
      if (!profile.links.some((link) => link.id === id))
        throw new NotFoundException('Link not found.');
      return tx.profileLink.update({
        where: { id },
        data: this.linkValues(dto),
      });
    });
  }

  async deleteLink(userId: string, id: string) {
    return this.mutate(userId, async (tx) => {
      const profile = await this.requireMine(tx, userId);
      if (!profile.links.some((link) => link.id === id))
        throw new NotFoundException('Link not found.');
      await tx.profileLink.delete({ where: { id } });
      return { deleted: true };
    });
  }

  async reorder(userId: string, ids: string[]) {
    return this.mutate(userId, async (tx) => {
      const profile = await this.requireMine(tx, userId);
      validateReorder(
        profile.links.map((link) => link.id),
        ids,
      );
      for (const [position, id] of ids.entries())
        await tx.profileLink.update({ where: { id }, data: { position } });
      return { reordered: true };
    });
  }

  async publicProfile(slug: string) {
    const profile = await this.prisma.linkProfile.findFirst({
      where: {
        slug: normalizeProfileSlug(slug),
        isPublished: true,
        user: { isActive: true },
      },
      include: {
        ...ownerInclude,
        links: { where: { isEnabled: true }, orderBy: { position: 'asc' } },
      },
    });
    if (!profile) throw new NotFoundException('Profile not found.');
    return this.present(profile, false);
  }

  async recordView(slug: string) {
    // Aggregate increments are atomic; no visitor identity, IP, referrer, or user-agent is persisted.
    const result = await this.prisma.linkProfile.updateMany({
      where: {
        slug: normalizeProfileSlug(slug),
        isPublished: true,
        user: { isActive: true },
      },
      data: { viewCount: { increment: 1 } },
    });
    if (!result.count) throw new NotFoundException('Profile not found.');
    return { recorded: true };
  }

  async recordClick(slug: string, linkId: string) {
    const result = await this.prisma.profileLink.updateMany({
      where: {
        id: linkId,
        isEnabled: true,
        profile: {
          slug: normalizeProfileSlug(slug),
          isPublished: true,
          user: { isActive: true },
        },
      },
      data: { clickCount: { increment: 1 } },
    });
    if (!result.count) throw new NotFoundException('Link not found.');
    return { recorded: true };
  }

  private present(profile: OwnerProfile, owner: boolean) {
    const {
      userId: _userId,
      images,
      links,
      viewCount,
      createdAt,
      updatedAt,
      ...fields
    } = profile;
    const imageUrl = (kind: string, fallback: string | null) => {
      const image = images.find((item) => item.kind === kind);
      const base = owner
        ? '/api/profiles/me'
        : `/api/public/profiles/${profile.slug}`;
      return image
        ? `${base}/media/${kind}?v=${image.updatedAt.getTime()}`
        : fallback;
    };
    return {
      ...fields,
      avatarUrl: imageUrl('avatar', profile.avatarUrl),
      backgroundUrl: imageUrl('background', profile.backgroundUrl),
      ...(owner
        ? {
            viewCount,
            createdAt,
            updatedAt,
            hasAvatarUpload: images.some((image) => image.kind === 'avatar'),
            hasBackgroundUpload: images.some(
              (image) => image.kind === 'background',
            ),
          }
        : {}),
      links: links.map(
        ({
          profileId: _profileId,
          clickCount,
          createdAt: _created,
          updatedAt: _updated,
          ...link
        }) => ({ ...link, ...(owner ? { clickCount } : {}) }),
      ),
    };
  }

  async uploadImage(userId: string, kind: string, file?: ProfileUpload) {
    this.imageKind(kind);
    const data = new Uint8Array(await normalizeProfileImage(file));
    await this.mutate(userId, async (tx) => {
      const profile = await this.requireMine(tx, userId);
      await tx.profileImage.upsert({
        where: { profileId_kind: { profileId: profile.id, kind } },
        create: { profileId: profile.id, kind, data },
        update: { data },
      });
      await tx.linkProfile.update({
        where: { id: profile.id },
        data: kind === 'avatar' ? { avatarUrl: null } : { backgroundUrl: null },
      });
    });
    return this.getMine(userId);
  }

  private imageKind(kind: string) {
    if (!['avatar', 'background'].includes(kind))
      throw new BadRequestException('Unknown image type.');
  }

  async image(key: string, kind: string, owner = false) {
    this.imageKind(kind);
    const image = await this.prisma.profileImage.findFirst({
      where: {
        kind,
        profile: owner
          ? { userId: key }
          : {
              slug: normalizeProfileSlug(key),
              isPublished: true,
              user: { isActive: true },
            },
      },
      select: { data: true },
    });
    if (!image) throw new NotFoundException('Image not found.');
    return Buffer.from(image.data);
  }

  async ogImage(slug: string) {
    const profile = await this.publicProfile(slug);
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1200, 630);
    const avatar = await this.image(slug, 'avatar').catch(() => null);
    if (avatar) {
      const image = await loadImage(avatar);
      ctx.save();
      ctx.beginPath();
      ctx.arc(600, 170, 76, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(image, 524, 94, 152, 152);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(profile.displayName, 600, 340, 1040);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '28px sans-serif';
    ctx.fillText(profile.headline || profile.bio, 600, 400, 1040);
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '24px sans-serif';
    ctx.fillText(`chlatwork.com/u/${profile.slug}`, 600, 530);
    return canvas.encode('jpeg', 85);
  }
}

export async function normalizeProfileImage(file?: ProfileUpload) {
  if (!file?.buffer?.length || file.buffer.length > MAX_PROFILE_IMAGE_BYTES)
    throw new BadRequestException('Choose an image of 5MB or smaller.');
  const buffer = file.buffer;
  const actualMime = buffer
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? 'image/png'
    : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
      ? 'image/jpeg'
      : buffer.toString('ascii', 0, 4) === 'RIFF' &&
          buffer.toString('ascii', 8, 12) === 'WEBP'
        ? 'image/webp'
        : null;
  if (!actualMime || actualMime !== file.mimetype)
    throw new BadRequestException('Use a genuine JPG, PNG, or WebP image.');
  assertProfileImageDimensions(buffer, actualMime);
  try {
    const image = await loadImage(buffer);
    if (
      !image.width ||
      !image.height ||
      image.width * image.height > 16_000_000
    )
      throw new BadRequestException('Images must be 16 megapixels or smaller.');
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = createCanvas(
      Math.max(1, Math.round(image.width * scale)),
      Math.max(1, Math.round(image.height * scale)),
    );
    // Always re-encode, including WebP uploads, to remove embedded metadata and animation.
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const output = await canvas.encode('webp', 80);
    if (output.length > MAX_PROFILE_IMAGE_BYTES)
      throw new BadRequestException('This image is too large.');
    return output;
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException('This image could not be opened.');
  }
}
