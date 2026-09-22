import { MomentOccasion } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { MomentsService } from './moments.service';
import { createCanvas } from '@napi-rs/canvas';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateMomentPollOptionsDto } from './dto/update-moment-poll-options.dto';

const MOMENT_ID = '00000000-0000-4000-8000-000000000001';
const USER_ID = '00000000-0000-4000-8000-000000000002';

function createService(moment: object | null) {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
    moment: { findFirst: jest.fn().mockResolvedValue(moment) },
    momentVote: {
      deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  prisma.$transaction.mockImplementation((work) => work(prisma));
  return { service: new MomentsService(prisma as never), prisma };
}

describe('MomentsService vote reset', () => {
  it('removes only the selected owner poll responses and returns zeroed results', async () => {
    const { service, prisma } = createService({
      id: MOMENT_ID,
      blocks: [
        {
          data: {
            question: 'Where should we eat?',
            identityMode: 'ANONYMOUS',
            options: [
              { id: 'option-1', label: 'Khmer food' },
              { id: 'option-2', label: 'Pizza' },
            ],
          },
        },
      ],
    });

    await expect(service.resetVotes(USER_ID, MOMENT_ID)).resolves.toEqual({
      totalVotes: 0,
      identityMode: 'ANONYMOUS',
      results: [
        { optionId: 'option-1', label: 'Khmer food', votes: 0 },
        { optionId: 'option-2', label: 'Pizza', votes: 0 },
      ],
    });
    expect(prisma.moment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: MOMENT_ID,
          creatorId: USER_ID,
          occasion: MomentOccasion.VOTING,
        },
      }),
    );
    expect(prisma.momentVote.deleteMany).toHaveBeenCalledWith({
      where: {
        momentId: MOMENT_ID,
        voteDate: new Date('1970-01-01T00:00:00.000Z'),
      },
    });
  });

  it('resets only the active local day when daily voting is enabled', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-04T03:00:00.000Z'));
    const { service, prisma } = createService({
      id: MOMENT_ID,
      voteSchedule: { enabled: true, timeZone: 'Asia/Phnom_Penh' },
      blocks: [
        {
          data: {
            question: 'Where should we eat?',
            identityMode: 'NAME_REQUIRED',
            options: [
              { id: 'option-1', label: 'Khmer food' },
              { id: 'option-2', label: 'Pizza' },
            ],
          },
        },
      ],
    });

    await service.resetVotes(USER_ID, MOMENT_ID);

    expect(prisma.momentVote.deleteMany).toHaveBeenCalledWith({
      where: {
        momentId: MOMENT_ID,
        voteDate: new Date('2026-09-04T00:00:00.000Z'),
      },
    });
    jest.useRealTimers();
  });

  it('does not delete votes when the owner poll is unavailable', async () => {
    const { service, prisma } = createService(null);

    await expect(service.resetVotes(USER_ID, MOMENT_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.momentVote.deleteMany).not.toHaveBeenCalled();
  });
});

describe('MomentsService poll choice editing', () => {
  const poll = {
    question: 'Where should we eat?',
    identityMode: 'ANONYMOUS',
    options: [
      { id: 'option-1', label: 'Pizza' },
      { id: 'option-2', label: 'Rice' },
      { id: 'option-3', label: 'Noodles' },
    ],
  };

  function setup() {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: MOMENT_ID }]),
      $transaction: jest.fn(),
      momentBlock: {
        findFirst: jest.fn().mockResolvedValue({ id: 'block-id', data: poll }),
        update: jest.fn(),
      },
      momentVoteRound: { findFirst: jest.fn().mockResolvedValue(null) },
      momentVote: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    prisma.$transaction.mockImplementation((work) => work(prisma));
    return { service: new MomentsService(prisma as never), prisma };
  }

  it('saves a renamed choice and removes an unused choice without changing stable IDs', async () => {
    const { service, prisma } = setup();
    await service.updatePollOptions(USER_ID, MOMENT_ID, {
      options: [
        { id: 'option-1', label: '  Pizza place  ' },
        { id: 'option-2', label: 'Rice' },
      ],
    });
    expect(prisma.momentBlock.update).toHaveBeenCalledWith({
      where: { id: 'block-id' },
      data: {
        data: {
          question: poll.question,
          identityMode: poll.identityMode,
          options: [
            { id: 'option-1', label: 'Pizza place' },
            { id: 'option-2', label: 'Rice' },
          ],
        },
      },
    });
  });

  it('adds a choice with a server-assigned ID while preserving saved images', async () => {
    const { service, prisma } = setup();
    const imageId = '00000000-0000-4000-8000-000000000003';
    prisma.momentBlock.findFirst.mockResolvedValue({
      id: 'block-id',
      data: { ...poll, options: [{ ...poll.options[0], imageId }, ...poll.options.slice(1)] },
    });
    await service.updatePollOptions(USER_ID, MOMENT_ID, {
      expectedOptionIds: poll.options.map((option) => option.id),
      options: [...poll.options, { label: 'Salad' }],
    });

    expect(prisma.momentBlock.update).toHaveBeenCalledWith({
      where: { id: 'block-id' },
      data: { data: {
        question: poll.question,
        identityMode: poll.identityMode,
        options: [
          { ...poll.options[0], imageId },
          poll.options[1],
          poll.options[2],
          { id: 'option-4', label: 'Salad' },
        ],
      } },
    });
    expect(prisma.momentVote.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a stale choice list before adding', async () => {
    const { service, prisma } = setup();
    await expect(service.updatePollOptions(USER_ID, MOMENT_ID, {
      expectedOptionIds: ['option-1', 'option-2'],
      options: [...poll.options, { label: 'Salad' }],
    })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.momentBlock.update).not.toHaveBeenCalled();
  });

  it('does not add a choice during an active Telegram round', async () => {
    const { service, prisma } = setup();
    prisma.momentVoteRound.findFirst.mockResolvedValue({ id: 'round-id' });
    await expect(service.updatePollOptions(USER_ID, MOMENT_ID, {
      expectedOptionIds: poll.options.map((option) => option.id),
      options: [...poll.options, { label: 'Salad' }],
    })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.momentBlock.update).not.toHaveBeenCalled();
  });

  it('allows the fifteenth choice but rejects a sixteenth', async () => {
    const { service, prisma } = setup();
    const options = Array.from({ length: 14 }, (_, index) => ({
      id: `option-${index + 1}`,
      label: `Choice ${index + 1}`,
    }));
    prisma.momentBlock.findFirst.mockResolvedValue({
      id: 'block-id',
      data: { ...poll, options },
    });
    const expectedOptionIds = options.map((option) => option.id);
    await service.updatePollOptions(USER_ID, MOMENT_ID, {
      expectedOptionIds,
      options: [...options, { label: 'Choice 15' }],
    });
    expect(prisma.momentBlock.update).toHaveBeenCalledWith({
      where: { id: 'block-id' },
      data: { data: { ...poll, options: [...options, { id: 'option-15', label: 'Choice 15' }] } },
    });
    await expect(service.updatePollOptions(USER_ID, MOMENT_ID, {
      expectedOptionIds,
      options: [...options, { label: 'Choice 15' }, { label: 'Choice 16' }],
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts omitted IDs only for new choices', () => {
    const valid = plainToInstance(UpdateMomentPollOptionsDto, {
      expectedOptionIds: ['option-1', 'option-2'],
      options: [{ id: 'option-1', label: 'Pizza' }, { label: 'Salad' }],
    });
    expect(validateSync(valid)).toEqual([]);
    const invalid = plainToInstance(UpdateMomentPollOptionsDto, {
      options: [{ id: 'new-1', label: 'Pizza' }, { label: 'Salad' }],
    });
    expect(validateSync(invalid)).not.toEqual([]);
  });

  it('rejects non-owners and does not write', async () => {
    const { service, prisma } = setup();
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(
      service.updatePollOptions(USER_ID, MOMENT_ID, {
        options: poll.options,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.momentBlock.update).not.toHaveBeenCalled();
  });

  it('preserves choices with ballots and blocks changes during an active round', async () => {
    const dto = { options: poll.options.slice(0, 2) };
    const used = setup();
    used.prisma.momentVote.findFirst.mockResolvedValue({ id: 'vote-id' });
    await expect(
      used.service.updatePollOptions(USER_ID, MOMENT_ID, dto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(used.prisma.momentBlock.update).not.toHaveBeenCalled();

    const active = setup();
    active.prisma.momentVoteRound.findFirst.mockResolvedValue({
      id: 'round-id',
    });
    await expect(
      active.service.updatePollOptions(USER_ID, MOMENT_ID, dto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(active.prisma.momentBlock.update).not.toHaveBeenCalled();
  });

  it('keeps at least two choices and rejects duplicate labels', async () => {
    const { service, prisma } = setup();
    await expect(
      service.updatePollOptions(USER_ID, MOMENT_ID, {
        options: poll.options.slice(0, 1),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updatePollOptions(USER_ID, MOMENT_ID, {
        options: [poll.options[0], { id: 'option-2', label: 'pizza' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('accepts fifteen saved choices and rejects a sixteenth', async () => {
    const { service, prisma } = setup();
    const options = Array.from({ length: 15 }, (_, index) => ({
      id: `option-${index + 1}`,
      label: `Choice ${index + 1}`,
    }));
    prisma.momentBlock.findFirst.mockResolvedValue({
      id: 'block-id',
      data: { ...poll, options },
    });

    await expect(service.updatePollOptions(USER_ID, MOMENT_ID, { options }))
      .resolves.toEqual({ updated: true });
    await expect(service.updatePollOptions(USER_ID, MOMENT_ID, {
      options: [...options, { id: 'option-16', label: 'Choice 16' }],
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects option IDs that were not part of the saved poll', async () => {
    const { service, prisma } = setup();
    await expect(
      service.updatePollOptions(USER_ID, MOMENT_ID, {
        options: [
          poll.options[0]!,
          { id: 'option-99', label: 'Injected choice' },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.momentBlock.update).not.toHaveBeenCalled();
  });
});

describe('MomentsService poll choice images', () => {
  it('replaces only the selected choice image under the owner lock', async () => {
    const oldImageId = '00000000-0000-4000-8000-000000000003';
    const newImageId = '00000000-0000-4000-8000-000000000004';
    const poll = {
      question: 'Lunch?', identityMode: 'ANONYMOUS',
      options: [
        { id: 'option-1', label: 'Pizza', imageId: oldImageId },
        { id: 'option-2', label: 'Rice' },
      ],
    };
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: MOMENT_ID, slug: 'lunch' }]),
      $transaction: jest.fn(),
      moment: { findUnique: jest.fn().mockResolvedValue({
        creatorId: USER_ID, occasion: MomentOccasion.VOTING,
      }) },
      momentBlock: {
        findFirst: jest.fn().mockResolvedValue({ id: 'block-id', data: poll }),
        update: jest.fn(),
      },
      momentVoteRound: { findFirst: jest.fn().mockResolvedValue(null) },
      momentMedia: {
        findFirst: jest.fn().mockResolvedValue({ position: 0 }),
        create: jest.fn().mockResolvedValue({ id: newImageId }),
        deleteMany: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation((work) => work(prisma));
    const image = createCanvas(2, 2);
    const buffer = Buffer.from(await image.encode('png'));
    const service = new MomentsService(prisma as never);
    await expect(service.setPollOptionImage(USER_ID, MOMENT_ID, 'option-1', {
      buffer, mimetype: 'image/png', originalname: 'lunch.png', size: buffer.length,
    })).resolves.toEqual({
      imageId: newImageId,
      imageUrl: `/api/moments/lunch/media/${newImageId}`,
    });
    expect(prisma.momentBlock.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { data: { ...poll, options: [
        { id: 'option-1', label: 'Pizza', imageId: newImageId },
        { id: 'option-2', label: 'Rice' },
      ] } },
    }));
    expect(prisma.momentMedia.deleteMany).toHaveBeenCalledWith({
      where: { id: oldImageId, momentId: MOMENT_ID },
    });
  });

  it('serves a linked poll icon as a JPEG for the Telegram winner photo', async () => {
    const imageId = '00000000-0000-4000-8000-000000000004';
    const canvas = createCanvas(2, 2);
    canvas.getContext('2d').fillRect(0, 0, 2, 2);
    const content = await canvas.encode('webp', 82);
    const prisma = {
      momentMedia: { findFirst: jest.fn().mockResolvedValue({
        id: imageId, momentId: MOMENT_ID, content,
        mimeType: 'image/webp',
        moment: {
          status: 'PUBLISHED', expiresAt: null, publishAt: null,
          occasion: MomentOccasion.VOTING,
        },
      }) },
      momentBlock: { findFirst: jest.fn().mockResolvedValue({ data: {
        question: 'Lunch?', identityMode: 'ANONYMOUS',
        options: [
          { id: 'option-1', label: 'Pizza', imageId },
          { id: 'option-2', label: 'Rice' },
        ],
      } }) },
    };
    const media = await new MomentsService(prisma as never).getPublicMedia(
      'lunch', imageId, true,
    );
    expect(media.mimeType).toBe('image/jpeg');
    expect(media.content.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  });
});

describe('Timed voting boundaries', () => {
  const roundId = '00000000-0000-4000-8000-000000000003';
  const deadline = new Date('2026-09-08T03:30:00Z');
  const voteDate = new Date('2026-09-08T00:00:00Z');
  const poll = {
    question: 'Lunch?',
    identityMode: 'ANONYMOUS' as const,
    options: [
      { id: 'option-1', label: 'Pizza' },
      { id: 'option-2', label: 'Rice' },
    ],
  };
  function setup() {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([{ id: roundId, closesAt: deadline }]),
      $executeRaw: jest.fn(),
      $transaction: jest.fn(),
      momentBlock: {
        findFirst: jest.fn().mockResolvedValue({ data: poll }),
      },
      momentVote: {
        upsert: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };
    prisma.$transaction.mockImplementation((work) => work(prisma));
    return { prisma, service: new MomentsService(prisma as never) };
  }
  afterEach(() => jest.useRealTimers());

  it.each([undefined, roundId])(
    'rejects web and Telegram votes exactly at the deadline (%s)',
    async (source) => {
      jest.useFakeTimers().setSystemTime(deadline);
      const { prisma, service } = setup();
      await expect(
        service['savePollVote'](
          MOMENT_ID,
          poll,
          'option-1',
          'voter',
          '',
          voteDate,
          source,
        ),
      ).rejects.toBeInstanceOf(GoneException);
      expect(prisma.momentVote.upsert).not.toHaveBeenCalled();
    },
  );

  it('accepts a vote before the deadline and returns the timer', async () => {
    jest.useFakeTimers().setSystemTime(new Date(deadline.getTime() - 1));
    const { prisma, service } = setup();
    const result = await service['savePollVote'](
      MOMENT_ID,
      poll,
      'option-1',
      'voter',
      '',
      voteDate,
      roundId,
    );
    expect(prisma.momentVote.upsert).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      roundId,
      closesAt: deadline.toISOString(),
      closed: false,
    });
    expect(prisma.$queryRaw.mock.calls[0][0].join('')).toContain('FOR UPDATE');
  });

  it.each([null, '00000000-0000-4000-8000-000000000099'])(
    'rejects legacy or stale daily buttons (%s)',
    async (source) => {
      jest.useFakeTimers().setSystemTime(new Date(deadline.getTime() - 1));
      const { prisma, service } = setup();
      await expect(
        service['savePollVote'](
          MOMENT_ID,
          poll,
          'option-1',
          'voter',
          '',
          voteDate,
          source,
        ),
      ).rejects.toBeInstanceOf(GoneException);
      expect(prisma.momentVote.upsert).not.toHaveBeenCalled();
    },
  );

  it('blocks voting before a daily round has opened', async () => {
    const { prisma, service } = setup();
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(
      service['savePollVote'](
        MOMENT_ID,
        poll,
        'option-1',
        'voter',
        '',
        voteDate,
      ),
    ).rejects.toBeInstanceOf(GoneException);
    expect(prisma.momentVote.upsert).not.toHaveBeenCalled();
  });

  it('rejects a choice removed after the voter opened the poll', async () => {
    const { prisma, service } = setup();
    prisma.momentBlock.findFirst.mockResolvedValue({
      data: {
        ...poll,
        options: [
          { id: 'option-2', label: 'Rice' },
          { id: 'option-3', label: 'Noodles' },
        ],
      },
    });
    await expect(
      service['savePollVote'](
        MOMENT_ID,
        poll,
        'option-1',
        'voter',
        '',
        voteDate,
        roundId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.momentVote.upsert).not.toHaveBeenCalled();
  });

  it('allows opting out until the deadline and scopes the lock to the group', async () => {
    jest.useFakeTimers().setSystemTime(new Date(deadline.getTime() - 1));
    const { prisma, service } = setup();
    await service.setTelegramRoundParticipation(
      roundId,
      -100,
      '123',
      'Dara',
      false,
    );
    expect(prisma.$queryRaw.mock.calls[0]).toContain(-100n);
    expect(prisma.$executeRaw.mock.calls[0]).toContain(false);
    jest.setSystemTime(deadline);
    await expect(
      service.setTelegramRoundParticipation(roundId, -100, '123', 'Dara', true),
    ).rejects.toBeInstanceOf(GoneException);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('rejects participation from another chat without modifying the roster', async () => {
    const { prisma, service } = setup();
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(
      service.setTelegramRoundParticipation(
        roundId,
        -200,
        '123',
        'Dara',
        false,
      ),
    ).rejects.toBeInstanceOf(GoneException);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('snapshots joined members only and keeps equal-name identities separate', async () => {
    const { prisma, service } = setup();
    prisma.$queryRaw.mockResolvedValue([
      { telegramUserId: '1', displayName: 'Dara' },
      { telegramUserId: '2', displayName: 'Dara' },
    ]);
    expect(await service.getTelegramRoundParticipants(roundId)).toHaveLength(2);
    expect(prisma.$queryRaw.mock.calls[0][0].join('')).toContain(
      'joined = TRUE',
    );
  });
});
