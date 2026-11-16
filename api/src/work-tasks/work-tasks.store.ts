import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export type WorkTx = Prisma.TransactionClient;
export const attachmentSelect = {
  id: true,
  title: true,
  extension: true,
  mimeType: true,
  fileSize: true,
  createdAt: true,
} as const;
export const taskInclude = {
  project: { select: { id: true, name: true, color: true } },
  objectives: { include: { objective: { select: { id: true, title: true } } } },
  subtasks: { orderBy: { sortOrder: 'asc' as const } },
  followUps: { orderBy: { followUpAt: 'asc' as const } },
  attachments: {
    select: attachmentSelect,
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.WorkTaskInclude;
@Injectable()
export class WorkTasksStore {
  constructor(readonly db: PrismaService) {}
  async zone(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { telegramNotificationTimeZone: true },
    });
    return user?.telegramNotificationTimeZone || 'Asia/Phnom_Penh';
  }
  write<T>(userId: string, run: (tx: WorkTx) => Promise<T>) {
    return this.db.$transaction(async (tx) => {
      // A per-owner row lock serializes relation changes and completion events without changing the user profile.
      const owner = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      if (!owner.length) throw new NotFoundException('Account not found.');
      return run(tx);
    });
  }
  async task(tx: WorkTx, userId: string, id: string) {
    const task = await tx.workTask.findFirst({ where: { id, userId } });
    if (!task) throw new NotFoundException('Task not found.');
    return task;
  }
  async project(tx: WorkTx, userId: string, id: string | null | undefined) {
    if (
      id &&
      !(await tx.workProject.findFirst({
        where: { id, userId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Project not found.');
  }
  async objectives(tx: WorkTx, userId: string, ids?: string[]) {
    if (
      ids?.length &&
      (await tx.workObjective.count({ where: { id: { in: ids }, userId } })) !==
        ids.length
    )
      throw new NotFoundException('Objective not found.');
  }
}
