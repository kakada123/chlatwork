import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  effectiveSchedule,
  MAX_FILES,
  MAX_ITEMS,
  MAX_SECTIONS,
  progressFor,
  safeUrl,
  templateSections,
  validateUpload,
  type Upload,
} from './prephub.domain';
import type {
  CreateItemDto,
  CreateSectionDto,
  CreateSubjectDto,
  ItemDto,
  ListSubjectsDto,
  ReminderDto,
  SubjectDto,
  ShareSubjectDto,
} from './prephub.dto';

type Tx = Prisma.TransactionClient;
const resourceSelect = {
  id: true,
  title: true,
  extension: true,
  mimeType: true,
  fileSize: true,
  createdAt: true,
} as const;
const workspaceInclude = {
  sections: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      items: { orderBy: { sortOrder: 'asc' as const } },
      resources: {
        select: resourceSelect,
        orderBy: { createdAt: 'asc' as const },
      },
    },
  },
  reminders: { orderBy: { remindAt: 'asc' as const } },
} satisfies Prisma.PreparationSubjectInclude;
const trimTitle = (title: string) => {
  if (typeof title !== 'string' || !title.trim())
    throw new BadRequestException('A title is required.');
  return title.trim();
};
// Require an explicit offset: date-only strings must never silently use the API server's time zone.
function dateValue(value?: string | null) {
  if (!value) return null;
  if (
    !/(Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(new Date(value).getTime())
  )
    throw new BadRequestException('Use a date and time with a UTC offset.');
  return new Date(value);
}
function exactOrder(ids: string[], existing: { id: string }[]) {
  if (
    new Set(ids).size !== ids.length ||
    ids.length !== existing.length ||
    existing.some((r) => !ids.includes(r.id))
  )
    throw new BadRequestException(
      'Reload the workspace before reordering: every current item must appear once.',
    );
}

@Injectable()
export class PrepHubService {
  constructor(private readonly prisma: PrismaService) {}

  async workspace(userId: string, id: string) {
    const subject = await this.prisma.preparationSubject.findFirst({
      where: { id, userId },
      include: workspaceInclude,
    });
    if (!subject) throw new NotFoundException('Preparation subject not found.');
    return { ...subject, progress: progressFor(subject.sections) };
  }

  async sharing(userId: string, id: string) {
    const subject = await this.prisma.preparationSubject.findFirst({
      where: { id, userId },
      select: { shareToken: true, shareAttachments: true, sharedAt: true },
    });
    if (!subject) throw new NotFoundException('Preparation subject not found.');
    return this.shareSettings(subject);
  }

  private shareSettings(subject: {
    shareToken: string | null;
    shareAttachments: boolean;
    sharedAt: Date | null;
  }) {
    return {
      enabled: Boolean(subject.shareToken),
      token: subject.shareToken,
      includeAttachments: subject.shareAttachments,
      sharedAt: subject.sharedAt,
    };
  }

  enableSharing(userId: string, id: string, dto: ShareSubjectDto) {
    return this.change(
      userId,
      id,
      dto.regenerate
        ? 'Public link replaced'
        : 'Public sharing enabled or updated',
      async (tx, current) => {
        const subject = await tx.preparationSubject.update({
          where: { id },
          data: {
            shareToken:
              dto.regenerate || !current.shareToken
                ? randomBytes(32).toString('base64url')
                : current.shareToken,
            shareAttachments: dto.includeAttachments,
            sharedAt: current.sharedAt ?? new Date(),
          },
        });
        return this.shareSettings(subject);
      },
    );
  }

  disableSharing(userId: string, id: string) {
    return this.change(userId, id, 'Public sharing disabled', async (tx) =>
      this.shareSettings(
        await tx.preparationSubject.update({
          where: { id },
          data: { shareToken: null, shareAttachments: false, sharedAt: null },
        }),
      ),
    );
  }

  private validShareToken(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new NotFoundException('Shared workspace not found.');
  }

  async publicWorkspace(token: string) {
    this.validShareToken(token);
    // Select safe content explicitly; never return identity, reminders, history or file bytes.
    const subject = await this.prisma.preparationSubject.findFirst({
      where: { shareToken: token },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        goal: true,
        status: true,
        priority: true,
        eventAt: true,
        deadlineAt: true,
        updatedAt: true,
        shareAttachments: true,
        user: { select: { telegramNotificationTimeZone: true } },
        sections: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            title: true,
            type: true,
            items: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                title: true,
                content: true,
                objective: true,
                findings: true,
                sources: true,
                conclusion: true,
                url: true,
                label: true,
                status: true,
                isRequired: true,
                isCompleted: true,
                dueAt: true,
              },
            },
            resources: {
              where: { section: { subject: { shareAttachments: true } } },
              select: resourceSelect,
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });
    if (!subject) throw new NotFoundException('Shared workspace not found.');
    const {
      id,
      title,
      description,
      category,
      goal,
      status,
      priority,
      eventAt,
      deadlineAt,
      updatedAt,
    } = subject;
    const sections = subject.sections.map((section) => ({
      ...section,
      resources: subject.shareAttachments ? section.resources : [],
    }));
    return {
      id,
      title,
      description,
      category,
      goal,
      status,
      priority,
      eventAt,
      deadlineAt,
      updatedAt,
      sections,
      progress: progressFor(sections),
      timeZone: subject.user.telegramNotificationTimeZone || 'Asia/Phnom_Penh',
      includeAttachments: subject.shareAttachments,
    };
  }

  async publicFile(token: string, id: string) {
    this.validShareToken(token);
    // Every download checks current access; a previously opened page grants no lasting file access.
    const resource = await this.prisma.preparationResource.findFirst({
      where: {
        id,
        section: { subject: { shareToken: token, shareAttachments: true } },
      },
    });
    if (!resource) throw new NotFoundException('Attachment not found.');
    return resource;
  }

  async list(userId: string, query: ListSubjectsDto) {
    const now = new Date();
    const active = { notIn: ['COMPLETED', 'ARCHIVED'] };
    const where: Prisma.PreparationSubjectWhereInput = {
      userId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.q?.trim()
        ? {
            OR: ['title', 'description', 'goal'].map((key) => ({
              [key]: { contains: query.q!.trim(), mode: 'insensitive' },
            })),
          }
        : {}),
      ...(query.status === 'ALL'
        ? {}
        : {
            status:
              query.status &&
              !['ACTIVE', 'UPCOMING', 'OVERDUE'].includes(query.status)
                ? query.status
                : active,
          }),
      ...(query.status === 'UPCOMING'
        ? { scheduleAt: { gte: now } }
        : query.status === 'OVERDUE'
          ? { scheduleAt: { lt: now } }
          : {}),
    };
    const select = {
      id: true,
      title: true,
      description: true,
      category: true,
      status: true,
      priority: true,
      eventAt: true,
      deadlineAt: true,
      scheduleAt: true,
      updatedAt: true,
      sections: {
        select: {
          type: true,
          items: {
            select: {
              isRequired: true,
              isCompleted: true,
              status: true,
              dueAt: true,
            },
          },
        },
      },
    } satisfies Prisma.PreparationSubjectSelect;
    const skip = (query.page - 1) * query.limit;
    const total = await this.prisma.preparationSubject.count({ where });
    let subjects;
    if (!query.sort || query.sort === 'UPCOMING') {
      const preferred: Prisma.PreparationSubjectWhereInput = {
        AND: [
          where,
          { OR: [{ scheduleAt: { gte: now } }, { scheduleAt: null }] },
        ],
      };
      const preferredCount = await this.prisma.preparationSubject.count({
        where: preferred,
      });
      const first =
        skip < preferredCount
          ? await this.prisma.preparationSubject.findMany({
              where: preferred,
              select,
              skip,
              take: query.limit,
              orderBy: [
                { scheduleAt: { sort: 'asc', nulls: 'last' } },
                { updatedAt: 'desc' },
                { id: 'asc' },
              ],
            })
          : [];
      const rest =
        first.length < query.limit
          ? await this.prisma.preparationSubject.findMany({
              where: { AND: [where, { scheduleAt: { lt: now } }] },
              select,
              skip: Math.max(0, skip - preferredCount),
              take: query.limit - first.length,
              orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
            })
          : [];
      subjects = [...first, ...rest];
    } else {
      subjects = await this.prisma.preparationSubject.findMany({
        where,
        select,
        skip,
        take: query.limit,
        orderBy:
          query.sort === 'TITLE'
            ? [{ title: 'asc' }, { id: 'asc' }]
            : [{ updatedAt: 'desc' }, { id: 'asc' }],
      });
    }
    return {
      subjects: subjects.map(({ sections, ...s }) => ({
        ...s,
        progress: progressFor(sections, now),
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async dashboard(userId: string) {
    const now = new Date();
    const [counts, upcoming, overdue, user, reminders] = await Promise.all([
      this.prisma.preparationSubject.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      this.prisma.preparationSubject.count({
        where: {
          userId,
          status: { notIn: ['COMPLETED', 'ARCHIVED'] },
          scheduleAt: { gte: now },
        },
      }),
      this.prisma.preparationSubject.count({
        where: {
          userId,
          status: { notIn: ['COMPLETED', 'ARCHIVED'] },
          scheduleAt: { lt: now },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { telegramNotificationTimeZone: true },
      }),
      this.inbox(userId),
    ]);
    return {
      counts: Object.fromEntries(counts.map((r) => [r.status, r._count])),
      upcoming,
      overdue,
      timeZone: user?.telegramNotificationTimeZone || 'Asia/Phnom_Penh',
      reminders,
    };
  }

  async create(userId: string, dto: CreateSubjectDto) {
    const eventAt = dateValue(dto.eventAt),
      deadlineAt = dateValue(dto.deadlineAt);
    if (dto.status === 'ARCHIVED')
      throw new BadRequestException('Create the subject before archiving it.');
    return this.prisma.preparationSubject.create({
      data: {
        userId,
        title: trimTitle(dto.title),
        description: dto.description ?? '',
        goal: dto.goal ?? '',
        category: dto.category ?? 'OTHER',
        priority: dto.priority ?? 'NORMAL',
        status: dto.status ?? 'DRAFT',
        eventAt,
        deadlineAt,
        scheduleAt: effectiveSchedule(eventAt, deadlineAt),
        completedAt: dto.status === 'COMPLETED' ? new Date() : null,
        sections: {
          create: templateSections(dto.template ?? 'NONE').map(
            (s, sortOrder) => ({ ...s, sortOrder }),
          ),
        },
        history: { create: { action: 'Subject created' } },
      },
    });
  }

  // Touching the owned parent takes a row lock, serializing caps and reorder operations per subject.
  private async change<T>(
    userId: string,
    id: string,
    action: string,
    run: (
      tx: Tx,
      subject: Awaited<
        ReturnType<Tx['preparationSubject']['findFirstOrThrow']>
      >,
    ) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const owned = await tx.preparationSubject.updateMany({
        where: { id, userId },
        data: { updatedAt: new Date() },
      });
      if (!owned.count)
        throw new NotFoundException('Preparation subject not found.');
      const subject = await tx.preparationSubject.findFirst({
        where: { id, userId },
      });
      if (!subject)
        throw new NotFoundException('Preparation subject not found.');
      const result = await run(tx, subject);
      await tx.preparationHistory.create({ data: { subjectId: id, action } });
      return result;
    });
  }

  update(userId: string, id: string, dto: SubjectDto) {
    return this.change(userId, id, 'Subject updated', async (tx, current) => {
      const eventAt =
        dto.eventAt === undefined ? current.eventAt : dateValue(dto.eventAt);
      const deadlineAt =
        dto.deadlineAt === undefined
          ? current.deadlineAt
          : dateValue(dto.deadlineAt);
      const data: Prisma.PreparationSubjectUpdateInput = {
        ...dto,
        ...(dto.title === undefined ? {} : { title: trimTitle(dto.title) }),
        eventAt,
        deadlineAt,
        scheduleAt: effectiveSchedule(eventAt, deadlineAt),
      };
      if (dto.status !== undefined) {
        data.archivedAt =
          dto.status === 'ARCHIVED' ? (current.archivedAt ?? new Date()) : null;
        if (dto.status === 'ARCHIVED' && current.status !== 'ARCHIVED')
          data.previousStatus = current.status;
        if (dto.status !== 'ARCHIVED')
          data.completedAt =
            dto.status === 'COMPLETED'
              ? (current.completedAt ?? new Date())
              : null;
      }
      return tx.preparationSubject.update({ where: { id }, data });
    });
  }

  restore(userId: string, id: string) {
    return this.change(userId, id, 'Subject restored', async (tx, s) => {
      if (s.status !== 'ARCHIVED')
        throw new BadRequestException('This subject is not archived.');
      return tx.preparationSubject.update({
        where: { id },
        data: {
          status: s.previousStatus || 'PREPARING',
          archivedAt: null,
          previousStatus: null,
        },
      });
    });
  }

  async delete(userId: string, id: string) {
    const result = await this.prisma.preparationSubject.deleteMany({
      where: { id, userId },
    });
    if (!result.count)
      throw new NotFoundException('Preparation subject not found.');
    return { deleted: true };
  }

  private async section(tx: Tx, subjectId: string, id: string) {
    const section = await tx.preparationSection.findFirst({
      where: { id, subjectId },
    });
    if (!section) throw new NotFoundException('Section not found.');
    return section;
  }
  addSection(userId: string, subjectId: string, dto: CreateSectionDto) {
    return this.change(userId, subjectId, 'Section added', async (tx) => {
      const count = await tx.preparationSection.count({ where: { subjectId } });
      if (count >= MAX_SECTIONS)
        throw new BadRequestException('A subject can have up to 32 sections.');
      const last = await tx.preparationSection.aggregate({
        where: { subjectId },
        _max: { sortOrder: true },
      });
      return tx.preparationSection.create({
        data: {
          subjectId,
          title: trimTitle(dto.title),
          type: dto.type,
          sortOrder: (last._max.sortOrder ?? -1) + 1,
        },
      });
    });
  }
  editSection(userId: string, subjectId: string, id: string, title: string) {
    return this.change(userId, subjectId, 'Section renamed', async (tx) => {
      await this.section(tx, subjectId, id);
      return tx.preparationSection.update({
        where: { id },
        data: { title: trimTitle(title) },
      });
    });
  }
  removeSection(userId: string, subjectId: string, id: string) {
    return this.change(userId, subjectId, 'Section removed', async (tx) => {
      await this.section(tx, subjectId, id);
      await tx.preparationSection.delete({ where: { id } });
      return { deleted: true };
    });
  }
  reorderSections(userId: string, subjectId: string, ids: string[]) {
    return this.change(userId, subjectId, 'Sections reordered', async (tx) => {
      exactOrder(
        ids,
        await tx.preparationSection.findMany({
          where: { subjectId },
          select: { id: true },
        }),
      );
      for (const [sortOrder, id] of ids.entries())
        await tx.preparationSection.update({
          where: { id },
          data: { sortOrder },
        });
      return { saved: true };
    });
  }
  private itemData(dto: ItemDto, type: string) {
    const data = {
      ...dto,
      ...(dto.title === undefined ? {} : { title: trimTitle(dto.title) }),
      ...(dto.dueAt === undefined ? {} : { dueAt: dateValue(dto.dueAt) }),
    };
    if (dto.url !== undefined) data.url = dto.url ? safeUrl(dto.url) : '';
    if (type === 'LINKS' && dto.url !== undefined && !dto.url)
      throw new BadRequestException('A link URL is required.');
    return data;
  }
  addItem(
    userId: string,
    subjectId: string,
    sectionId: string,
    dto: CreateItemDto,
  ) {
    return this.change(userId, subjectId, 'Item added', async (tx) => {
      const section = await this.section(tx, subjectId, sectionId);
      if (section.type === 'ATTACHMENTS')
        throw new BadRequestException('Upload a file to this section.');
      if (section.type === 'LINKS' && !dto.url)
        throw new BadRequestException('A link URL is required.');
      if (
        (await tx.preparationItem.count({
          where: { section: { subjectId } },
        })) >= MAX_ITEMS
      )
        throw new BadRequestException('A subject can have up to 500 items.');
      const last = await tx.preparationItem.aggregate({
        where: { sectionId },
        _max: { sortOrder: true },
      });
      return tx.preparationItem.create({
        data: {
          ...this.itemData(dto, section.type),
          title: trimTitle(dto.title),
          sectionId,
          sortOrder: (last._max.sortOrder ?? -1) + 1,
        },
      });
    });
  }
  editItem(
    userId: string,
    subjectId: string,
    sectionId: string,
    id: string,
    dto: ItemDto,
  ) {
    return this.change(userId, subjectId, 'Item updated', async (tx) => {
      const section = await this.section(tx, subjectId, sectionId);
      if (!(await tx.preparationItem.findFirst({ where: { id, sectionId } })))
        throw new NotFoundException('Item not found.');
      return tx.preparationItem.update({
        where: { id },
        data: this.itemData(dto, section.type),
      });
    });
  }
  removeItem(userId: string, subjectId: string, sectionId: string, id: string) {
    return this.change(userId, subjectId, 'Item removed', async (tx) => {
      await this.section(tx, subjectId, sectionId);
      const result = await tx.preparationItem.deleteMany({
        where: { id, sectionId },
      });
      if (!result.count) throw new NotFoundException('Item not found.');
      return { deleted: true };
    });
  }
  reorderItems(
    userId: string,
    subjectId: string,
    sectionId: string,
    ids: string[],
  ) {
    return this.change(userId, subjectId, 'Items reordered', async (tx) => {
      await this.section(tx, subjectId, sectionId);
      exactOrder(
        ids,
        await tx.preparationItem.findMany({
          where: { sectionId },
          select: { id: true },
        }),
      );
      for (const [sortOrder, id] of ids.entries())
        await tx.preparationItem.update({ where: { id }, data: { sortOrder } });
      return { saved: true };
    });
  }
  upload(userId: string, subjectId: string, sectionId: string, file?: Upload) {
    const meta = validateUpload(file);
    return this.change(userId, subjectId, 'Attachment uploaded', async (tx) => {
      const section = await this.section(tx, subjectId, sectionId);
      if (section.type !== 'ATTACHMENTS')
        throw new BadRequestException('Choose an attachments section.');
      if (
        (await tx.preparationResource.count({
          where: { section: { subjectId } },
        })) >= MAX_FILES
      )
        throw new BadRequestException(
          'A subject can have up to 20 attachments.',
        );
      return tx.preparationResource.create({
        data: {
          sectionId,
          title: file!.originalname
            .replace(/[\x00-\x1f\x7f/\\]/g, '_')
            .slice(0, 200),
          ...meta,
          data: new Uint8Array(file!.buffer),
        },
        select: resourceSelect,
      });
    });
  }
  async file(userId: string, subjectId: string, id: string) {
    const resource = await this.prisma.preparationResource.findFirst({
      where: { id, section: { subjectId, subject: { userId } } },
    });
    if (!resource) throw new NotFoundException('Attachment not found.');
    return resource;
  }
  resource(userId: string, subjectId: string, id: string, title?: string) {
    return this.change(
      userId,
      subjectId,
      title === undefined ? 'Attachment removed' : 'Attachment renamed',
      async (tx) => {
        if (
          !(await tx.preparationResource.findFirst({
            where: { id, section: { subjectId } },
            select: { id: true },
          }))
        )
          throw new NotFoundException('Attachment not found.');
        if (title !== undefined)
          return tx.preparationResource.update({
            where: { id },
            data: { title: trimTitle(title) },
            select: resourceSelect,
          });
        await tx.preparationResource.delete({ where: { id } });
        return { deleted: true };
      },
    );
  }
  addReminder(userId: string, subjectId: string, dto: ReminderDto) {
    const remindAt = dateValue(dto.remindAt)!;
    return this.change(
      userId,
      subjectId,
      'Reminder added',
      async (tx, subject) => {
        if (!subject.eventAt && !subject.deadlineAt)
          throw new BadRequestException(
            'Add an event time or deadline before creating reminders.',
          );
        if (remindAt <= new Date())
          throw new BadRequestException(
            'Choose a reminder time in the future.',
          );
        if (
          (await tx.preparationReminder.count({ where: { subjectId } })) >= 20
        )
          throw new BadRequestException(
            'A subject can have up to 20 reminders.',
          );
        return tx.preparationReminder.create({ data: { subjectId, remindAt } });
      },
    );
  }
  reminder(userId: string, subjectId: string, id: string, dismiss: boolean) {
    return this.change(
      userId,
      subjectId,
      dismiss ? 'Reminder dismissed' : 'Reminder removed',
      async (tx) => {
        const result = dismiss
          ? await tx.preparationReminder.updateMany({
              where: { id, subjectId },
              data: { dismissedAt: new Date() },
            })
          : await tx.preparationReminder.deleteMany({
              where: { id, subjectId },
            });
        if (!result.count) throw new NotFoundException('Reminder not found.');
        return { saved: true };
      },
    );
  }
  inbox(userId: string) {
    return this.prisma.preparationReminder.findMany({
      where: {
        dismissedAt: null,
        remindAt: { lte: new Date() },
        subject: { userId, status: { notIn: ['COMPLETED', 'ARCHIVED'] } },
      },
      select: {
        id: true,
        subjectId: true,
        remindAt: true,
        subject: { select: { title: true } },
      },
      orderBy: { remindAt: 'asc' },
      take: 50,
    });
  }
  async history(userId: string, subjectId: string, page: number) {
    if (
      !(await this.prisma.preparationSubject.findFirst({
        where: { id: subjectId, userId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Preparation subject not found.');
    return this.prisma.preparationHistory.findMany({
      where: { subjectId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * 50,
      take: 50,
    });
  }
}
