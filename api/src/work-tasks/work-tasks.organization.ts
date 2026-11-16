import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { calendarDate, currentDone, validTitle } from './work-tasks.domain';
import type {
  CreateProjectDto,
  ObjectiveDto,
  UpdateProjectDto,
} from './work-tasks.dto';
import { WorkTasksStore } from './work-tasks.store';
@Injectable()
export class WorkTasksOrganization {
  constructor(private readonly store: WorkTasksStore) {}
  async catalog(userId: string) {
    const [projects, objectives, timeZone] = await Promise.all([
      this.projects(userId),
      this.objectives(userId),
      this.store.zone(userId),
    ]);
    return { projects, objectives, timeZone };
  }
  projects(userId: string) {
    return this.store.db.workProject.findMany({
      where: { userId },
      include: {
        objectives: {
          include: { objective: { select: { id: true, title: true } } },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: 200,
    });
  }
  project(
    userId: string,
    dto: CreateProjectDto | UpdateProjectDto,
    id?: string,
  ) {
    return this.store.write(userId, async (tx) => {
      if (
        id &&
        !(await tx.workProject.findFirst({
          where: { id, userId },
          select: { id: true },
        }))
      )
        throw new NotFoundException('Project not found.');
      if (!id && (await tx.workProject.count({ where: { userId } })) >= 200)
        throw new BadRequestException(
          'You can keep up to 200 personal projects.',
        );
      await this.store.objectives(tx, userId, dto.objectiveIds);
      const { objectiveIds, ...fields } = dto;
      const data = {
        ...fields,
        ...(dto.name === undefined ? {} : { name: validTitle(dto.name) }),
        ...(dto.targetDate === undefined
          ? {}
          : {
              targetDate: dto.targetDate ? calendarDate(dto.targetDate) : null,
            }),
      };
      if (id) {
        if (objectiveIds !== undefined)
          await tx.workProjectObjective.deleteMany({
            where: { projectId: id },
          });
        return tx.workProject.update({
          where: { id },
          data: {
            ...data,
            ...(objectiveIds === undefined
              ? {}
              : {
                  objectives: {
                    create: objectiveIds.map((objectiveId) => ({
                      objectiveId,
                    })),
                  },
                }),
          },
        });
      }
      return tx.workProject.create({
        data: {
          ...data,
          userId,
          name: validTitle((dto as CreateProjectDto).name),
          objectives: {
            create: (objectiveIds ?? []).map((objectiveId) => ({
              objectiveId,
            })),
          },
        },
      });
    });
  }
  async objectives(userId: string) {
    const rows = await this.store.db.workObjective.findMany({
      where: { userId },
      include: {
        projects: {
          include: { project: { select: { id: true, name: true } } },
        },
        tasks: {
          select: { task: { select: { status: true, previousStatus: true } } },
        },
      },
      orderBy: [{ periodEnd: 'desc' }, { id: 'asc' }],
      take: 200,
    });
    return rows.map(({ tasks, ...o }) => ({
      ...o,
      linkedTasks: tasks.length,
      completedContributions: tasks.filter(({ task }) => currentDone(task))
        .length,
    }));
  }
  objective(userId: string, dto: ObjectiveDto, id?: string) {
    return this.store.write(userId, async (tx) => {
      if (
        id &&
        !(await tx.workObjective.findFirst({
          where: { id, userId },
          select: { id: true },
        }))
      )
        throw new NotFoundException('Objective not found.');
      if (!id && (await tx.workObjective.count({ where: { userId } })) >= 200)
        throw new BadRequestException('You can keep up to 200 objectives.');
      const periodStart = calendarDate(dto.from),
        periodEnd = calendarDate(dto.to);
      if (periodStart > periodEnd)
        throw new BadRequestException(
          'Evaluation period start must not follow its end.',
        );
      if (
        dto.verifyResult &&
        (dto.actualValue == null || !dto.verificationEvidence?.trim())
      )
        throw new BadRequestException(
          'Verify a numeric result only when its value and supporting evidence are provided.',
        );
      const { from, to, verifyResult, ...fields } = dto;
      // Saving without explicit verification keeps the number as a draft, never as a reportable verified metric.
      const data = {
        ...fields,
        title: validTitle(dto.title),
        periodStart,
        periodEnd,
        targetValue: dto.targetValue ?? null,
        actualValue: dto.actualValue ?? null,
        verifiedAt: verifyResult ? new Date() : null,
        verificationEvidence: dto.verificationEvidence ?? '',
      };
      return id
        ? tx.workObjective.update({ where: { id }, data })
        : tx.workObjective.create({ data: { ...data, userId } });
    });
  }
  remove(userId: string, kind: 'project' | 'objective', id: string) {
    return this.store.write(userId, async (tx) => {
      const result =
        kind === 'project'
          ? await tx.workProject.deleteMany({ where: { id, userId } })
          : await tx.workObjective.deleteMany({ where: { id, userId } });
      if (!result.count) throw new NotFoundException('Record not found.');
      return { deleted: true };
    });
  }
}
