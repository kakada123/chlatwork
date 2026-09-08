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
const ONE_TIME_POLL_DATE = new Date('1970-01-01T00:00:00.000Z');
const POLL_HISTORY_DAY_LIMIT = 30;
// Temporary higher ceiling while Moment media storage is being evaluated.
export const MAX_MOMENT_IMAGE_BYTES = 10 * 1024 * 1024;

export interface MomentUpload {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

type MomentPollIdentityMode = 'ANONYMOUS' | 'NAME_REQUIRED' | 'LOGIN_REQUIRED';

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
  voteDate?: string;
  roundId?: string;
  participants?: string[];
  closesAt?: string;
  closed?: boolean;
  totalVotes: number;
  results: Array<{
    optionId: string;
    label: string;
    votes: number;
    voters?: string[];
  }>;
}

interface VoteScheduleContext {
  enabled: boolean;
  timeZone: string;
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
        voteSchedule: {
          select: {
            enabled: true,
            telegramChatTitle: true,
            timeZone: true,
            sendHour: true,
            sendMinute: true,
            lastSentAt: true,
          },
        },
        _count: { select: { media: true, rsvps: true } },
      },
    });
    return Promise.all(
      moments.map(async (moment) => {
        const { blocks, voteSchedule, ...summary } = moment;
        if (moment.occasion === MomentOccasion.VOTING) {
          const poll = blocks[0]?.data as
            | {
                identityMode?: string;
                requireName?: boolean;
                options?: Array<{ id: string; label: string }>;
              }
            | undefined;
          const voteDate = this.getActiveVoteDate(voteSchedule);
          const pollSummary = poll?.options
            ? await this.getPollSummary(
                moment.id,
                poll.options,
                poll.identityMode ??
                  (poll.requireName ? 'NAME_REQUIRED' : 'ANONYMOUS'),
                voteDate,
              )
            : undefined;
          return {
            ...summary,
            ...(pollSummary ? { pollSummary } : {}),
            ...(voteSchedule
              ? {
                  pollSchedule: {
                    ...voteSchedule,
                    lastSentAt: voteSchedule.lastSentAt?.toISOString() ?? null,
                  },
                }
              : {}),
            ...(poll?.options
              ? {
                  pollInsights: await this.getPollInsights(
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
        voteSchedule: {
          select: { enabled: true, timeZone: true },
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
      include: {
        blocks: { where: { type: MomentBlockType.POLL }, take: 1 },
        voteSchedule: { select: { enabled: true, timeZone: true } },
      },
    });
    this.assertVotingOpen(moment);
    const poll = this.readPollDefinition(moment.blocks[0]?.data);
    if (!poll) throw new NotFoundException('Poll not found');
    return this.toTelegramPollView(moment, poll);
  }

  async getScheduledTelegramVotingMoment(
    momentId: string,
  ): Promise<TelegramMomentPoll> {
    const moment = await this.prisma.moment.findFirst({
      where: { id: momentId, voteSchedule: { enabled: true } },
      include: {
        blocks: { where: { type: MomentBlockType.POLL }, take: 1 },
        voteSchedule: { select: { enabled: true, timeZone: true, telegramChatId: true } },
      },
    });
    this.assertVotingOpen(moment);
    const poll = this.readPollDefinition(moment.blocks[0]?.data);
    if (!poll) throw new NotFoundException('Poll not found');
    const view = await this.toTelegramPollView(moment, poll);
    if (view.roundId) {
      const round = await this.getTelegramVoteRound(view.roundId);
      if (round.telegramChatId !== moment.voteSchedule?.telegramChatId) {
        throw new BadRequestException('Today’s voting round belongs to another group.');
      }
    }
    return view;
  }

  async startTelegramVoteRound(momentId: string, now = new Date()) {
    // The unique local date makes retries reuse the deadline instead of extending voting.
    await this.prisma.$executeRaw`
      WITH inserted AS (
      INSERT INTO moment_vote_rounds (moment_id, vote_date, telegram_chat_id, closes_at)
      SELECT schedule.moment_id, (${now}::timestamptz AT TIME ZONE schedule.time_zone)::date,
        schedule.telegram_chat_id,
        LEAST(${now}::timestamptz + schedule.duration_minutes * INTERVAL '1 minute',
          (((${now}::timestamptz AT TIME ZONE schedule.time_zone)::date + 1)::timestamp
            AT TIME ZONE schedule.time_zone), moment.expires_at)
      FROM moment_vote_schedules schedule
      JOIN moments moment ON moment.id = schedule.moment_id
      WHERE schedule.moment_id = ${momentId}::uuid AND schedule.enabled = TRUE
      ON CONFLICT (moment_id, vote_date) DO NOTHING
      RETURNING id, telegram_chat_id
      )
      INSERT INTO moment_vote_round_members (round_id, telegram_user_id, display_name)
      SELECT inserted.id, member.telegram_user_id, member.display_name
      FROM inserted JOIN telegram_group_members member
        ON member.telegram_chat_id = inserted.telegram_chat_id AND member.is_active = TRUE
    `;
    return this.getScheduledTelegramVotingMoment(momentId);
  }

  async updateDailyTelegramVoteDuration(
    userId: string,
    chatId: number,
    minutes: number,
  ) {
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      throw new BadRequestException('Use /voteduration 30 (1–1440 minutes).');
    }
    const count = await this.prisma.$executeRaw`
      UPDATE moment_vote_schedules schedule SET duration_minutes = ${minutes}, updated_at = NOW()
      FROM moments moment WHERE schedule.moment_id = moment.id
        AND moment.creator_id = ${userId}::uuid AND schedule.telegram_chat_id = ${BigInt(chatId)}
    `;
    if (!count) throw new NotFoundException('Daily poll not found');
  }

  async getTelegramVoteRound(roundId: string) {
    const [round] = await this.prisma.$queryRaw<
      Array<{
        id: string;
        momentId: string;
        voteDate: Date;
        closesAt: Date;
        telegramChatId: bigint;
      }>
    >`
      SELECT id::text, moment_id::text AS "momentId", vote_date AS "voteDate",
        closes_at AS "closesAt", telegram_chat_id AS "telegramChatId"
      FROM moment_vote_rounds WHERE id = ${roundId}::uuid
    `;
    if (!round) throw new NotFoundException('Voting round not found');
    return round;
  }

  async getTelegramVoteRoundResults(
    roundId: string,
  ): Promise<TelegramMomentPoll> {
    const round = await this.getTelegramVoteRound(roundId);
    const moment = await this.prisma.moment.findFirst({
      where: { id: round.momentId, status: MomentStatus.PUBLISHED },
      include: { blocks: { where: { type: MomentBlockType.POLL }, take: 1 } },
    });
    const poll = this.readPollDefinition(moment?.blocks[0]?.data);
    if (!moment || !poll) throw new NotFoundException('Poll not found');
    const summary = await this.getPollSummary(
      moment.id,
      poll.options,
      poll.identityMode,
      round.voteDate,
    );
    return {
      id: moment.id,
      slug: moment.slug,
      title: moment.title,
      question: poll.question,
      ...summary,
      identityMode: poll.identityMode,
      roundId: round.id,
      participants: (await this.getTelegramRoundParticipants(round.id)).map(
        (member) => member.displayName,
      ),
      voteDate: round.voteDate.toISOString().slice(0, 10),
      closesAt: round.closesAt.toISOString(),
      closed: round.closesAt.getTime() <= Date.now(),
    };
  }

  async getTelegramRoundParticipants(roundId: string) {
    return this.prisma.$queryRaw<
      Array<{ telegramUserId: string; displayName: string }>
    >`
      SELECT telegram_user_id AS "telegramUserId", display_name AS "displayName"
      FROM moment_vote_round_members WHERE round_id = ${roundId}::uuid AND joined = TRUE
      ORDER BY telegram_user_id
    `;
  }

  async getFinalTelegramRoundParticipants(roundId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Wait for any opt-out accepted just before closing to commit before calculating shares.
      const [round] = await tx.$queryRaw<Array<{ closesAt: Date }>>`
        SELECT closes_at AS "closesAt" FROM moment_vote_rounds WHERE id = ${roundId}::uuid FOR UPDATE
      `;
      if (!round || round.closesAt.getTime() > Date.now())
        throw new BadRequestException('Wait until voting closes.');
      return tx.$queryRaw<
        Array<{ telegramUserId: string; displayName: string }>
      >`
        SELECT telegram_user_id AS "telegramUserId", display_name AS "displayName"
        FROM moment_vote_round_members WHERE round_id = ${roundId}::uuid AND joined = TRUE
        ORDER BY telegram_user_id
      `;
    });
  }

  async setTelegramRoundParticipation(
    roundId: string,
    chatId: number,
    userId: string,
    displayName: string,
    joined: boolean,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const [round] = await tx.$queryRaw<Array<{ closesAt: Date }>>`
        SELECT closes_at AS "closesAt" FROM moment_vote_rounds
        WHERE id = ${roundId}::uuid AND telegram_chat_id = ${BigInt(chatId)} FOR UPDATE
      `;
      if (!round || round.closesAt.getTime() <= Date.now())
        throw new GoneException('This voting round has closed.');
      await tx.$executeRaw`
        INSERT INTO moment_vote_round_members (round_id, telegram_user_id, display_name, joined)
        VALUES (${roundId}::uuid, ${userId}, ${displayName.slice(0, 80)}, ${joined})
        ON CONFLICT (round_id, telegram_user_id) DO UPDATE
        SET joined = EXCLUDED.joined, display_name = EXCLUDED.display_name
      `;
    });
  }

  private async getVoteTimer(momentId: string, voteDate: Date) {
    const [round] = await this.prisma.$queryRaw<
      Array<{ id: string; closesAt: Date }>
    >`
      SELECT id::text, closes_at AS "closesAt" FROM moment_vote_rounds
      WHERE moment_id = ${momentId}::uuid AND vote_date = ${voteDate}::date
    `;
    return round
      ? {
          roundId: round.id,
          closesAt: round.closesAt.toISOString(),
          closed: round.closesAt.getTime() <= Date.now(),
        }
      : {};
  }

  async configureDailyTelegramVote(
    userId: string,
    momentId: string,
    telegramChatId: number,
    telegramChatTitle?: string,
  ) {
    const [moment, user] = await Promise.all([
      this.prisma.moment.findFirst({
        where: { id: momentId, creatorId: userId },
        select: {
          id: true,
          occasion: true,
          status: true,
          publishAt: true,
          expiresAt: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramNotificationTimeZone: true },
      }),
    ]);
    this.assertVotingOpen(moment);
    if (!Number.isSafeInteger(telegramChatId) || telegramChatId === 0) {
      throw new BadRequestException('Telegram group is invalid');
    }

    const timeZone = user?.telegramNotificationTimeZone || 'Asia/Phnom_Penh';
    await this.prisma.$transaction(async (tx) => {
      const [existingRound] = await tx.$queryRaw<Array<{ telegramChatId: bigint }>>`
        SELECT telegram_chat_id AS "telegramChatId" FROM moment_vote_rounds
        WHERE moment_id = ${momentId}::uuid
          AND vote_date = ${this.formatLocalDate(new Date(), timeZone)}::date
        FOR UPDATE
      `;
      // Moving a schedule must never copy another group's participant roster into this chat.
      if (existingRound && existingRound.telegramChatId !== BigInt(telegramChatId)) {
        throw new BadRequestException('Today’s round belongs to another group. Choose another poll or try tomorrow.');
      }
      // A group has one daily decision poll; choosing a new one moves the schedule cleanly.
      await tx.momentVoteSchedule.deleteMany({
        where: {
          OR: [{ momentId }, { telegramChatId: BigInt(telegramChatId) }],
        },
      });
      await tx.momentVoteSchedule.create({
        data: {
          momentId,
          telegramChatId: BigInt(telegramChatId),
          telegramChatTitle: telegramChatTitle?.trim().slice(0, 120) || null,
          timeZone,
          // Registration sends today's poll immediately, so the scheduler starts again tomorrow.
          lastAttemptDate: new Date(
            `${this.formatLocalDate(new Date(), timeZone)}T00:00:00.000Z`,
          ),
        },
      });
    });

    return this.startTelegramVoteRound(momentId);
  }

  async updateDailyTelegramVoteTime(
    userId: string,
    telegramChatId: number,
    sendHour: number,
    sendMinute: number,
  ) {
    if (
      !Number.isInteger(sendHour) ||
      sendHour < 0 ||
      sendHour > 23 ||
      !Number.isInteger(sendMinute) ||
      sendMinute < 0 ||
      sendMinute > 59
    ) {
      throw new BadRequestException('Use a valid time such as 10:00');
    }
    const result = await this.prisma.momentVoteSchedule.updateMany({
      where: {
        telegramChatId: BigInt(telegramChatId),
        moment: { creatorId: userId },
      },
      data: { sendHour, sendMinute, enabled: true },
    });
    if (!result.count) throw new NotFoundException('Daily poll not found');
    return { updated: true };
  }

  async disableDailyTelegramVote(userId: string, telegramChatId: number) {
    const result = await this.prisma.momentVoteSchedule.updateMany({
      where: {
        telegramChatId: BigInt(telegramChatId),
        moment: { creatorId: userId },
      },
      data: { enabled: false },
    });
    if (!result.count) throw new NotFoundException('Daily poll not found');
    return { disabled: true };
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
    const responseKey = createHash('sha256')
      .update(rawResponseToken)
      .digest('hex');
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
      include: {
        blocks: { where: { type: MomentBlockType.POLL } },
        voteSchedule: { select: { enabled: true, timeZone: true } },
      },
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
      this.getActiveVoteDate(moment.voteSchedule),
    );
  }

  async respondToTelegramVote(
    momentId: string,
    optionId: string,
    voter: TelegramMomentVoter,
    roundId?: string,
  ): Promise<TelegramMomentPoll> {
    const moment = await this.prisma.moment.findUnique({
      where: { id: momentId },
      include: {
        blocks: { where: { type: MomentBlockType.POLL }, take: 1 },
        voteSchedule: { select: { enabled: true, timeZone: true } },
      },
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
      this.getActiveVoteDate(moment.voteSchedule),
      roundId ?? null,
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
        voteSchedule: { select: { enabled: true, timeZone: true } },
      },
    });
    const poll = this.readPollDefinition(moment?.blocks[0]?.data);
    if (!moment || !poll) throw new NotFoundException('Poll not found');

    const voteDate = this.getActiveVoteDate(moment.voteSchedule);
    // Daily history stays intact; reset affects only the currently active round.
    await this.prisma.$transaction(async (tx) => {
      const [round] = await tx.$queryRaw<Array<{ closesAt: Date }>>`
        SELECT closes_at AS "closesAt" FROM moment_vote_rounds
        WHERE moment_id = ${moment.id}::uuid AND vote_date = ${voteDate}::date FOR UPDATE
      `;
      if (round && round.closesAt.getTime() <= Date.now())
        throw new GoneException('Final results cannot be reset.');
      await tx.momentVote.deleteMany({
        where: { momentId: moment.id, voteDate },
      });
    });
    return this.getPollSummary(
      moment.id,
      poll.options,
      poll.identityMode,
      voteDate,
    );
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
        voteSchedule: { select: { enabled: true, timeZone: true } },
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
              this.getActiveVoteDate(moment.voteSchedule),
            ),
          }
        : {}),
    };
  }

  private async getPollSummary(
    momentId: string,
    options: Array<{ id: string; label?: string }>,
    identityMode: string,
    voteDate = ONE_TIME_POLL_DATE,
  ) {
    const timer =
      voteDate.getTime() === ONE_TIME_POLL_DATE.getTime()
        ? {}
        : await this.getVoteTimer(momentId, voteDate);
    const groups = await this.prisma.momentVote.groupBy({
      by: ['optionId'],
      where: { momentId, voteDate },
      _count: { _all: true },
    });
    const namedVotes =
      identityMode !== 'ANONYMOUS'
        ? await this.prisma.momentVote.findMany({
            where: { momentId, voteDate },
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
      ...timer,
      totalVotes: results.reduce((total, result) => total + result.votes, 0),
      identityMode,
      ...(voteDate.getTime() !== ONE_TIME_POLL_DATE.getTime()
        ? { voteDate: voteDate.toISOString().slice(0, 10) }
        : {}),
      results,
    };
  }

  private async getPollInsights(
    momentId: string,
    options: Array<{ id: string; label?: string }>,
    identityMode: string,
  ) {
    const groupedVotes = await this.prisma.momentVote.groupBy({
      by: ['voteDate', 'optionId'],
      where: { momentId, voteDate: { gt: ONE_TIME_POLL_DATE } },
      _count: { _all: true },
      orderBy: { voteDate: 'desc' },
    });
    const allDates = [
      ...new Set(
        groupedVotes.map((group) => group.voteDate.toISOString().slice(0, 10)),
      ),
    ];
    const recentDates = allDates.slice(0, POLL_HISTORY_DAY_LIMIT);
    const namedVotes =
      identityMode !== 'ANONYMOUS' && recentDates.length
        ? await this.prisma.momentVote.findMany({
            where: {
              momentId,
              voteDate: {
                in: recentDates.map(
                  (date) => new Date(`${date}T00:00:00.000Z`),
                ),
              },
            },
            orderBy: { updatedAt: 'asc' },
            select: { voteDate: true, optionId: true, voterName: true },
          })
        : [];
    const optionTotals = new Map<string, number>();
    const daysLed = new Map<string, number>();

    for (const group of groupedVotes) {
      optionTotals.set(
        group.optionId,
        (optionTotals.get(group.optionId) ?? 0) + group._count._all,
      );
    }
    for (const date of allDates) {
      const dayGroups = groupedVotes.filter(
        (group) => group.voteDate.toISOString().slice(0, 10) === date,
      );
      const highest = Math.max(...dayGroups.map((group) => group._count._all));
      const leaders = dayGroups.filter(
        (candidate) => candidate._count._all === highest,
      );
      if (leaders.length === 1) {
        const winner = leaders[0]!;
        daysLed.set(winner.optionId, (daysLed.get(winner.optionId) ?? 0) + 1);
      }
    }

    const optionInsights = options
      .map((option) => ({
        optionId: option.id,
        label: option.label ?? '',
        votes: optionTotals.get(option.id) ?? 0,
        daysLed: daysLed.get(option.id) ?? 0,
      }))
      .sort(
        (left, right) =>
          right.daysLed - left.daysLed ||
          right.votes - left.votes ||
          left.label.localeCompare(right.label),
      );

    const recentDays = recentDates.map((date) => {
      const results = options.map((option) => {
        const votes =
          groupedVotes.find(
            (group) =>
              group.voteDate.toISOString().slice(0, 10) === date &&
              group.optionId === option.id,
          )?._count._all ?? 0;
        return {
          optionId: option.id,
          label: option.label ?? '',
          votes,
          ...(identityMode !== 'ANONYMOUS'
            ? {
                voters: namedVotes
                  .filter(
                    (vote) =>
                      vote.voteDate.toISOString().slice(0, 10) === date &&
                      vote.optionId === option.id,
                  )
                  .flatMap((vote) => (vote.voterName ? [vote.voterName] : [])),
              }
            : {}),
        };
      });
      return {
        date,
        totalVotes: results.reduce((total, result) => total + result.votes, 0),
        results,
      };
    });

    return {
      daysTracked: allDates.length,
      totalVotes: optionInsights.reduce(
        (total, option) => total + option.votes,
        0,
      ),
      topChoice: optionInsights[0]?.votes ? optionInsights[0] : null,
      recentDays,
    };
  }

  private isDailySchedule(
    schedule?: VoteScheduleContext | null,
  ): schedule is VoteScheduleContext {
    return Boolean(schedule);
  }

  private getActiveVoteDate(schedule?: VoteScheduleContext | null) {
    if (!this.isDailySchedule(schedule)) return new Date(ONE_TIME_POLL_DATE);
    return new Date(
      `${this.formatLocalDate(new Date(), schedule.timeZone)}T00:00:00.000Z`,
    );
  }

  private formatLocalDate(date: Date, timeZone: string) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);
      const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value;
      return `${get('year')}-${get('month')}-${get('day')}`;
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }

  private async savePollVote(
    momentId: string,
    poll: MomentPollDefinition,
    optionId: string,
    identityKey: string,
    voterName: string,
    voteDate: Date,
    telegramRoundId?: string | null,
  ) {
    const responseKey = createHash('sha256').update(identityKey).digest('hex');
    const storedName =
      poll.identityMode === 'ANONYMOUS' ? null : voterName.trim() || null;
    await this.prisma.$transaction(async (tx) => {
      // Serialize the deadline check with finalization so a late write cannot change final results.
      const [round] = await tx.$queryRaw<Array<{ id: string; closesAt: Date }>>`
        SELECT id::text, closes_at AS "closesAt" FROM moment_vote_rounds
        WHERE moment_id = ${momentId}::uuid AND vote_date = ${voteDate}::date FOR UPDATE
      `;
      if (
        round &&
        (round.closesAt.getTime() <= Date.now() ||
          (telegramRoundId !== undefined && telegramRoundId !== round.id))
      ) {
        throw new GoneException('This voting round has closed.');
      }
      if (
        !round &&
        (telegramRoundId || voteDate.getTime() !== ONE_TIME_POLL_DATE.getTime())
      ) {
        throw new GoneException('This voting round is not open.');
      }
      await tx.momentVote.upsert({
        where: {
          momentId_responseKey_voteDate: { momentId, responseKey, voteDate },
        },
        // A stable cross-channel identity changes a choice without adding another vote that day.
        create: {
          momentId,
          responseKey,
          optionId,
          voterName: storedName,
          voteDate,
        },
        update: { optionId, voterName: storedName },
      });
    });
    return this.getPollSummary(
      momentId,
      poll.options,
      poll.identityMode,
      voteDate,
    );
  }

  private async toTelegramPollView(
    moment: {
      id: string;
      slug: string;
      title: string;
      voteSchedule?: VoteScheduleContext | null;
    },
    poll: MomentPollDefinition,
  ): Promise<TelegramMomentPoll> {
    const summary = await this.getPollSummary(
      moment.id,
      poll.options,
      poll.identityMode,
      this.getActiveVoteDate(moment.voteSchedule),
    );
    return {
      id: moment.id,
      slug: moment.slug,
      title: moment.title,
      question: poll.question,
      identityMode: poll.identityMode,
      ...(this.isDailySchedule(moment.voteSchedule)
        ? {
            voteDate: this.formatLocalDate(
              new Date(),
              moment.voteSchedule.timeZone,
            ),
          }
        : {}),
      ...(summary.roundId
        ? {
            roundId: summary.roundId,
            closesAt: summary.closesAt,
            closed: summary.closed,
            participants: (
              await this.getTelegramRoundParticipants(summary.roundId)
            ).map((member) => member.displayName),
          }
        : {}),
      totalVotes: summary.totalVotes,
      results: summary.results.map(({ optionId, label, votes, voters }) => ({
        optionId,
        label,
        votes,
        ...(voters ? { voters } : {}),
      })),
    };
  }

  private readPollDefinition(value: Prisma.JsonValue | undefined) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return null;
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
      rawIdentityMode === 'NAME_REQUIRED' ||
      rawIdentityMode === 'LOGIN_REQUIRED'
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
    moment: {
      status: MomentStatus;
      expiresAt: Date | null;
      publishAt: Date | null;
      occasion: MomentOccasion;
    } | null,
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
