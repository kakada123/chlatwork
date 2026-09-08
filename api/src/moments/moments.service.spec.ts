import { MomentOccasion } from '@prisma/client';
import { GoneException, NotFoundException } from '@nestjs/common';
import { MomentsService } from './moments.service';

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
