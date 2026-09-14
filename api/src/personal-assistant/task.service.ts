import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PersonalReminderStatus,
  PersonalTaskStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonalTaskService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    input: { title: string; subject?: string; dueAt?: Date },
  ) {
    return this.prisma.personalTask.create({ data: { userId, ...input } });
  }

  createWithReminder(
    userId: string,
    input: { title: string; subject?: string; message: string; remindAt: Date },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.personalTask.create({
        data: { userId, title: input.title, subject: input.subject },
      });
      const reminder = await tx.personalReminder.create({
        data: {
          userId,
          taskId: task.id,
          message: input.message,
          remindAt: input.remindAt,
          nextAttemptAt: input.remindAt,
        },
      });
      return { task, reminder };
    });
  }

  list(
    userId: string,
    status: PersonalTaskStatus = PersonalTaskStatus.OPEN,
    query = '',
    subject?: string,
  ) {
    const where: Prisma.PersonalTaskWhereInput = {
      userId,
      status,
      ...(subject
        ? { subject: { contains: subject, mode: 'insensitive' } }
        : {}),
      ...(query ? { title: { contains: query, mode: 'insensitive' } } : {}),
    };
    return this.prisma.personalTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  listAll(userId: string, query = '', subject?: string) {
    return this.prisma.personalTask.findMany({
      where: {
        userId,
        ...(subject
          ? { subject: { contains: subject, mode: 'insensitive' } }
          : {}),
        ...(query
          ? { title: { contains: query, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  findOpenMatches(userId: string, query: string, subject?: string) {
    return this.prisma.personalTask.findMany({
      where: {
        userId,
        status: PersonalTaskStatus.OPEN,
        ...(subject
          ? { subject: { contains: subject, mode: 'insensitive' } }
          : {}),
        ...(query ? { title: { contains: query, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  async complete(userId: string, id: string, now = new Date()) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.personalTask.findFirst({
        where: { id, userId, status: PersonalTaskStatus.OPEN },
      });
      if (!task) throw new NotFoundException('Open task not found');
      const completed = await tx.personalTask.update({
        where: { id: task.id },
        data: { status: PersonalTaskStatus.COMPLETED, completedAt: now },
      });
      await tx.personalReminder.updateMany({
        where: {
          userId,
          taskId: task.id,
          status: PersonalReminderStatus.PENDING,
        },
        data: { status: PersonalReminderStatus.CANCELLED, lockedUntil: null },
      });
      return completed;
    });
  }
}
