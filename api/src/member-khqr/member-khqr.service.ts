import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeKhqrPng } from './member-khqr-png';
import {
  buildMemberQrDirectory,
  MEMBER_QR_DIRECTORY,
  type ObservedQrMember,
} from '../telegram-bot/telegram-member-qr';

export const MAX_KHQR_BYTES = 2 * 1024 * 1024;

@Injectable()
export class MemberKhqrService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const observed = await this.prisma.$queryRaw<ObservedQrMember[]>`
      SELECT DISTINCT ON (telegram_user_id)
        telegram_user_id AS "telegramUserId", display_name AS "displayName",
        is_active AS "isActive"
      FROM telegram_group_members WHERE is_active = TRUE
      ORDER BY telegram_user_id, observed_at DESC
    `;
    const uploads = await this.prisma.$queryRaw<
      Array<{ memberKey: string; version: string; updatedAt: Date }>
    >`
      SELECT member_key AS "memberKey", version, updated_at AS "updatedAt"
      FROM member_khqr_images
    `;
    return buildMemberQrDirectory(observed).map((member) => {
      const upload = uploads.find((row) => row.memberKey === member.key);
      return {
        key: member.key,
        displayName: member.displayName,
        imageUrl: upload
          ? `/api/member-khqr/${member.key}?v=${upload.version}`
          : member.imageName
            ? `/images/khqr/${member.imageName}.png`
            : null,
        source: upload ? 'upload' : member.imageName ? 'website' : 'none',
        updatedAt: upload?.updatedAt.toISOString() ?? null,
      };
    });
  }

  async upload(key: string, file?: { buffer: Buffer; mimetype: string }) {
    await this.assertMember(key);
    if (
      !file ||
      file.mimetype !== 'image/png' ||
      !file.buffer?.length ||
      file.buffer.length > MAX_KHQR_BYTES
    ) {
      throw new BadRequestException('Choose a PNG image up to 2 MB');
    }
    const content = sanitizeKhqrPng(file.buffer);
    if (content.length > MAX_KHQR_BYTES)
      throw new BadRequestException('The saved PNG exceeds 2 MB');
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
    const [image] = await this.prisma.$queryRaw<Array<{ content: Buffer }>>`
      SELECT content FROM member_khqr_images WHERE member_key = ${key}
    `;
    if (!image) throw new NotFoundException('KHQR not found');
    return image.content;
  }

  private async assertMember(key: string) {
    if (MEMBER_QR_DIRECTORY.some((member) => member.key === key)) return;
    const match = /^tg_([1-9][0-9]{0,19})$/.exec(key);
    if (match) {
      const rows = await this.prisma.$queryRaw<
        Array<{ telegramUserId: string }>
      >`
        SELECT telegram_user_id AS "telegramUserId" FROM telegram_group_members
        WHERE telegram_user_id = ${match[1]} AND is_active = TRUE LIMIT 1
      `;
      if (rows.length) return;
    }
    throw new NotFoundException('Member not found');
  }
}
