import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  MAX_MOMENT_IMAGE_BYTES,
  detectImageMime,
  normalizeMomentImage,
  type MomentUpload,
} from '../moments/moments.service';
import type { BotKind } from '../bot-admin/bot-access.service';
import type { PollChoice } from '../moments/moment-poll-editor';
import { GroupAccessService } from './group-access.service';
import {
  auditMutation,
  lockGroup,
  operationKey,
  replay,
} from './group-mutations';

@Injectable()
export class GroupPollMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: GroupAccessService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async url(workspaceId: string, bot: BotKind, mediaId: string) {
    const token = await this.jwt.signAsync(
      { purpose: 'group-poll-image', workspaceId, bot, mediaId },
      { audience: 'telegram-group-media', expiresIn: '5m' },
    );
    return new URL(
      `/api/bot/group-media/${mediaId}?token=${encodeURIComponent(token)}`,
      this.config.getOrThrow<string>('FRONTEND_ORIGIN'),
    ).toString();
  }

  async fetch(mediaId: string, token: string) {
    let claims: {
      purpose: string;
      workspaceId: string;
      bot: BotKind;
      mediaId: string;
    };
    try {
      claims = await this.jwt.verifyAsync(token, {
        audience: 'telegram-group-media',
        issuer: 'chlatwork-auth',
      });
    } catch {
      throw new NotFoundException('Photo not found.');
    }
    if (
      claims.purpose !== 'group-poll-image' ||
      claims.mediaId !== mediaId ||
      !['CHLATWORK', 'CREATOR'].includes(claims.bot)
    )
      throw new NotFoundException('Photo not found.');
    const connection = await this.groups.connection(
      claims.bot,
      claims.workspaceId,
    );
    if (!this.groups.active(connection) || !connection.voting)
      throw new NotFoundException('Photo not found.');
    const media = await this.prisma.momentMedia.findFirst({
      where: { id: mediaId, moment: { groupWorkspaceId: claims.workspaceId } },
      select: {
        content: true,
        moment: {
          select: {
            blocks: {
              where: { type: 'POLL' },
              take: 1,
              select: { data: true },
            },
          },
        },
      },
    });
    const options = (
      media?.moment.blocks[0]?.data as { options?: PollChoice[] } | undefined
    )?.options;
    if (
      !media?.content ||
      !options?.some((option) => option.imageId === mediaId)
    )
      throw new NotFoundException('Photo not found.');
    const image = await loadImage(Buffer.from(media.content));
    const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
    const canvas = createCanvas(
      Math.max(1, Math.round(image.width * scale)),
      Math.max(1, Math.round(image.height * scale)),
    );
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return Buffer.from(await canvas.encode('jpeg', 80));
  }

  async upload(
    userId: string,
    workspaceId: string,
    optionId: string,
    expectedVersion: number,
    key: string,
    file?: MomentUpload,
  ) {
    await this.groups.manager(userId, workspaceId, 'CHLATWORK');
    if (
      !file?.buffer.length ||
      file.buffer.length > MAX_MOMENT_IMAGE_BYTES ||
      !detectImageMime(file.buffer)
    )
      throw new BadRequestException('Choose a JPEG, PNG or WebP up to 10 MB.');
    try {
      const image = await loadImage(file.buffer);
      if (image.width * image.height > 40_000_000)
        throw new Error('Image too large');
    } catch {
      throw new BadRequestException(
        'Choose a valid image up to 40 megapixels.',
      );
    }
    const normalized = await normalizeMomentImage(
      file.buffer,
      detectImageMime(file.buffer)!,
    );
    const operation = operationKey(userId, key);
    // Include a content digest: a retried key cannot replace a different image.
    const { createHash } = await import('node:crypto');
    const input = {
      optionId,
      expectedVersion,
      hash: createHash('sha256').update(file.buffer).digest('hex'),
    };
    await this.prisma.$transaction(async (tx) => {
      await this.groups.lockManager(tx, userId, 'CHLATWORK');
      await tx.$queryRaw`SELECT id FROM telegram_group_workspaces WHERE id=${workspaceId}::uuid FOR UPDATE`;
      if (await replay(tx, operation, workspaceId, 'POLL_IMAGE_SAVED', input))
        return;
      await lockGroup(tx, workspaceId, expectedVersion);
      const moment = await tx.moment.findUnique({
        where: { groupWorkspaceId: workspaceId },
        select: { id: true },
      });
      if (!moment) throw new NotFoundException('Poll not found.');
      await tx.$queryRaw`SELECT id FROM moments WHERE id=${moment.id}::uuid FOR UPDATE`;
      const block = await tx.momentBlock.findFirstOrThrow({
        where: { momentId: moment.id, type: 'POLL' },
      });
      const data = block.data as Prisma.JsonObject;
      const options = data.options as unknown as PollChoice[];
      const option = options.find((option) => option.id === optionId);
      if (!option) throw new NotFoundException('Poll choice not found.');
      const media = await tx.momentMedia.create({
        data: {
          momentId: moment.id,
          position: 0,
          mimeType: 'image/webp',
          byteSize: normalized.length,
          originalName: `${optionId}.webp`,
          content: Uint8Array.from(normalized),
        },
      });
      await tx.momentBlock.update({
        where: { id: block.id },
        data: {
          data: {
            ...data,
            options: options.map((choice) =>
              choice.id === optionId
                ? { ...choice, imageId: media.id }
                : choice,
            ),
          } as unknown as Prisma.InputJsonValue,
        },
      });
      if (option.imageId)
        await tx.momentMedia.deleteMany({
          where: { id: option.imageId, momentId: moment.id },
        });
      await auditMutation(
        tx,
        workspaceId,
        userId,
        'CHLATWORK',
        'POLL_IMAGE_SAVED',
        operation,
        input,
      );
    });
    return { updated: true };
  }
}
