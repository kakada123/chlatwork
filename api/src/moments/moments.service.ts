import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { basename } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import {
  InvitationRecipientType,
  MomentBlockType,
  MomentOccasion,
  MomentRsvpChoice,
  MomentStatus,
  MomentTheme,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMomentDto } from './dto/create-moment.dto';
import type { CreateInvitationGuestsDto } from './dto/create-invitation-guests.dto';
import type { RespondMomentRsvpDto } from './dto/respond-moment-rsvp.dto';
import type { RespondMomentVoteDto } from './dto/respond-moment-vote.dto';
import type { CurrentUser } from '../auth/types';

const MAX_ACTIVE_MOMENTS = 3;
const MAX_MEDIA = 10;
const MAX_INVITATION_GUESTS = 500;
// Temporary higher ceiling while Moment media storage is being evaluated.
export const MAX_MOMENT_IMAGE_BYTES = 10 * 1024 * 1024;

export interface MomentUpload {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

type MomentPollIdentityMode =
  | 'ANONYMOUS'
  | 'NAME_REQUIRED'
  | 'LOGIN_REQUIRED';

interface MomentPollDefinition {
  question: string;
  identityMode: MomentPollIdentityMode;
  options: Array<{ id: string; label: string }>;
}

export interface TelegramMomentVoter {
  telegramUserId: string;
  linkedUserId?: string;
  displayName: string;
}

export interface TelegramMomentPoll {
  id: string;
  slug: string;
  title: string;
  question: string;
  identityMode: MomentPollIdentityMode;
  totalVotes: number;
  results: Array<{ optionId: string; label: string; votes: number }>;
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
    const isVoting = dto.occasion === 'VOTING';
    const eventDate = isInvitation
      ? this.parseDate(dto.eventDate ?? '', 'event date')
      : null;
    const venueName = dto.venueName?.trim() ?? '';
    const eventAddress = dto.eventAddress?.trim() ?? '';
    const hostName = dto.hostName?.trim() ?? '';
    const mapUrl = dto.mapUrl?.trim() ?? '';
    if (isInvitation && (!venueName || !eventAddress || !hostName)) {
      throw new BadRequestException(
        'Invitation host, venue name, and address are required',
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
    const pollQuestion = dto.pollQuestion?.trim() ?? '';
    const pollOptions = [
      ...new Set(
        (dto.pollOptions ?? []).map((option) => option.trim()).filter(Boolean),
      ),
    ];
    if (isVoting && (!pollQuestion || pollOptions.length < 2)) {
      throw new BadRequestException(
        'Voting Moments require a question and at least two unique options',
      );
    }

    const slug = await this.createUniqueSlug(recipientName);
    const blocks: Array<{
      type: MomentBlockType;
      position: number;
      data: Record<string, unknown>;
    }> = [];
    const addBlock = (type: MomentBlockType, data: Record<string, unknown>) =>
      blocks.push({ type, position: blocks.length, data });
    addBlock(MomentBlockType.HERO, { title });
    addBlock(MomentBlockType.MESSAGE, { message });
    if (isInvitation) {
      addBlock(MomentBlockType.EVENT_DETAILS, {
        date: eventDate!.toISOString(),
        venueName,
        dressCode: dto.dressCode?.trim() ?? '',
        hostName,
      });
      addBlock(MomentBlockType.LOCATION, {
        venueName,
        address: eventAddress,
        mapUrl,
      });
      if (dto.eventSchedule?.trim()) {
        addBlock(MomentBlockType.SCHEDULE, {
          schedule: dto.eventSchedule.trim(),
        });
      }
      addBlock(MomentBlockType.RSVP, {});
    }
    if (isVoting) {
      addBlock(MomentBlockType.POLL, {
        question: pollQuestion,
        identityMode: dto.pollIdentityMode ?? 'ANONYMOUS',
        options: pollOptions.map((label, index) => ({
          id: `option-${index + 1}`,
          label,
        })),
      });
    }
    addBlock(MomentBlockType.GALLERY, {});
    if (dto.specialDate)
      addBlock(MomentBlockType.COUNTER, { date: dto.specialDate });
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
      throw new BadRequestException(
        'Each Moment image must be 10MB or smaller',
      );
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
        occasion: true,
        _count: { select: { media: true } },
      },
    });
    if (!moment) throw new NotFoundException('Moment not found');
    if (moment.creatorId !== userId) throw new ForbiddenException();
    if (moment.status !== MomentStatus.DRAFT) {
      throw new ConflictException('Published Moments cannot accept new photos');
    }
    if (moment.occasion === MomentOccasion.VOTING) {
      throw new BadRequestException('Voting Moments do not accept photos');
    }
    if (moment._count.media >= MAX_MEDIA) {
      throw new ConflictException('A Moment can contain up to 10 photos');
    }
    const normalized = await normalizeMomentImage(file.buffer, mimeType);

    const originalBaseName =
      basename(file.originalname)
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/\.[^.]+$/, '')
        .slice(0, 175) || `photo-${moment._count.media + 1}`;

    return this.prisma.momentMedia.create({
      data: {
        momentId,
        position: moment._count.media,
        mimeType: 'image/webp',
        byteSize: normalized.length,
        originalName: `${originalBaseName}.webp`,
        content: Uint8Array.from(normalized),
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
        occasion: true,
        _count: { select: { media: true } },
      },
    });
    if (!moment) throw new NotFoundException('Moment not found');
    if (moment.creatorId !== userId) throw new ForbiddenException();
    if (moment.status === MomentStatus.PUBLISHED) return { slug: moment.slug };
    if (moment._count.media < 1) {
      if (moment.occasion === MomentOccasion.VOTING) {
        await this.prisma.moment.update({
          where: { id: momentId },
          data: { status: MomentStatus.PUBLISHED, publishedAt: new Date() },
        });
        return { slug: moment.slug };
      }
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
        blocks: {
          where: { type: MomentBlockType.POLL },
          select: { data: true },
          take: 1,
        },
        _count: { select: { media: true, rsvps: true } },
      },
    });
    return Promise.all(
      moments.map(async (moment) => {
        const { blocks, ...summary } = moment;
        if (moment.occasion === MomentOccasion.VOTING) {
          const poll = blocks[0]?.data as
            | {
                identityMode?: string;
                requireName?: boolean;
                options?: Array<{ id: string; label: string }>;
              }
            | undefined;
          return {
            ...summary,
            ...(poll?.options
              ? {
                  pollSummary: await this.getPollSummary(
                    moment.id,
                    poll.options,
                    poll.identityMode ??
                      (poll.requireName ? 'NAME_REQUIRED' : 'ANONYMOUS'),
                  ),
                }
              : {}),
          };
        }
        if (moment.occasion !== MomentOccasion.INVITATION) return summary;
        const groups = await this.prisma.momentRsvp.groupBy({
          by: ['choice'],
          where: { momentId: moment.id },
          _count: { _all: true },
          _sum: { guestCount: true },
        });
        return {
          ...summary,
          rsvpSummary: {
            yes:
              groups.find((group) => group.choice === MomentRsvpChoice.YES)
                ?._count._all ?? 0,
            maybe:
              groups.find((group) => group.choice === MomentRsvpChoice.MAYBE)
                ?._count._all ?? 0,
            no:
              groups.find((group) => group.choice === MomentRsvpChoice.NO)
                ?._count._all ?? 0,
            guests: groups
              .filter((group) => group.choice !== MomentRsvpChoice.NO)
              .reduce(
                (total, group) => total + (group._sum.guestCount ?? 0),
                0,
              ),
          },
        };
      }),
    );
  }

  async listTelegramVotingMoments(
    userId: string,
  ): Promise<TelegramMomentPoll[]> {
    const now = new Date();
    const moments = await this.prisma.moment.findMany({
      where: {
        creatorId: userId,
        occasion: MomentOccasion.VOTING,
        status: MomentStatus.PUBLISHED,
        AND: [
          { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        slug: true,
        title: true,
        blocks: {
          where: { type: MomentBlockType.POLL },
          select: { data: true },
          take: 1,
        },
      },
    });

    const polls = await Promise.all(
      moments.map(async (moment) => {
        const poll = this.readPollDefinition(moment.blocks[0]?.data);
        return poll ? this.toTelegramPollView(moment, poll) : null;
      }),
    );
    return polls.filter((poll): poll is TelegramMomentPoll => poll !== null);
  }

  async getOwnedTelegramVotingMoment(
    userId: string,
    momentId: string,
  ): Promise<TelegramMomentPoll> {
    const moment = await this.prisma.moment.findFirst({
      where: { id: momentId, creatorId: userId },
      include: { blocks: { where: { type: MomentBlockType.POLL }, take: 1 } },
    });
    this.assertVotingOpen(moment);
    const poll = this.readPollDefinition(moment.blocks[0]?.data);
    if (!poll) throw new NotFoundException('Poll not found');
    return this.toTelegramPollView(moment, poll);
  }

  async addInvitationGuests(
    userId: string,
    momentId: string,
    dto: CreateInvitationGuestsDto,
  ) {
    const moment = await this.prisma.moment.findFirst({
      where: { id: momentId, creatorId: userId },
      select: {
        id: true,
        occasion: true,
        _count: { select: { invitationGuests: true } },
      },
    });
    if (!moment) throw new NotFoundException('Moment not found');
    if (moment.occasion !== MomentOccasion.INVITATION) {
      throw new BadRequestException(
        'Guest lists are available only for invitations',
      );
    }
    const names = [
      ...new Set(dto.names.map((name) => name.trim()).filter(Boolean)),
    ];
    if (!names.length)
      throw new BadRequestException('Add at least one guest name');
    if (moment._count.invitationGuests + names.length > MAX_INVITATION_GUESTS) {
      throw new ConflictException(
        `An invitation can contain up to ${MAX_INVITATION_GUESTS} guests`,
      );
    }
    const recipientType = dto.recipientType as InvitationRecipientType;
    return this.prisma.$transaction(
      names.map((displayName) =>
        this.prisma.momentInvitationGuest.create({
          data: {
            momentId,
            displayName,
            recipientType,
            maxGuests: dto.maxGuests,
            // Opaque tokens keep guest names and database IDs out of shared URLs.
            token: randomBytes(18).toString('base64url'),
          },
          select: {
            id: true,
            token: true,
            displayName: true,
            recipientType: true,
            maxGuests: true,
            sentAt: true,
          },
        }),
      ),
    );
  }

  async listInvitationGuests(userId: string, momentId: string) {
    const moment = await this.prisma.moment.findFirst({
      where: {
        id: momentId,
        creatorId: userId,
        occasion: MomentOccasion.INVITATION,
      },
      select: { id: true },
    });
    if (!moment) throw new NotFoundException('Invitation not found');
    return this.prisma.momentInvitationGuest.findMany({
      where: { momentId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        token: true,
        displayName: true,
        recipientType: true,
        maxGuests: true,
        sentAt: true,
        rsvp: {
          select: {
            choice: true,
            guestCount: true,
            note: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async markInvitationGuestSent(
    userId: string,
    momentId: string,
    guestId: string,
  ) {
    const result = await this.prisma.momentInvitationGuest.updateMany({
      where: { id: guestId, momentId, moment: { creatorId: userId } },
      data: { sentAt: new Date() },
    });
    if (!result.count)
      throw new NotFoundException('Invitation guest not found');
    return { sent: true };
  }

  async getPersonalInvitation(token: string) {
    const guest = await this.prisma.momentInvitationGuest.findUnique({
      where: { token },
      select: {
        token: true,
        displayName: true,
        recipientType: true,
        maxGuests: true,
        moment: { select: { slug: true } },
      },
    });
    if (!guest) throw new NotFoundException('Invitation not found');
    const moment = await this.getPublic(guest.moment.slug);
    return {
      ...moment,
      invitationGuest: {
        token: guest.token,
        displayName: guest.displayName,
        recipientType: guest.recipientType,
        maxGuests: guest.maxGuests,
      },
    };
  }

  async respondToInvitation(slug: string, dto: RespondMomentRsvpDto) {
    const moment = await this.prisma.moment.findUnique({ where: { slug } });
    this.assertPublic(moment);
    if (moment.occasion !== MomentOccasion.INVITATION) {
      throw new NotFoundException('Invitation not found');
    }
    if (!dto.responseToken && !dto.guestToken) {
      throw new BadRequestException('An RSVP response token is required');
    }
    const personalizedGuest = dto.guestToken
      ? await this.prisma.momentInvitationGuest.findFirst({
          where: { token: dto.guestToken, momentId: moment.id },
          select: { id: true, displayName: true, maxGuests: true },
        })
      : null;
    if (dto.guestToken && !personalizedGuest) {
      throw new NotFoundException('Invitation guest not found');
    }
    const rawResponseToken = dto.guestToken ?? dto.responseToken!;
    const responseKey = createHash('sha256').update(rawResponseToken).digest('hex');
    const choice = dto.choice as MomentRsvpChoice;
    const guestCount = choice === MomentRsvpChoice.NO ? 0 : dto.guestCount;
    if (choice !== MomentRsvpChoice.NO && guestCount < 1) {
      throw new BadRequestException(
        'Attending guests must include at least one person',
      );
    }
    if (personalizedGuest && guestCount > personalizedGuest.maxGuests) {
      throw new BadRequestException(
        `This invitation allows up to ${personalizedGuest.maxGuests} guests`,
      );
    }
    const where: Prisma.MomentRsvpWhereUniqueInput = personalizedGuest
      ? { guestId: personalizedGuest.id }
      : { momentId_responseKey: { momentId: moment.id, responseKey } };
    const response = await this.prisma.momentRsvp.upsert({
      where,
      create: {
        momentId: moment.id,
        responseKey,
        guestId: personalizedGuest?.id,
        choice,
        guestName:
          personalizedGuest?.displayName ?? (dto.guestName?.trim() || null),
        guestCount,
        note: dto.note?.trim() || null,
      },
      update: {
        choice,
        guestName:
          personalizedGuest?.displayName ?? (dto.guestName?.trim() || null),
        guestCount,
        note: dto.note?.trim() || null,
      },
      select: { choice: true, guestCount: true, updatedAt: true },
    });
    return response;
  }

  async respondToVote(
    slug: string,
    dto: RespondMomentVoteDto,
    user: CurrentUser | null,
  ) {
    const moment = await this.prisma.moment.findUnique({
      where: { slug },
      include: { blocks: { where: { type: MomentBlockType.POLL } } },
    });
    this.assertVotingOpen(moment);
    const poll = this.readPollDefinition(moment.blocks[0]?.data);
    if (!poll || !poll.options.some((option) => option.id === dto.optionId)) {
      throw new BadRequestException('Choose a valid poll option');
    }
    const identityMode = poll.identityMode;
    if (identityMode === 'LOGIN_REQUIRED' && !user) {
      throw new UnauthorizedException('Log in to vote in this poll');
    }
    if (identityMode !== 'LOGIN_REQUIRED' && !dto.responseToken) {
      throw new BadRequestException('A vote response token is required');
    }
    let voterName = dto.voterName?.trim() ?? '';
    if (identityMode === 'NAME_REQUIRED' && !voterName) {
      throw new BadRequestException('Your name is required for this vote');
    }
    if (identityMode === 'LOGIN_REQUIRED') {
      const account = await this.prisma.user.findUnique({
        where: { id: user!.id },
        select: { name: true },
      });
      voterName = account?.name?.trim() || 'ChlatWork member';
    }
    const identityKey =
      identityMode === 'LOGIN_REQUIRED'
        ? `account:${user!.id}`
        : dto.responseToken!;
    return this.savePollVote(
      moment.id,
      poll,
      dto.optionId,
      identityKey,
      voterName,
    );
  }

  async respondToTelegramVote(
    momentId: string,
    optionId: string,
    voter: TelegramMomentVoter,
  ): Promise<TelegramMomentPoll> {
    const moment = await this.prisma.moment.findUnique({
      where: { id: momentId },
      include: { blocks: { where: { type: MomentBlockType.POLL }, take: 1 } },
    });
    this.assertVotingOpen(moment);
    const poll = this.readPollDefinition(moment.blocks[0]?.data);
    if (!poll || !poll.options.some((option) => option.id === optionId)) {
      throw new BadRequestException('Choose a valid poll option');
    }
    if (poll.identityMode === 'LOGIN_REQUIRED' && !voter.linkedUserId) {
      throw new UnauthorizedException(
        'Connect your ChlatWork account to vote in this poll',
      );
    }

    let voterName = voter.displayName.trim() || 'Telegram voter';
    if (poll.identityMode === 'LOGIN_REQUIRED') {
      const account = await this.prisma.user.findUnique({
        where: { id: voter.linkedUserId! },
        select: { name: true },
      });
      voterName = account?.name?.trim() || 'ChlatWork member';
    }
    const identityKey =
      poll.identityMode === 'LOGIN_REQUIRED'
        ? `account:${voter.linkedUserId!}`
        : `telegram:${voter.telegramUserId}`;
    await this.savePollVote(
      moment.id,
      poll,
      optionId,
      identityKey,
      voterName,
    );
    return this.toTelegramPollView(moment, poll);
  }

  async resetVotes(userId: string, momentId: string) {
    const moment = await this.prisma.moment.findFirst({
      where: {
        id: momentId,
        creatorId: userId,
        occasion: MomentOccasion.VOTING,
      },
      select: {
        id: true,
        blocks: {
          where: { type: MomentBlockType.POLL },
          select: { data: true },
          take: 1,
        },
      },
    });
    const poll = this.readPollDefinition(moment?.blocks[0]?.data);
    if (!moment || !poll) throw new NotFoundException('Poll not found');

    // Reset responses only; the published poll and its share link remain active.
    await this.prisma.momentVote.deleteMany({ where: { momentId: moment.id } });
    return this.getPollSummary(moment.id, poll.options, poll.identityMode);
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

    const pollBlock = moment.blocks.find(
      (block) => block.type === MomentBlockType.POLL,
    );
    const pollData = pollBlock?.data as
      | {
          identityMode?: string;
          requireName?: boolean;
          options?: Array<{ id: string; label: string }>;
        }
      | undefined;
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
      ...(pollData?.options
        ? {
            pollSummary: await this.getPollSummary(
              moment.id,
              pollData.options,
              pollData.identityMode ??
                (pollData.requireName ? 'NAME_REQUIRED' : 'ANONYMOUS'),
            ),
          }
        : {}),
    };
  }

  private async getPollSummary(
    momentId: string,
    options: Array<{ id: string; label?: string }>,
    identityMode: string,
  ) {
    const groups = await this.prisma.momentVote.groupBy({
      by: ['optionId'],
      where: { momentId },
      _count: { _all: true },
    });
    const namedVotes =
      identityMode !== 'ANONYMOUS'
        ? await this.prisma.momentVote.findMany({
            where: { momentId },
            orderBy: { updatedAt: 'asc' },
            select: { optionId: true, voterName: true },
          })
        : [];
    const results = options.map((option) => ({
      optionId: option.id,
      label: option.label ?? '',
      votes:
        groups.find((group) => group.optionId === option.id)?._count._all ?? 0,
      ...(identityMode !== 'ANONYMOUS'
        ? {
            voters: namedVotes
              .filter((vote) => vote.optionId === option.id)
              .flatMap((vote) => (vote.voterName ? [vote.voterName] : [])),
          }
        : {}),
    }));
    return {
      totalVotes: results.reduce((total, result) => total + result.votes, 0),
      identityMode,
      results,
    };
  }

  private async savePollVote(
    momentId: string,
    poll: MomentPollDefinition,
    optionId: string,
    identityKey: string,
    voterName: string,
  ) {
    const responseKey = createHash('sha256').update(identityKey).digest('hex');
    const storedName =
      poll.identityMode === 'ANONYMOUS' ? null : voterName.trim() || null;
    await this.prisma.momentVote.upsert({
      where: { momentId_responseKey: { momentId, responseKey } },
      // A stable cross-channel identity changes a choice without adding a voter.
      create: { momentId, responseKey, optionId, voterName: storedName },
      update: { optionId, voterName: storedName },
    });
    return this.getPollSummary(momentId, poll.options, poll.identityMode);
  }

  private async toTelegramPollView(
    moment: { id: string; slug: string; title: string },
    poll: MomentPollDefinition,
  ): Promise<TelegramMomentPoll> {
    const summary = await this.getPollSummary(
      moment.id,
      poll.options,
      poll.identityMode,
    );
    return {
      id: moment.id,
      slug: moment.slug,
      title: moment.title,
      question: poll.question,
      identityMode: poll.identityMode,
      totalVotes: summary.totalVotes,
      results: summary.results.map(({ optionId, label, votes }) => ({
        optionId,
        label,
        votes,
      })),
    };
  }

  private readPollDefinition(value: Prisma.JsonValue | undefined) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Prisma.JsonObject;
    const question =
      typeof record.question === 'string' ? record.question.trim() : '';
    const rawOptions = Array.isArray(record.options) ? record.options : [];
    const options = rawOptions.flatMap((option) => {
      if (!option || typeof option !== 'object' || Array.isArray(option))
        return [];
      const candidate = option as Prisma.JsonObject;
      const id = typeof candidate.id === 'string' ? candidate.id : '';
      const label =
        typeof candidate.label === 'string' ? candidate.label.trim() : '';
      return /^option-\d+$/.test(id) && label ? [{ id, label }] : [];
    });
    const rawIdentityMode = record.identityMode;
    const identityMode: MomentPollIdentityMode =
      rawIdentityMode === 'NAME_REQUIRED' || rawIdentityMode === 'LOGIN_REQUIRED'
        ? rawIdentityMode
        : record.requireName === true
          ? 'NAME_REQUIRED'
          : 'ANONYMOUS';
    if (!question || options.length < 2 || options.length > 10) return null;
    return { question, identityMode, options };
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

  private assertVotingOpen(
    moment:
      | {
          status: MomentStatus;
          expiresAt: Date | null;
          publishAt: Date | null;
          occasion: MomentOccasion;
        }
      | null,
  ): asserts moment is NonNullable<typeof moment> {
    this.assertPublic(moment);
    if (moment.occasion !== MomentOccasion.VOTING) {
      throw new NotFoundException('Poll not found');
    }
    if (moment.publishAt && moment.publishAt > new Date()) {
      throw new BadRequestException('Voting has not opened yet');
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

async function normalizeMomentImage(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/webp') return buffer;

  try {
    const image = await loadImage(buffer);
    if (image.width * image.height > 40_000_000) {
      throw new BadRequestException(
        'Moment photos cannot exceed 40 megapixels',
      );
    }
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = createCanvas(width, height);
    canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    const converted = await canvas.encode('webp', 82);
    if (converted.length > MAX_MOMENT_IMAGE_BYTES) {
      throw new BadRequestException(
        'Each Moment image must be 10MB or smaller after conversion',
      );
    }
    return converted;
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException('This image could not be converted to WebP');
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
