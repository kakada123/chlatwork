import { NotFoundException } from '@nestjs/common';
import { WorkTasksService } from './work-tasks.service';
import { WorkTasksStore } from './work-tasks.store';
function setup() {
  const db: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'owner' }]),
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ telegramNotificationTimeZone: 'Asia/Phnom_Penh' }),
    },
    workTask: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    workTaskEvent: { create: jest.fn() },
    workObjective: { count: jest.fn() },
    workProject: { findFirst: jest.fn() },
    workTaskObjective: { deleteMany: jest.fn() },
    workSubtask: { create: jest.fn() },
    workFollowUp: { create: jest.fn() },
  };
  db.$transaction = (fn: any) => fn(db);
  const store = new WorkTasksStore(db);
  return { db, service: new WorkTasksService(store) };
}
describe('Tasks private data and completion history', () => {
  it('cannot read another owner task', async () => {
    const { db, service } = setup();
    db.workTask.findFirst.mockResolvedValue(null);
    await expect(service.detail('owner', 'foreign')).rejects.toThrow(
      NotFoundException,
    );
    expect(db.workTask.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'foreign', userId: 'owner' } }),
    );
  });
  it('rejects foreign objectives before creating a task', async () => {
    const { db, service } = setup();
    db.workObjective.count.mockResolvedValue(0);
    await expect(
      service.create('owner', { title: 'Task', objectiveIds: ['foreign'] }),
    ).rejects.toThrow(NotFoundException);
    expect(db.workTask.create).not.toHaveBeenCalled();
  });
  it('logs actual past work as completed and writes an audit snapshot', async () => {
    const { db, service } = setup();
    db.workTask.create.mockImplementation(async ({ data }: any) => ({
      id: 'task',
      ...data,
    }));
    await service.logWork('owner', {
      title: 'POS fix',
      completedAt: '2026-11-01T08:00:00Z',
      impact: 'Correct checkout totals',
    });
    const call = db.workTask.create.mock.calls[0][0].data;
    expect(call.status).toBe('DONE');
    expect(call.completedAt).toEqual(new Date('2026-11-01T08:00:00Z'));
    expect(call.events.create.type).toBe('COMPLETED');
    expect(call.events.create.snapshot.impact).toBe('Correct checkout totals');
  });
  it('reopens without deleting previous completion events', async () => {
    const { db, service } = setup();
    db.workTask.findFirst.mockResolvedValue({
      id: 'task',
      userId: 'owner',
      title: 'Task',
      status: 'DONE',
      completedAt: new Date('2026-11-01'),
      projectId: null,
    });
    db.workTask.update.mockImplementation(async ({ data }: any) => ({
      id: 'task',
      ...data,
    }));
    const updated = await service.update('owner', 'task', {
      status: 'PLANNED',
    });
    expect(updated.completedAt).toBeNull();
    expect(db.workTaskEvent.create.mock.calls[0][0].data.type).toBe('REOPENED');
  });
  it('cannot add a follow-up under another user task', async () => {
    const { db, service } = setup();
    db.workTask.findFirst.mockResolvedValue(null);
    await expect(
      service.addFollowUp('owner', 'foreign', {
        followUpAt: '2099-01-01T00:00:00Z',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(db.workFollowUp.create).not.toHaveBeenCalled();
  });
});

describe('Tasks filtering and independent follow-ups', () => {
  it('never widens Archive scope when another status is selected', async () => {
    const { db, service } = setup();
    db.workTask.findMany = jest.fn().mockResolvedValue([]);
    db.workTask.count = jest.fn().mockResolvedValue(0);
    await service.list('owner', {
      scope: 'ARCHIVED',
      status: 'PLANNED',
      page: 1,
      limit: 20,
    });
    expect(db.workTask.findMany.mock.calls[0][0].where.AND).toContainEqual({
      status: 'ARCHIVED',
    });
  });
  it('retains the completed-only predicate with an explicit status filter', async () => {
    const { db, service } = setup();
    db.workTask.findMany = jest.fn().mockResolvedValue([]);
    db.workTask.count = jest.fn().mockResolvedValue(0);
    await service.list('owner', {
      scope: 'COMPLETED',
      status: 'ARCHIVED',
      page: 1,
      limit: 20,
    });
    expect(db.workTask.findMany.mock.calls[0][0].where.AND).toContainEqual({
      OR: [{ status: 'DONE' }, { status: 'ARCHIVED', previousStatus: 'DONE' }],
    });
  });
  it('allows note edits with an unchanged past reminder without resending it', async () => {
    const { db, service } = setup();
    const prior = new Date('2026-01-01');
    db.workFollowUp.findFirst = jest.fn().mockResolvedValue({
      id: 'follow',
      taskId: 'task',
      remindAt: prior,
      dismissedAt: prior,
    });
    db.workFollowUp.update = jest
      .fn()
      .mockImplementation(async ({ data }: any) => data);
    await expect(
      service.followUp('owner', 'follow', {
        note: 'Verified logs',
        remindAt: prior.toISOString(),
      }),
    ).resolves.toMatchObject({ note: 'Verified logs', remindAt: prior });
  });
});
