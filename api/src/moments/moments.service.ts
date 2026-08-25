import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { basename } from 'node:path';
import {
  MomentBlockType,
  MomentOccasion,
  MomentRsvpChoice,
  MomentStatus,
  MomentTheme,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMomentDto } from './dto/create-moment.dto';
import type { RespondMomentRsvpDto } from './dto/respond-moment-rsvp.dto';

const MAX_ACTIVE_MOMENTS = 3;
const MAX_MEDIA = 10;
export const MAX_MOMENT_IMAGE_BYTES = 2 * 1024 * 1024;

export interface MomentUpload {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class MomentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateMomentDto) {
    const now = new Date();
    const activeCount = await this.prisma.moment.count({
      where: {
        creatorId: userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
    if (activeCount >= MAX_ACTIVE_MOMENTS) {
      throw new ConflictException(
        'Free accounts can keep up to 3 active Moments',
      );
    }

    const recipientName = dto.recipientName.trim();
    const title = dto.title.trim();
    const message = dto.message.trim();
    const secretMessage = dto.secretMessage.trim();
    if (!recipientName || !title || !message || !secretMessage) {
      throw new BadRequestException('Moment text cannot be blank');
    }

    const publishAt = dto.publishAt
      ? this.parseDate(dto.publishAt, 'unlock date')
      : null;
    const expiresAt = dto.expiresAt
      ? this.parseDate(dto.expiresAt, 'expiry date')
      : null;
    if (expiresAt && expiresAt <= (publishAt ?? now)) {
      throw new BadRequestException(
        'Expiry date must be after the Moment unlocks',
      );
    }

    const isInvitation = dto.occasion === 'INVITATION';
    const eventDate = isInvitation
      ? this.parseDate(dto.eventDate ?? '', 'event date')
      : null;
    const venueName = dto.venueName?.trim() ?? '';
    const eventAddress = dto.eventAddress?.trim() ?? '';
    const mapUrl = dto.mapUrl?.trim() ?? '';
    if (isInvitation && (!venueName || !eventAddress)) {
      throw new BadRequestException(
        'Invitation venue name and address are required',
      );
    }
    if (mapUrl) {
      let parsedMapUrl: URL;
      try {
        parsedMapUrl = new URL(mapUrl);
      } catch {
        throw new BadRequestException('Invalid map URL');
      }
      if (!['http:', 'https:'].includes(parsedMapUrl.protocol)) {
        throw new BadRequestException('Map URL must use HTTP or HTTPS');
      }
    }

    const slug = await this.createUniqueSlug(recipientName);
    const blocks: Array<{ type: MomentBlockType; position: number; data: Record<string, unknown> }> = [];
    const addBlock = (type: MomentBlockType, data: Record<string, unknown>) =>
      blocks.push({ type, position: blocks.length, data });
    addBlock(MomentBlockType.HERO, { title });
    addBlock(MomentBlockType.MESSAGE, { message });
    if (isInvitation) {
      addBlock(MomentBlockType.EVENT_DETAILS, {
        date: eventDate!.toISOString(),
        venueName,
        dressCode: dto.dressCode?.trim() ?? '',
      });
      addBlock(MomentBlockType.LOCATION, { venueName, address: eventAddress, mapUrl });
      if (dto.eventSchedule?.trim()) {
        addBlock(MomentBlockType.SCHEDULE, { schedule: dto.eventSchedule.trim() });
      }
      addBlock(MomentBlockType.RSVP, {});
    }
    addBlock(MomentBlockType.GALLERY, {});
    if (dto.specialDate) addBlock(MomentBlockType.COUNTER, { date: dto.specialDate });
    addBlock(MomentBlockType.SECRET, { message: secretMessage });

    const moment = await this.prisma.moment.create({
      data: {
        slug,
        creatorId: userId,
        recipientName,
        occasion: dto.occasion as MomentOccasion,
        title,
        theme: dto.theme as MomentTheme,
        publishAt,
        expiresAt,
        blocks: {
          create: blocks.map((block) => ({
            ...block,
            data: block.data as Prisma.InputJsonValue,
          })),
        },
      },
      select: { id: true, slug: true },
    });
    return moment;
  }

  async addMedia(userId: string, momentId: string, file?: MomentUpload) {
    if (!file) throw new BadRequestException('Choose an image to upload');
    if (file.size > MAX_MOMENT_IMAGE_BYTES) {
      throw new BadRequestException('Each Moment image must be 2MB or smaller');
    }

    const mimeType = detectImageMime(file.buffer);
    if (!mimeType || mimeType !== file.mimetype) {
      throw new BadRequestException(
        'Only valid JPEG, PNG, and WebP images are accepted',
      );
    }

    const moment = await this.prisma.moment.findUnique({
      where: { id: momentId },
      select: {
        creatorId: true,
        status: true,
        _count: { select: { media: true } },
      },
    });
    if (!moment) throw new NotFoundException('Moment not found');
    if (moment.creatorId !== userId) throw new ForbiddenException();
    if (moment.status !== MomentStatus.DRAFT) {
      throw new ConflictException('Published Moments cannot accept new photos');
    }
    if (moment._count.media >= MAX_MEDIA) {
      throw new ConflictException('A Moment can contain up to 10 photos');
    }

    const originalName =
      basename(file.originalname)
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .slice(0, 180) || `photo-${moment._count.media + 1}.webp`;

    return this.prisma.momentMedia.create({
      data: {
        momentId,
        position: moment._count.media,
        mimeType,
        byteSize: file.size,
        originalName,
        content: Uint8Array.from(file.buffer),
      },
      select: { id: true, position: true },
    });
  }

  async publish(userId: string, momentId: string) {
    const moment = await this.prisma.moment.findUnique({
      where: { id: momentId },
      select: {
        creatorId: true,
        status: true,
        slug: true,
        _count: { select: { media: true } },
      },
    });
    if (!moment) throw new NotFoundException('Moment not found');
    if (moment.creatorId !== userId) throw new ForbiddenException();
    if (moment.status === MomentStatus.PUBLISHED) return { slug: moment.slug };
    if (moment._count.media < 1) {
      throw new BadRequestException('Add at least one photo before publishing');
    }

    await this.prisma.moment.update({
      where: { id: momentId },
      data: { status: MomentStatus.PUBLISHED, publishedAt: new Date() },
    });
    return { slug: moment.slug };
  }

  async listMine(userId: string) {
    const moments = await this.prisma.moment.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        recipientName: true,
        occasion: true,
        title: true,
        theme: true,
        status: true,
        publishAt: true,
        expiresAt: true,
        createdAt: true,
        _count: { select: { media: true, rsvps: true } },
      },
    });
    return Promise.all(
      moments.map(async (moment) => {
        if (moment.occasion !== MomentOccasion.INVITATION) return moment;
        const groups = await this.prisma.momentRsvp.groupBy({
          by: ['choice'],
          where: { momentId: moment.id },
          _count: { _all: true },
          _sum: { guestCount: true },
        });
        return {
          ...moment,
          rsvpSummary: {
            yes: groups.find((group) => group.choice === MomentRsvpChoice.YES)?._count._all ?? 0,
            maybe: groups.find((group) => group.choice === MomentRsvpChoice.MAYBE)?._count._all ?? 0,
            no: groups.find((group) => group.choice === MomentRsvpChoice.NO)?._count._all ?? 0,
            guests: groups
              .filter((group) => group.choice !== MomentRsvpChoice.NO)
              .reduce((total, group) => total + (group._sum.guestCount ?? 0), 0),
          },
        };
      }),
    );
  }

  async respondToInvitation(slug: string, dto: RespondMomentRsvpDto) {
    const moment = await this.prisma.moment.findUnique({ where: { slug } });
    this.assertPublic(moment);
    if (moment.occasion !== MomentOccasion.INVITATION) {
      throw new NotFoundException('Invitation not found');
    }
    const responseKey = createHash('sha256').update(dto.responseToken).digest('hex');
    const choice = dto.choice as MomentRsvpChoice;
    const guestCount = choice === MomentRsvpChoice.NO ? 0 : dto.guestCount;
    if (choice !== MomentRsvpChoice.NO && guestCount < 1) {
      throw new BadRequestException('Attending guests must include at least one person');
    }
    const response = await this.prisma.momentRsvp.upsert({
      where: { momentId_responseKey: { momentId: moment.id, responseKey } },
      create: {
        momentId: moment.id,
        responseKey,
        choice,
        guestName: dto.guestName?.trim() || null,
        guestCount,
        note: dto.note?.trim() || null,
      },
      update: {
        choice,
        guestName: dto.guestName?.trim() || null,
        guestCount,
        note: dto.note?.trim() || null,
      },
      select: { choice: true, guestCount: true, updatedAt: true },
    });
    return response;
  }

  async remove(userId: string, momentId: string) {
    const result = await this.prisma.moment.deleteMany({
      where: { id: momentId, creatorId: userId },
    });
    if (!result.count) throw new NotFoundException('Moment not found');
    return { deleted: true };
  }

  async getPublic(slug: string) {
    const moment = await this.prisma.moment.findUnique({
      where: { slug },
      include: {
        blocks: { orderBy: { position: 'asc' } },
        media: {
          orderBy: { position: 'asc' },
          select: { id: true, position: true },
        },
      },
    });
    this.assertPublic(moment);

    const now = new Date();
    if (moment.publishAt && moment.publishAt > now) {
      return {
        status: 'locked' as const,
        recipientName: moment.recipientName,
        unlockAt: moment.publishAt.toISOString(),
      };
    }

    return {
      status: 'ready' as const,
      slug: moment.slug,
      recipientName: moment.recipientName,
      occasion: moment.occasion,
      title: moment.title,
      theme: moment.theme,
      blocks: moment.blocks.map((block) => ({
        id: block.id,
        type: block.type,
        position: block.position,
        data: block.data,
      })),
      media: moment.media.map((media) => ({
        id: media.id,
        position: media.position,
        url: `/api/moments/${moment.slug}/media/${media.id}`,
      })),
    };
  }

  async getPublicMedia(slug: string, mediaId: string) {
    const media = await this.prisma.momentMedia.findFirst({
      where: { id: mediaId, moment: { slug } },
      include: { moment: true },
    });
    if (!media) throw new NotFoundException('Photo not found');
    this.assertPublic(media.moment);
    if (media.moment.publishAt && media.moment.publishAt > new Date()) {
      throw new NotFoundException('Photo not found');
    }
    if (!media.content)
      throw new NotFoundException('Photo content is unavailable');
    return { content: Buffer.from(media.content), mimeType: media.mimeType };
  }

  private assertPublic(
    moment: { status: MomentStatus; expiresAt: Date | null } | null,
  ): asserts moment is NonNullable<typeof moment> {
    if (!moment || moment.status !== MomentStatus.PUBLISHED) {
      throw new NotFoundException('Moment not found');
    }
    if (moment.expiresAt && moment.expiresAt <= new Date()) {
      throw new GoneException('This Moment has expired');
    }
  }

  private parseDate(value: string, label: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException(`Invalid ${label}`);
    return date;
  }

  private async createUniqueSlug(recipientName: string) {
    const base =
      recipientName
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '-')
        .slice(0, 48) || 'moment';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      // The random suffix is the access boundary for unlisted personal pages.
      const slug = `${base}-${randomBytes(8).toString('hex')}`;
      const exists = await this.prisma.moment.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!exists) return slug;
    }
    throw new ConflictException(
      'Could not create a unique Moment link. Please try again',
    );
  }
}

function detectImageMime(buffer: Buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}
