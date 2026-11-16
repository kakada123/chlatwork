import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { safeUrl } from '../prephub/prephub.domain';
import {
  calendarDate,
  completionChange,
  instant,
  localDay,
  periodBounds,
  taskDoneWhere,
  validTitle,
} from './work-tasks.domain';
import type {
  CreateFollowUpDto,
  CreateTaskDto,
  FollowUpQueryDto,
  ListTasksDto,
  SubtaskDto,
  UpdateFollowUpDto,
  UpdateSubtaskDto,
  UpdateTaskDto,
} from './work-tasks.dto';
import { taskInclude, WorkTasksStore, type WorkTx } from './work-tasks.store';
const taskScalars = (dto: UpdateTaskDto) => {
  const { objectiveIds, completedAt, status, projectId, ...rest } = dto;
  return {
    ...rest,
    ...(dto.title === undefined ? {} : { title: validTitle(dto.title) }),
    ...(dto.category === undefined
      ? {}
      : { category: dto.category.trim() || 'General' }),
    ...(dto.startAt === undefined ? {} : { startAt: instant(dto.startAt) }),
    ...(dto.dueAt === undefined ? {} : { dueAt: instant(dto.dueAt) }),
    ...(dto.evidence === undefined
      ? {}
      : { evidence: dto.evidence.map(safeUrl) }),
    ...(dto.tags === undefined
      ? {}
      : { tags: [...new Set(dto.tags.map((t) => t.trim()).filter(Boolean))] }),
  };
};
@Injectable()
export class WorkTasksService {
  constructor(private readonly store: WorkTasksStore) {}
  private async relations(tx: WorkTx, userId: string, dto: UpdateTaskDto) {
    await this.store.project(tx, userId, dto.projectId);
    await this.store.objectives(tx, userId, dto.objectiveIds);
  }
  async detail(userId: string, id: string) {
    const task = await this.store.db.workTask.findFirst({
      where: { id, userId },
      include: taskInclude,
    });
    if (!task) throw new NotFoundException('Task not found.');
    return task;
  }
  async list(userId: string, q: ListTasksDto) {
    const and: Prisma.WorkTaskWhereInput[] = [{ userId }];
    if (q.scope === 'COMPLETED') and.push(taskDoneWhere);
    if (q.scope === 'ARCHIVED') and.push({ status: 'ARCHIVED' });
    if (q.status) and.push({ status: q.status });
    else if (!['ALL', 'COMPLETED', 'ARCHIVED'].includes(q.scope ?? 'ACTIVE'))
      and.push({ status: { notIn: ['DONE', 'ARCHIVED'] } });
    if (q.focus === 'OVERDUE')
      and.push({
        status: { notIn: ['DONE', 'ARCHIVED'] },
        dueAt: { lt: new Date() },
      });
    if (q.focus === 'DUE_TODAY') {
      const zone = await this.store.zone(userId),
        today = localDay(new Date(), zone),
        range = periodBounds(today, today, zone);
      and.push({
        status: { notIn: ['DONE', 'ARCHIVED'] },
        dueAt: { gte: range.start, lt: range.end },
      });
    }
    if (q.projectId) and.push({ projectId: q.projectId });
    if (q.objectiveId)
      and.push({ objectives: { some: { objectiveId: q.objectiveId } } });
    if (q.category) and.push({ category: q.category });
    if (q.tag) and.push({ tags: { has: q.tag } });
    if (q.q?.trim())
      and.push({
        OR: ['title', 'description', 'summary', 'impact', 'notes'].map(
          (key) => ({ [key]: { contains: q.q!.trim(), mode: 'insensitive' } }),
        ),
      });
    if (q.from || q.to) {
      if (!q.from || !q.to)
        throw new BadRequestException('Choose both period dates.');
      const { start, end } = periodBounds(
        q.from,
        q.to,
        await this.store.zone(userId),
      );
      const range = { gte: start, lt: end };
      and.push(
        q.scope === 'COMPLETED' || q.status === 'DONE' || q.scope === 'ARCHIVED'
          ? { completedAt: range }
          : { OR: [{ dueAt: range }, { startAt: range }] },
      );
    }
    const where = { AND: and };
    const orderBy: Prisma.WorkTaskOrderByWithRelationInput[] =
      q.sort === 'TITLE'
        ? [{ title: 'asc' }, { id: 'asc' }]
        : q.sort === 'DUE'
          ? [
              { dueAt: { sort: 'asc', nulls: 'last' } },
              { updatedAt: 'desc' },
              { id: 'asc' },
            ]
          : q.sort === 'COMPLETED'
            ? [{ completedAt: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }]
            : [{ updatedAt: 'desc' }, { id: 'asc' }];
    const [items, total] = await Promise.all([
      this.store.db.workTask.findMany({
        where,
        include: taskInclude,
        orderBy,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.store.db.workTask.count({ where }),
    ]);
    return { items, total, page: q.page, limit: q.limit };
  }
  create(userId: string, dto: CreateTaskDto) {
    return this.store.write(userId, async (tx) => {
      await this.relations(tx, userId, dto);
      const { event, ...state } = completionChange({}, dto);
      const scalars = taskScalars(dto);
      if (
        scalars.startAt &&
        scalars.dueAt &&
        new Date(scalars.startAt) > new Date(scalars.dueAt)
      )
        throw new BadRequestException(
          'Start time must not follow the due time.',
        );
      return tx.workTask.create({
        data: {
          ...scalars,
          title: validTitle(dto.title),
          ...state,
          userId,
          projectId: dto.projectId ?? null,
          objectives: {
            create: (dto.objectiveIds ?? []).map((objectiveId) => ({
              objectiveId,
            })),
          },
          ...(event
            ? {
                events: {
                  create: {
                    type: event,
                    completedAt: state.completedAt,
                    snapshot: JSON.parse(
                      JSON.stringify({ ...scalars, ...state }),
                    ),
                  },
                },
              }
            : {}),
        },
        include: taskInclude,
      });
    });
  }
  logWork(userId: string, dto: CreateTaskDto) {
    return this.create(userId, { ...dto, status: 'DONE' });
  }
  update(userId: string, id: string, dto: UpdateTaskDto) {
    return this.store.write(userId, async (tx) => {
      const current = await this.store.task(tx, userId, id);
      await this.relations(tx, userId, dto);
      const { event, ...state } = completionChange(current, dto);
      const scalars = taskScalars(dto);
      const startAt =
          scalars.startAt === undefined ? current.startAt : scalars.startAt,
        dueAt = scalars.dueAt === undefined ? current.dueAt : scalars.dueAt;
      if (startAt && dueAt && new Date(startAt) > new Date(dueAt))
        throw new BadRequestException(
          'Start time must not follow the due time.',
        );
      if (dto.objectiveIds !== undefined) {
        await tx.workTaskObjective.deleteMany({ where: { taskId: id } });
      }
      const result = await tx.workTask.update({
        where: { id },
        data: {
          ...scalars,
          ...state,
          ...(dto.projectId === undefined ? {} : { projectId: dto.projectId }),
          ...(dto.objectiveIds === undefined
            ? {}
            : {
                objectives: {
                  create: dto.objectiveIds.map((objectiveId) => ({
                    objectiveId,
                  })),
                },
              }),
        },
        include: taskInclude,
      });
      if (event)
        await tx.workTaskEvent.create({
          data: {
            taskId: id,
            type: event,
            completedAt: state.completedAt,
            snapshot: JSON.parse(
              JSON.stringify({ ...current, ...scalars, ...state }),
            ),
          },
        });
      return result;
    });
  }
  duplicate(userId: string, id: string) {
    return this.store.write(userId, async (tx) => {
      const task = await tx.workTask.findFirst({
        where: { id, userId },
        include: { objectives: true, subtasks: true },
      });
      if (!task) throw new NotFoundException('Task not found.');
      // A duplicate is fresh unfinished work; neither achievements, evidence nor verified impact are copied as new results.
      return tx.workTask.create({
        data: {
          userId,
          title: `${task.title.slice(0, 190)} (copy)`,
          description: task.description,
          category: task.category,
          priority: task.priority,
          projectId: task.projectId,
          notes: task.notes,
          tags: task.tags,
          estimatedMinutes: task.estimatedMinutes,
          objectives: {
            create: task.objectives.map((o) => ({
              objectiveId: o.objectiveId,
            })),
          },
          subtasks: {
            create: task.subtasks.map((s) => ({
              title: s.title,
              sortOrder: s.sortOrder,
            })),
          },
        },
        include: taskInclude,
      });
    });
  }
  restore(userId: string, id: string) {
    return this.store.write(userId, async (tx) => {
      const task = await this.store.task(tx, userId, id);
      if (task.status !== 'ARCHIVED')
        throw new BadRequestException('This task is not archived.');
      return tx.workTask.update({
        where: { id },
        data: {
          status: task.previousStatus ?? 'INBOX',
          previousStatus: null,
          archivedAt: null,
        },
        include: taskInclude,
      });
    });
  }
  remove(userId: string, id: string) {
    return this.store.write(userId, async (tx) => {
      await this.store.task(tx, userId, id);
      await tx.workTask.delete({ where: { id } });
      return { deleted: true };
    });
  }
  async events(userId: string, id: string, page: number) {
    await this.store.task(this.store.db, userId, id);
    return this.store.db.workTaskEvent.findMany({
      where: { taskId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * 50,
      take: 50,
    });
  }
  addSubtask(userId: string, taskId: string, dto: SubtaskDto) {
    return this.store.write(userId, async (tx) => {
      await this.store.task(tx, userId, taskId);
      const count = await tx.workSubtask.count({ where: { taskId } });
      if (count >= 100)
        throw new BadRequestException('A task can have up to 100 subtasks.');
      const last = await tx.workSubtask.aggregate({
        where: { taskId },
        _max: { sortOrder: true },
      });
      return tx.workSubtask.create({
        data: {
          taskId,
          title: validTitle(dto.title),
          sortOrder: (last._max.sortOrder ?? -1) + 1,
          completedAt: dto.isCompleted ? new Date() : null,
        },
      });
    });
  }
  subtask(userId: string, taskId: string, id: string, dto?: UpdateSubtaskDto) {
    return this.store.write(userId, async (tx) => {
      await this.store.task(tx, userId, taskId);
      const item = await tx.workSubtask.findFirst({ where: { id, taskId } });
      if (!item) throw new NotFoundException('Subtask not found.');
      if (!dto) {
        await tx.workSubtask.delete({ where: { id } });
        return { deleted: true };
      }
      return tx.workSubtask.update({
        where: { id },
        data: {
          ...(dto.title === undefined ? {} : { title: validTitle(dto.title) }),
          ...(dto.isCompleted === undefined
            ? {}
            : {
                completedAt: dto.isCompleted
                  ? (item.completedAt ?? new Date())
                  : null,
              }),
        },
      });
    });
  }
  addFollowUp(userId: string, taskId: string, dto: CreateFollowUpDto) {
    return this.store.write(userId, async (tx) => {
      await this.store.task(tx, userId, taskId);
      if ((await tx.workFollowUp.count({ where: { taskId } })) >= 50)
        throw new BadRequestException('A task can have up to 50 follow-ups.');
      const remindAt = instant(dto.remindAt);
      if (remindAt && remindAt <= new Date())
        throw new BadRequestException('Reminder time must be in the future.');
      return tx.workFollowUp.create({
        data: {
          taskId,
          followUpAt: instant(dto.followUpAt)!,
          remindAt,
          note: dto.note ?? '',
          nextAction: dto.nextAction ?? '',
        },
      });
    });
  }
  followUp(userId: string, id: string, dto?: UpdateFollowUpDto) {
    return this.store.write(userId, async (tx) => {
      const current = await tx.workFollowUp.findFirst({
        where: { id, task: { userId } },
      });
      if (!current) throw new NotFoundException('Follow-up not found.');
      if (!dto) {
        await tx.workFollowUp.delete({ where: { id } });
        return { deleted: true };
      }
      const { resolved, dismiss, ...fields } = dto;
      const remindAt =
        dto.remindAt === undefined ? current.remindAt : instant(dto.remindAt);
      const changedReminder =
        dto.remindAt !== undefined &&
        remindAt?.getTime() !== current.remindAt?.getTime();
      if (changedReminder && remindAt && remindAt <= new Date())
        throw new BadRequestException('Reminder time must be in the future.');
      return tx.workFollowUp.update({
        where: { id },
        data: {
          ...fields,
          ...(dto.followUpAt === undefined
            ? {}
            : { followUpAt: instant(dto.followUpAt)! }),
          remindAt,
          ...(resolved === undefined
            ? {}
            : { resolvedAt: resolved ? new Date() : null }),
          ...(dismiss
            ? { dismissedAt: new Date() }
            : changedReminder
              ? { dismissedAt: null }
              : {}),
        },
      });
    });
  }
  async followUps(userId: string, q: FollowUpQueryDto) {
    const now = new Date();
    const where: Prisma.WorkFollowUpWhereInput = {
      task: { userId },
      ...(q.scope === 'ALL'
        ? {}
        : { resolvedAt: q.scope === 'RESOLVED' ? { not: null } : null }),
      ...(q.scope === 'OVERDUE'
        ? { followUpAt: { lt: now } }
        : q.scope === 'UPCOMING'
          ? { followUpAt: { gte: now } }
          : q.scope === 'REMINDERS'
            ? { dismissedAt: null, remindAt: { lte: now } }
            : {}),
    };
    const [items, total] = await Promise.all([
      this.store.db.workFollowUp.findMany({
        where,
        include: { task: { select: { id: true, title: true, status: true } } },
        orderBy: [{ followUpAt: 'asc' }, { id: 'asc' }],
        skip: (q.page - 1) * 20,
        take: 20,
      }),
      this.store.db.workFollowUp.count({ where }),
    ]);
    return { items, total, page: q.page, limit: 20 };
  }
  async dashboard(userId: string, q: ListTasksDto) {
    const timeZone = await this.store.zone(userId),
      now = new Date(),
      today = localDay(now, timeZone),
      todayRange = periodBounds(today, today, timeZone);
    const from = q.from ?? today,
      to = q.to ?? today,
      { start, end } = periodBounds(from, to, timeZone);
    const weekDate = calendarDate(today);
    weekDate.setUTCDate(
      weekDate.getUTCDate() - ((weekDate.getUTCDay() + 6) % 7),
    );
    const weekStart = weekDate.toISOString().slice(0, 10);
    const weekRange = periodBounds(weekStart, today, timeZone);
    const active = { userId, status: { notIn: ['DONE', 'ARCHIVED'] } };
    const [
      states,
      dueToday,
      overdue,
      accomplishments,
      weekTasks,
      followUps,
      objectives,
      milestones,
    ] = await Promise.all([
      this.store.db.workTask.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      this.store.db.workTask.count({
        where: {
          ...active,
          dueAt: { gte: todayRange.start, lt: todayRange.end },
        },
      }),
      this.store.db.workTask.count({
        where: { ...active, dueAt: { lt: now } },
      }),
      this.store.db.workTask.findMany({
        where: {
          AND: [
            { userId },
            taskDoneWhere,
            { completedAt: { gte: start, lt: end } },
          ],
        },
        include: taskInclude,
        orderBy: [{ highlighted: 'desc' }, { completedAt: 'desc' }],
        take: 10,
      }),
      this.store.db.workTask.findMany({
        where: {
          AND: [
            { userId },
            taskDoneWhere,
            { completedAt: { gte: weekRange.start, lt: weekRange.end } },
          ],
        },
        select: {
          completedAt: true,
          category: true,
          actualMinutes: true,
          estimatedMinutes: true,
          project: { select: { name: true } },
          objectives: { select: { objectiveId: true } },
        },
      }),
      this.followUps(userId, { scope: 'OPEN', page: 1 }),
      this.store.db.workObjective.findMany({
        where: { userId, status: 'ACTIVE' },
        include: {
          tasks: {
            select: {
              task: { select: { status: true, previousStatus: true } },
            },
          },
        },
        orderBy: { periodEnd: 'asc' },
        take: 20,
      }),
      this.store.db.workTask.findMany({
        where: {
          AND: [
            { userId, isMilestone: true },
            taskDoneWhere,
            { completedAt: { gte: start, lt: end } },
          ],
        },
        include: taskInclude,
        orderBy: { completedAt: 'desc' },
        take: 5,
      }),
    ]);
    const completed = await this.store.db.workTask.count({
      where: {
        AND: [
          { userId },
          taskDoneWhere,
          { completedAt: { gte: start, lt: end } },
        ],
      },
    });
    const counts = Object.fromEntries(
      states.map((row) => [row.status, row._count]),
    );
    const byDay: Record<string, number> = {},
      byCategory: Record<string, number> = {},
      byProject: Record<string, number> = {};
    for (const task of weekTasks) {
      const day = localDay(task.completedAt!, timeZone);
      byDay[day] = (byDay[day] ?? 0) + 1;
      byCategory[task.category] = (byCategory[task.category] ?? 0) + 1;
      const project = task.project?.name ?? '';
      byProject[project] = (byProject[project] ?? 0) + 1;
    }
    return {
      timeZone,
      from,
      to,
      counts,
      dueToday,
      overdue,
      completed,
      accomplishments,
      milestones,
      followUps,
      objectives: objectives.map(({ tasks, ...o }) => ({
        ...o,
        linkedTasks: tasks.length,
        completedContributions: tasks.filter(
          ({ task }) =>
            task.status === 'DONE' ||
            (task.status === 'ARCHIVED' && task.previousStatus === 'DONE'),
        ).length,
      })),
      weekly: {
        from: weekStart,
        to: today,
        total: weekTasks.length,
        byDay,
        byCategory,
        byProject,
        objectiveLinked: weekTasks.filter((t) => t.objectives.length).length,
        actualMinutes: weekTasks.reduce(
          (n, t) => n + (t.actualMinutes ?? 0),
          0,
        ),
        estimatedMinutes: weekTasks.reduce(
          (n, t) => n + (t.estimatedMinutes ?? 0),
          0,
        ),
      },
    };
  }
}
