import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PersonalReminderStatus, PersonalTaskStatus } from '@prisma/client';
import { PersonalMemoryService } from './memory.service';
import { PersonalReminderService } from './reminder.service';
import { PersonalTaskService } from './task.service';

describe('Personal assistant persistence services', () => {
  it('creates and searches memories with mandatory user ownership and subject filtering', async () => {
    const prisma = {
      personalMemory: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([{ content: 'Likes Dior' }]),
      },
    };
    const service = new PersonalMemoryService(prisma as never);
    await service.create('user-a', {
      content: 'Likes Dior',
      subject: 'O Neth',
    });
    await service.search('user-a', 'Dior', 'O Neth');
    expect(prisma.personalMemory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-a' }),
      }),
    );
    expect(prisma.personalMemory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-a',
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { subject: { contains: 'O Neth', mode: 'insensitive' } },
              ]),
            }),
          ]),
        }),
      }),
    );
  });

  it('falls back to subject memories when natural question wording is not stored', async () => {
    const prisma = {
      personalMemory: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { content: 'Neth has 3 siblings and 3 nieces or nephews.' },
          ]),
      },
    };
    const service = new PersonalMemoryService(prisma as never);

    await expect(
      service.search('user-a', 'how many brothers and sisters', 'Neth'),
    ).resolves.toEqual([
      { content: 'Neth has 3 siblings and 3 nieces or nephews.' },
    ]);
    expect(prisma.personalMemory.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.personalMemory.findMany.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-a',
          OR: expect.arrayContaining([
            { subject: { contains: 'Neth', mode: 'insensitive' } },
            { content: { contains: 'Neth', mode: 'insensitive' } },
          ]),
        }),
      }),
    );
  });

  it('creates and lists open tasks for one user', async () => {
    const prisma = { personalTask: { create: jest.fn(), findMany: jest.fn() } };
    const service = new PersonalTaskService(prisma as never);
    await service.create('user-a', { title: 'Buy gift' });
    await service.list('user-a');
    expect(prisma.personalTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-a',
          status: PersonalTaskStatus.OPEN,
        }),
      }),
    );
  });

  it('cannot complete another user task and cancels linked reminders on completion', async () => {
    const missingTx = {
      personalTask: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const missing = new PersonalTaskService({
      $transaction: (work: (tx: typeof missingTx) => unknown) =>
        work(missingTx),
    } as never);
    await expect(
      missing.complete('user-a', 'other-task'),
    ).rejects.toBeInstanceOf(NotFoundException);

    const tx = {
      personalTask: {
        findFirst: jest.fn().mockResolvedValue({ id: 'task-1' }),
        update: jest.fn().mockResolvedValue({ id: 'task-1' }),
      },
      personalReminder: { updateMany: jest.fn() },
    };
    const service = new PersonalTaskService({
      $transaction: (work: (value: typeof tx) => unknown) => work(tx),
    } as never);
    await service.complete('user-a', 'task-1');
    expect(tx.personalReminder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-a',
          taskId: 'task-1',
          status: PersonalReminderStatus.PENDING,
        },
      }),
    );
  });

  it('validates, lists, and account-scopes reminder cancellation', async () => {
    const prisma = {
      personalReminder: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const service = new PersonalReminderService(prisma as never);
    expect(() =>
      service.create(
        'user-a',
        { message: 'Past', remindAt: new Date('2026-01-01') },
        new Date('2026-02-01'),
      ),
    ).toThrow(BadRequestException);
    await service.list('user-a', PersonalReminderStatus.PENDING);
    expect(prisma.personalReminder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-a', status: PersonalReminderStatus.PENDING },
      }),
    );
    await expect(
      service.cancel('user-a', 'other-reminder'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
