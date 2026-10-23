import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PersonalReminderStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonalReminderService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    input: { message: string; remindAt: Date; taskId?: string },
    now = new Date(),
  ) {
    return this.prisma.personalReminder.create({
      data: this.createData(userId, input, now),
    });
  }

  async createFromTelegram(
    userId: string,
    input: () => { message: string; remindAt: Date },
    source: { chatId: number; messageId: number },
    now = new Date(),
  ) {
    // A UUIDv5 keyed by the source message survives webhook retries after a confirmation fails.
    const hash = createHash('sha1')
      .update(Buffer.from('2bdbb82497ea4cf2b9717d7b3d2afbd6', 'hex'))
      .update(`${userId}:${source.chatId}:${source.messageId}`)
      .digest();
    hash[6] = (hash[6] & 0x0f) | 0x50;
    hash[8] = (hash[8] & 0x3f) | 0x80;
    const hex = hash.subarray(0, 16).toString('hex');
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    const existing = await this.prisma.personalReminder.findUnique({
      where: { id, userId },
    });
    // Retry confirmations must still work after the original due time, without reparsing relative dates.
    if (existing) return existing;
    return this.prisma.personalReminder.upsert({
      where: { id },
      create: { id, ...this.createData(userId, input(), now) },
      update: {},
    });
  }

  private createData(
    userId: string,
    input: { message: string; remindAt: Date; taskId?: string },
    now: Date,
  ) {
    if (!Number.isFinite(input.remindAt.getTime()) || input.remindAt <= now) {
      throw new BadRequestException('Reminder time must be in the future');
    }
    return { userId, ...input, nextAttemptAt: input.remindAt };
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
