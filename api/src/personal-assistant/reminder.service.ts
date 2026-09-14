import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PersonalReminderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonalReminderService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    input: { message: string; remindAt: Date; taskId?: string },
    now = new Date(),
  ) {
    if (!Number.isFinite(input.remindAt.getTime()) || input.remindAt <= now) {
      throw new BadRequestException('Reminder time must be in the future');
    }
    return this.prisma.personalReminder.create({
      data: { userId, ...input, nextAttemptAt: input.remindAt },
    });
  }

  list(userId: string, status?: PersonalReminderStatus) {
    return this.prisma.personalReminder.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { remindAt: 'asc' },
      take: 100,
    });
  }

  async cancel(userId: string, id: string) {
    const updated = await this.prisma.personalReminder.updateMany({
      where: { id, userId, status: PersonalReminderStatus.PENDING },
      data: { status: PersonalReminderStatus.CANCELLED, lockedUntil: null },
    });
    if (!updated.count)
      throw new NotFoundException('Pending reminder not found');
    return { cancelled: true };
  }
}
