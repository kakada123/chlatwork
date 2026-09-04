import { MomentOccasion } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { MomentsService } from './moments.service';

const MOMENT_ID = '00000000-0000-4000-8000-000000000001';
const USER_ID = '00000000-0000-4000-8000-000000000002';

function createService(moment: object | null) {
  const prisma = {
    moment: { findFirst: jest.fn().mockResolvedValue(moment) },
    momentVote: {
      deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
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
