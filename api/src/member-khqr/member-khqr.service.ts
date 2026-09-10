import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { memberKhqrImageType } from './member-khqr-image';
import {
  buildMemberQrDirectory,
  type ObservedQrMember,
} from '../telegram-bot/telegram-member-qr';

export const MAX_KHQR_BYTES = 2 * 1024 * 1024;

@Injectable()
export class MemberKhqrService {
  constructor(private readonly prisma: PrismaService) {}

  async groups() {
    return this.prisma.$queryRaw<
      Array<{ chatId: string; title: string; memberCount: number }>
    >`
      SELECT members.telegram_chat_id::text AS "chatId",
        COALESCE(NULLIF(schedule.telegram_chat_title, ''),
          'Telegram group ' || members.telegram_chat_id::text) AS title,
        COUNT(*)::integer AS "memberCount"
      FROM telegram_group_members AS members
      LEFT JOIN moment_vote_schedules AS schedule
        ON schedule.telegram_chat_id = members.telegram_chat_id
      WHERE members.is_active = TRUE AND members.telegram_chat_id < 0
      GROUP BY members.telegram_chat_id, schedule.telegram_chat_title
      ORDER BY title, members.telegram_chat_id
    `;
  }

  private groupId(chatId: string) {
    if (
      !/^-[1-9][0-9]{0,15}$/.test(chatId) ||
      !Number.isSafeInteger(Number(chatId))
    ) {
      throw new BadRequestException('Select a valid Telegram group');
    }
    return BigInt(chatId);
  }

  private async groupMembers(chatId: string) {
    const groupId = this.groupId(chatId);
    const observed = await this.prisma.$queryRaw<ObservedQrMember[]>`
      SELECT telegram_user_id AS "telegramUserId", display_name AS "displayName",
        is_active AS "isActive"
      FROM telegram_group_members
      WHERE telegram_chat_id = ${groupId} AND is_active = TRUE
      ORDER BY display_name, telegram_user_id
    `;
    return buildMemberQrDirectory(observed);
  }

  async list(chatId: string) {
    const members = await this.groupMembers(chatId);
    const uploads = await this.prisma.$queryRaw<
      Array<{ memberKey: string; version: string; updatedAt: Date }>
    >`
      SELECT member_key AS "memberKey", version, updated_at AS "updatedAt"
      FROM member_khqr_images
    `;
    // Echo the group so the UI can reject an old response after switching groups.
    return {
      chatId,
      members: members.map((member) => {
        const upload = uploads.find((row) => row.memberKey === member.key);
        return {
          key: member.key,
          displayName: member.displayName,
          imageUrl: upload
            ? `/api/member-khqr/${member.key}?v=${upload.version}`
            : null,
          source: upload ? 'upload' : 'none',
          updatedAt: upload?.updatedAt.toISOString() ?? null,
        };
      }),
    };
  }

  async upload(
    chatId: string,
    key: string,
    file?: { buffer: Buffer; mimetype: string },
  ) {
    // Recheck membership on save in case the member left after the list loaded.
    const members = await this.groupMembers(chatId);
    if (!members.some((member) => member.key === key)) {
      throw new NotFoundException('Member not found in the selected group');
    }
    if (
      !file ||
      !file.buffer?.length ||
      file.buffer.length > MAX_KHQR_BYTES ||
      !memberKhqrImageType(file.buffer)
    ) {
      throw new BadRequestException('Choose a PNG or JPEG image up to 2 MB');
    }
    const content = file.buffer;
    const version = createHash('sha256').update(content).digest('hex');
    await this.prisma.$executeRaw`
      INSERT INTO member_khqr_images (member_key, content, version, updated_at)
      VALUES (${key}, ${content}, ${version}, NOW())
      ON CONFLICT (member_key) DO UPDATE
      SET content = EXCLUDED.content, version = EXCLUDED.version, updated_at = NOW()
    `;
    return { imageUrl: `/api/member-khqr/${key}?v=${version}` };
  }

  async image(key: string) {
    if (!/^[a-z0-9_]{1,32}$/.test(key))
      throw new NotFoundException('KHQR not found');
    const [image] = await this.prisma.$queryRaw<Array<{ content: Uint8Array }>>`
      SELECT content FROM member_khqr_images WHERE member_key = ${key}
    `;
    if (!image) throw new NotFoundException('KHQR not found');
    // Prisma returns bytea as Uint8Array; format detection needs Buffer methods.
    return Buffer.from(image.content);
  }
}
