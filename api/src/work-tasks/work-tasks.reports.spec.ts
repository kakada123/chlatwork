import { NotFoundException } from '@nestjs/common';
import { WorkTasksReports } from './work-tasks.reports';
import { WorkTasksStore } from './work-tasks.store';
function setup() {
  const db: any = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        telegramNotificationTimeZone: 'America/New_York',
      }),
    },
    workProject: { findFirst: jest.fn() },
    workObjective: {
      count: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    workTask: { findMany: jest.fn().mockResolvedValue([]) },
    workFollowUp: { findMany: jest.fn().mockResolvedValue([]) },
    workReport: { findFirst: jest.fn() },
  };
  return { db, reports: new WorkTasksReports(new WorkTasksStore(db)) };
}
const draft = {
  title: 'November MBO',
  from: '2026-11-01',
  to: '2026-11-30',
  summary: 'User-authored summary',
};
describe('MBO private, actual-data reports', () => {
  it('rejects another owner saved report', async () => {
    const { db, reports } = setup();
    db.workReport.findFirst.mockResolvedValue(null);
    await expect(reports.get('owner', 'foreign')).rejects.toThrow(
      NotFoundException,
    );
    expect(db.workReport.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign', userId: 'owner' },
    });
  });
  it('uses the local evaluation range for contributions and follow-ups', async () => {
    const { db, reports } = setup();
    await reports.preview('owner', draft);
    const range = {
      gte: new Date('2026-11-01T04:00:00.000Z'),
      lt: new Date('2026-12-01T05:00:00.000Z'),
    };
    expect(db.workTask.findMany.mock.calls[0][0].where.AND).toContainEqual({
      completedAt: range,
    });
    expect(db.workFollowUp.findMany.mock.calls[0][0].where.followUpAt).toEqual(
      range,
    );
  });
  it('leaves unverified actual metrics blank and deduplicates multi-objective work', async () => {
    const { db, reports } = setup();
    const task = {
      id: 't',
      title: 'POS fix',
      status: 'DONE',
      completedAt: new Date('2026-11-15'),
      impact: '',
      objectives: [
        { objective: { id: 'a', title: 'Reliability' } },
        { objective: { id: 'b', title: 'Quality' } },
      ],
    };
    db.workTask.findMany.mockResolvedValue([task, task]);
    db.workObjective.findMany.mockResolvedValue([
      {
        id: 'a',
        title: 'Reliability',
        periodStart: new Date('2026-10-01'),
        periodEnd: new Date('2026-12-31'),
        targetValue: 100,
        actualValue: 99,
        verifiedAt: null,
        tasks: [{ taskId: 't' }, { taskId: 't' }],
      },
    ]);
    const result = await reports.preview('owner', draft);
    expect(result.contributions).toHaveLength(1);
    expect(result.contributions[0].impact).toBe('');
    expect(result.objectives[0].actualValue).toBeNull();
    expect(result.objectives[0].completedContributions).toBe(1);
    expect(result.draft.summary).toBe('User-authored summary');
  });
  it('does not silently truncate a large export selection', async () => {
    const { db, reports } = setup();
    db.workTask.findMany.mockResolvedValue(
      Array.from({ length: 501 }, (_, n) => ({
        id: String(n),
        status: 'DONE',
      })),
    );
    await expect(reports.preview('owner', draft)).rejects.toThrow(
      /exceeds 500/,
    );
  });
  it('checks ownership of report project/objective filters before reading tasks', async () => {
    const { db, reports } = setup();
    db.workProject.findFirst.mockResolvedValue(null);
    await expect(
      reports.preview('owner', { ...draft, projectId: 'foreign' }),
    ).rejects.toThrow(NotFoundException);
    expect(db.workTask.findMany).not.toHaveBeenCalled();
  });
});
