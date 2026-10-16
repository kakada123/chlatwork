import {
  GroupAccessService,
  explicitlyBlocked,
} from '../group-workspaces/group-access.service';
import { botAccessAllowed } from './bot-access.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Optional,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { loadImage } from '@napi-rs/canvas';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { memberKhqrImageType } from '../member-khqr/member-khqr-image';
import { BotAccessService, type BotKind } from './bot-access.service';

export const BOT_QR_MAX_BYTES = 2 * 1024 * 1024;

export async function validateBotQr(content: Buffer) {
  if (
    !content?.length ||
    content.length > BOT_QR_MAX_BYTES ||
    !memberKhqrImageType(content)
  ) {
    throw new BadRequestException('Choose a PNG or JPEG image up to 2 MB.');
  }
  // Bound dimensions before decoding to avoid allocating an oversized bitmap.
  const dimensions = imageDimensions(content);
  if (
    !dimensions ||
    dimensions.some((value) => value < 32 || value > 4096) ||
    dimensions[0] * dimensions[1] > 8_000_000
  ) {
    throw new BadRequestException(
      'KHQR dimensions must be 32–4096 pixels, up to 8 megapixels.',
    );
  }
  try {
    const decoded = await loadImage(content);
    if (decoded.width !== dimensions[0] || decoded.height !== dimensions[1])
      throw new Error('Invalid dimensions');
  } catch {
    throw new BadRequestException(
      'This image could not be decoded. Choose a valid PNG or JPEG.',
    );
  }
  return content;
}

function imageDimensions(content: Buffer): [number, number] | null {
  if (memberKhqrImageType(content) === 'image/png') {
    return content.length >= 24
      ? [content.readUInt32BE(16), content.readUInt32BE(20)]
      : null;
  }
  let offset = 2;
  while (offset + 4 <= content.length) {
    if (content[offset++] !== 0xff) return null;
    while (content[offset] === 0xff) offset++;
    const marker = content[offset++];
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > content.length) return null;
    const length = content.readUInt16BE(offset);
    if (length < 2 || offset + length > content.length) return null;
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      return length >= 7
        ? [content.readUInt16BE(offset + 5), content.readUInt16BE(offset + 3)]
        : null;
    }
    offset += length;
  }
  return null;
}

@Injectable()
export class BotKhqrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BotAccessService,
    @Optional() private readonly groups?: GroupAccessService,
  ) {}

  private async authorize(bot: BotKind, userId: string) {
    if (!this.groups) {
      await this.access.assertAllowed(bot, userId);
      return null;
    }
    const identity = await this.access.identity(bot, userId);
    if (botAccessAllowed(identity)) return null;
    if (!identity || explicitlyBlocked(identity))
      throw new ForbiddenException('KHQR access unavailable.');
    const context = await this.groups.personalQr(bot, userId);
    if (!context || !context.khqr)
      throw new ForbiddenException(
        'Join an active connected group to manage your KHQR.',
      );
    return context;
  }

  async current(userId: string) {
    const [row] = await this.prisma.$queryRaw<
      Array<{ telegramId: string; version: string | null }>
    >`
      SELECT p.telegram_user_id::text AS "telegramId", q.version
      FROM telegram_bot_profiles p
      LEFT JOIN member_khqr_images q ON q.member_key = 'tg_' || p.telegram_user_id::text
      WHERE p.user_id = ${userId}::uuid
    `;
    return row?.version
      ? `/api/member-khqr/tg_${row.telegramId}?v=${row.version}`
      : null;
  }

  async begin(bot: BotKind, userId: string) {
    const context = await this.authorize(bot, userId);
    const token = randomUUID();
    await this.prisma.$executeRaw`
      INSERT INTO telegram_bot_qr_drafts(user_id, bot, token, expires_at, group_workspace_id, workspace_version)
      VALUES (${userId}::uuid, ${bot}, ${token}, NOW() + INTERVAL '10 minutes', ${context?.workspaceId ?? null}::uuid, ${context?.workspaceVersion ?? null})
      ON CONFLICT (user_id, bot) DO UPDATE SET token = EXCLUDED.token, content = NULL, expires_at = EXCLUDED.expires_at, group_workspace_id = EXCLUDED.group_workspace_id, workspace_version = EXCLUDED.workspace_version
    `;
    return token;
  }

  async awaiting(bot: BotKind, userId: string, includePreview = false) {
    const [row] = await this.prisma.$queryRaw<Array<{ token: string }>>`
      SELECT token FROM telegram_bot_qr_drafts
      WHERE user_id = ${userId}::uuid AND bot = ${bot} AND expires_at > NOW() AND (content IS NULL OR ${includePreview})
    `;
    return row?.token ?? null;
  }

  async preview(bot: BotKind, userId: string, token: string, bytes: Buffer) {
    await this.authorize(bot, userId);
    const content = await validateBotQr(bytes);
    const changed = await this.prisma.$executeRaw`
      UPDATE telegram_bot_qr_drafts SET content = ${content}
      WHERE user_id = ${userId}::uuid AND bot = ${bot} AND token = ${token}
        AND expires_at > NOW() AND content IS NULL
    `;
    if (changed !== 1)
      throw new ConflictException('Upload expired. Use /myqr again.');
  }

  async confirm(bot: BotKind, userId: string, token: string, remove = false) {
    await this.authorize(bot, userId);
    return this.prisma.$transaction(async (tx) => {
      // Share the profile lock with admin reviews so revocation cannot race a save.
      const [profile] = await tx.$queryRaw<
        Array<{
          telegramId: string;
          status: string;
          enabled: boolean;
          isActive: boolean;
        }>
      >`
        SELECT p.telegram_user_id::text AS "telegramId", p.status, m.enabled, u."isActive" AS "isActive"
        FROM telegram_bot_profiles p JOIN telegram_bot_memberships m ON m.user_id = p.user_id AND m.bot = ${bot}
        JOIN users u ON u.id = p.user_id WHERE p.user_id = ${userId}::uuid FOR UPDATE OF p
      `;
      if (
        !profile?.isActive ||
        ['REJECTED', 'SUSPENDED'].includes(profile.status) ||
        !profile.enabled
      )
        throw new ConflictException('Bot access changed.');
      const [draft] = await tx.$queryRaw<
        Array<{
          content: Uint8Array | null;
          workspaceId?: string | null;
          workspaceVersion?: number | null;
        }>
      >`
        DELETE FROM telegram_bot_qr_drafts WHERE user_id = ${userId}::uuid AND bot = ${bot}
          AND token = ${token} AND expires_at > NOW() RETURNING content,group_workspace_id::text AS "workspaceId",workspace_version AS "workspaceVersion"
      `;
      if (!draft || (!remove && !draft.content))
        throw new ConflictException(
          'Upload expired or already confirmed. Use /myqr again.',
        );
      if (profile.status !== 'APPROVED') {
        if (!draft.workspaceId || !this.groups)
          throw new ConflictException('KHQR access changed. Open /myqr again.');
        const [workspace] = await tx.$queryRaw<
          Array<{
            version: number;
            status: string;
            chatId: string;
            enabled: boolean;
            health: string;
            khqr: boolean;
          }>
        >`
          SELECT w.version,w.status,w.telegram_chat_id::text AS "chatId",c.enabled,c.health,c.khqr
          FROM telegram_group_workspaces w JOIN telegram_group_connections c ON c.workspace_id=w.id AND c.bot=${bot}
          WHERE w.id=${draft.workspaceId}::uuid FOR SHARE OF w,c
        `;
        if (
          !workspace ||
          workspace.version !== draft.workspaceVersion ||
          workspace.status !== 'ACTIVE' ||
          !workspace.enabled ||
          workspace.health !== 'CONNECTED' ||
          !workspace.khqr ||
          !(await this.groups.member(bot, workspace.chatId, profile.telegramId))
        )
          throw new ConflictException(
            'Group access changed. Open /myqr again.',
          );
      }
      await this.save(
        tx,
        userId,
        profile.telegramId,
        remove ? null : Buffer.from(draft.content!),
        bot,
        userId,
        `qr:${token}`,
      );
    });
  }

  async cancel(bot: BotKind, userId: string) {
    await this.prisma
      .$executeRaw`DELETE FROM telegram_bot_qr_drafts WHERE user_id = ${userId}::uuid AND bot = ${bot}`;
  }

  async adminSave(actorId: string, userId: string, bytes: Buffer | null) {
    const content = bytes ? await validateBotQr(bytes) : null;
    return this.prisma.$transaction(async (tx) => {
      const [profile] = await tx.$queryRaw<Array<{ telegramId: string }>>`
        SELECT telegram_user_id::text AS "telegramId" FROM telegram_bot_profiles
        WHERE user_id = ${userId}::uuid FOR UPDATE
      `;
      if (!profile) throw new BadRequestException('Telegram user not found.');
      await this.save(
        tx,
        userId,
        profile.telegramId,
        content,
        null,
        actorId,
        `admin-qr:${randomUUID()}`,
      );
    });
  }

  private async save(
    tx: Prisma.TransactionClient,
    userId: string,
    telegramId: string,
    content: Buffer | null,
    bot: BotKind | null,
    actorId: string,
    operation: string,
  ) {
    const key = `tg_${telegramId}`;
    if (content) {
      const version = createHash('sha256').update(content).digest('hex');
      await tx.$executeRaw`
        INSERT INTO member_khqr_images(member_key, content, version, updated_at)
        VALUES (${key}, ${content}, ${version}, NOW())
        ON CONFLICT (member_key) DO UPDATE SET content = EXCLUDED.content, version = EXCLUDED.version, updated_at = NOW()
      `;
    } else {
      await tx.$executeRaw`DELETE FROM member_khqr_images WHERE member_key = ${key}`;
    }
    await tx.$executeRaw`
      INSERT INTO telegram_bot_audit(user_id, actor_id, bot, action, operation_key)
      VALUES (${userId}::uuid, ${actorId}::uuid, ${bot}, ${content ? 'KHQR_SAVED' : 'KHQR_REMOVED'}, ${operation})
      ON CONFLICT DO NOTHING
    `;
  }
}
