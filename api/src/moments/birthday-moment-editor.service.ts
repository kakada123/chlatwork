import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { loadImage } from '@napi-rs/canvas';
import {
  MomentBlockType,
  MomentOccasion,
  MomentStatus,
  Prisma,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { basename } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { readBirthdayAudioClip } from './birthday-audio';
import { readBirthdayStorySettings } from './birthday-story';
import {
  readBirthdayAccessState,
  readBirthdayUnlock,
  resolveBirthdayAccessEdit,
  stripBirthdayAccess,
  type BirthdayUnlock,
} from './birthday-access';
import { CreateMomentDto } from './dto/create-moment.dto';
import {
  detectImageMime,
  MAX_MOMENT_IMAGE_BYTES,
  normalizeMomentImage,
  type MomentUpload,
} from './moments.service';

export const MAX_BIRTHDAY_EDIT_PAYLOAD_BYTES = 80_000;
export const MAX_BIRTHDAY_EDIT_REQUEST_BYTES = 4_000_000;
const MULTIPART_OVERHEAD_BYTES = 20_000;
const MAX_PHOTOS = 10;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EDIT_SELECT = {
  id: true,
  creatorId: true,
  groupWorkspaceId: true,
  slug: true,
  status: true,
  recipientName: true,
  occasion: true,
  title: true,
  theme: true,
  publishAt: true,
  expiresAt: true,
  blocks: {
    orderBy: { position: 'asc' },
    select: { id: true, type: true, position: true, data: true },
  },
  media: { orderBy: { position: 'asc' }, select: { id: true, position: true } },
} as const satisfies Prisma.MomentSelect;
type EditableMoment = Prisma.MomentGetPayload<{ select: typeof EDIT_SELECT }>;
type PhotoReference =
  { kind: 'existing'; id: string } | { kind: 'new'; index: number };
interface EditorInput {
  birthdayUnlock?: BirthdayUnlock | null;
  dto: CreateMomentDto;
  photos: PhotoReference[];
  blocks: Array<{
    type: MomentBlockType;
    position: number;
    data: Prisma.InputJsonObject;
  }>;
  storyEnabled: boolean;
  dates: { publishAt?: Date | null; expiresAt?: Date | null };
}
interface NormalizedPhoto {
  content: Uint8Array<ArrayBuffer>;
  originalName: string;
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function ownerWhere(userId: string, momentId: string) {
  return {
    id: momentId,
    creatorId: userId,
    groupWorkspaceId: null,
    occasion: MomentOccasion.BIRTHDAY,
  };
}
function assertOwned(
  moment: EditableMoment | null,
  userId: string,
): asserts moment is EditableMoment {
  if (
    !moment ||
    moment.creatorId !== userId ||
    moment.groupWorkspaceId ||
    moment.occasion !== MomentOccasion.BIRTHDAY
  ) {
    throw new NotFoundException('Birthday Moment not found');
  }
}
function toEditorView(moment: EditableMoment) {
  const access = readBirthdayAccessState(moment.blocks);
  // Hydrating corrupt protection as disabled would let an unrelated form save silently remove the gate.
  if (access.kind === 'invalid') {
    throw new ServiceUnavailableException(
      'Birthday unlock settings are temporarily unavailable.',
    );
  }
  return {
    id: moment.id,
    slug: moment.slug,
    status: moment.status,
    recipientName: moment.recipientName,
    occasion: 'BIRTHDAY' as const,
    title: moment.title,
    theme: moment.theme,
    publishAt: moment.publishAt?.toISOString() ?? null,
    expiresAt: moment.expiresAt?.toISOString() ?? null,
    birthdayUnlock:
      access.kind === 'configured'
        ? { day: access.access.day, month: access.access.month }
        : null,
    blocks: moment.blocks.map((block) => ({
      ...block,
      data: stripBirthdayAccess(block.data),
    })),
    media: moment.media.map(({ id, position }) => ({
      id,
      position,
      url: `/api/moments/${moment.id}/edit/media/${id}`,
    })),
  };
}

function webpDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  if (buffer.length < 20 || buffer.readUInt32LE(4) + 8 !== buffer.length)
    return null;
  let dimensions: { width: number; height: number } | null = null;
  let canvas: { width: number; height: number } | null = null;
  let offset = 12;
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) return null;
    const type = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    if (end > buffer.length || end + (size % 2) > buffer.length) return null;
    if (type === 'ANIM' || type === 'ANMF') return null;
    if (type === 'VP8X') {
      if (size !== 10 || canvas || buffer[start] & 2) return null;
      canvas = {
        width: buffer.readUIntLE(start + 4, 3) + 1,
        height: buffer.readUIntLE(start + 7, 3) + 1,
      };
    } else if (type === 'VP8 ' || type === 'VP8L') {
      if (dimensions) return null;
      if (type === 'VP8 ') {
        if (
          size < 10 ||
          buffer.toString('hex', start + 3, start + 6) !== '9d012a'
        )
          return null;
        dimensions = {
          width: buffer.readUInt16LE(start + 6) & 0x3fff,
          height: buffer.readUInt16LE(start + 8) & 0x3fff,
        };
      } else {
        if (size < 5 || buffer[start] !== 0x2f) return null;
        const bits = buffer.readUInt32LE(start + 1);
        if (bits >>> 29) return null;
        dimensions = {
          width: (bits & 0x3fff) + 1,
          height: ((bits >>> 14) & 0x3fff) + 1,
        };
      }
    }
    offset = end + (size % 2);
  }
  if (
    !dimensions ||
    !dimensions.width ||
    !dimensions.height ||
    (canvas &&
      (canvas.width !== dimensions.width ||
        canvas.height !== dimensions.height))
  )
    return null;
  return dimensions;
}

@Injectable()
export class BirthdayMomentEditorService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, momentId: string) {
    const moment = await this.prisma.moment.findFirst({
      where: ownerWhere(userId, momentId),
      select: EDIT_SELECT,
    });
    assertOwned(moment, userId);
    return toEditorView(moment);
  }

  async getMedia(userId: string, momentId: string, mediaId: string) {
    const media = await this.prisma.momentMedia.findFirst({
      where: { id: mediaId, moment: ownerWhere(userId, momentId) },
      select: { mimeType: true, content: true },
    });
    if (!media?.content || media.mimeType !== 'image/webp')
      throw new NotFoundException('Photo not found');
    const content = Buffer.from(media.content);
    if (detectImageMime(content) !== 'image/webp')
      throw new NotFoundException('Photo not found');
    return content;
  }

  async update(
    userId: string,
    momentId: string,
    payload: unknown,
    files: MomentUpload[] = [],
  ) {
    const input = await this.readInput(payload, files);
    try {
      const existing = await this.prisma.moment.findFirst({
        where: ownerWhere(userId, momentId),
        select: EDIT_SELECT,
      });
      assertOwned(existing, userId);
      this.validateStoredContext(input, existing);
      const normalized: NormalizedPhoto[] = [];
      // Normalize sequentially before taking the row lock, keeping native image memory and lock duration bounded.
      for (const file of files)
        normalized.push(await this.normalizeUpload(file));

      return await this.prisma.$transaction(
        async (tx) => {
          // Serialize complete saves and recheck personal ownership before touching blocks or media.
          const [owned] = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id::text FROM moments WHERE id = ${momentId}::uuid
            AND creator_id = ${userId}::uuid AND occasion = 'BIRTHDAY'
            AND group_workspace_id IS NULL FOR UPDATE
        `;
          if (!owned) throw new NotFoundException('Birthday Moment not found');
          const current = await tx.moment.findFirst({
            where: ownerWhere(userId, momentId),
            select: EDIT_SELECT,
          });
          assertOwned(current, userId);
          this.validateStoredContext(input, current);
          await this.replaceMedia(
            tx,
            momentId,
            current,
            input.photos,
            normalized,
          );
          const access = resolveBirthdayAccessEdit(
            current.blocks,
            input.birthdayUnlock,
          );
          const blocks = input.blocks.map((block) =>
            block.type === MomentBlockType.HERO && access !== undefined
              ? {
                  ...block,
                  data: {
                    ...block.data,
                    birthdayAccess: access as unknown as Prisma.InputJsonObject,
                  },
                }
              : block,
          );
          await this.replaceBlocks(tx, momentId, current, blocks);
          // Omit identity, status and publishedAt entirely: editing a live card never republishes or changes its link.
          return tx.moment.update({
            where: { id: momentId },
            data: {
              recipientName: input.dto.recipientName.trim(),
              title: input.dto.title.trim(),
              theme: input.dto.theme,
              ...input.dates,
            },
            select: { id: true, slug: true, status: true },
          });
        },
        { timeout: 15_000 },
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // Database/native failures can include user content; return a generic failure without logging the payload.
      throw new ServiceUnavailableException(
        'Birthday Moment could not be saved. Please try again.',
      );
    }
  }

  private async readInput(
    payload: unknown,
    files: MomentUpload[],
  ): Promise<EditorInput> {
    if (
      typeof payload !== 'string' ||
      Buffer.byteLength(payload, 'utf8') > MAX_BIRTHDAY_EDIT_PAYLOAD_BYTES ||
      files.length > MAX_PHOTOS
    ) {
      throw new BadRequestException(
        'Choose valid birthday Moment settings and up to 10 photos',
      );
    }
    const uploadBytes = files.reduce(
      (total, file) =>
        total + (Buffer.isBuffer(file?.buffer) ? file.buffer.length : 0),
      0,
    );
    // The same multipart save crosses Vercel's BFF; leave room for multipart boundaries and field headers.
    if (
      uploadBytes +
        Buffer.byteLength(payload, 'utf8') +
        MULTIPART_OVERHEAD_BYTES >
      MAX_BIRTHDAY_EDIT_REQUEST_BYTES
    ) {
      throw new PayloadTooLargeException(
        'Keep the combined new photos under 4MB and try again.',
      );
    }
    let envelope: unknown;
    try {
      envelope = JSON.parse(payload);
    } catch {
      throw new BadRequestException('Invalid birthday Moment settings');
    }
    if (
      !record(envelope) ||
      Object.keys(envelope).length !== 2 ||
      !record(envelope.moment) ||
      !Array.isArray(envelope.photoOrder) ||
      envelope.photoOrder.length > MAX_PHOTOS
    ) {
      throw new BadRequestException('Invalid birthday Moment settings');
    }
    const rawMoment = envelope.moment;
    let dto: CreateMomentDto;
    try {
      dto = plainToInstance(CreateMomentDto, rawMoment);
      if (
        (
          await validate(dto, {
            whitelist: true,
            forbidNonWhitelisted: true,
            forbidUnknownValues: true,
          })
        ).length
      ) {
        throw new Error('Invalid DTO');
      }
    } catch {
      throw new BadRequestException('Choose valid birthday Moment settings');
    }
    if (
      dto.occasion !== 'BIRTHDAY' ||
      !dto.recipientName.trim() ||
      !dto.title.trim() ||
      !dto.message.trim()
    ) {
      throw new BadRequestException('Birthday Moment text cannot be blank');
    }
    const audio = readBirthdayAudioClip(dto.birthdayAudio);
    const birthdayUnlock = readBirthdayUnlock(dto.birthdayUnlock);
    if (dto.birthdayUnlock != null && !birthdayUnlock)
      throw new BadRequestException('Choose a valid birthday day and month');
    if (dto.birthdayAudio != null && !audio)
      throw new BadRequestException('Choose a valid birthday track and clip');
    const story = readBirthdayStorySettings(dto.birthdayStory);
    if (dto.birthdayStory != null && !story)
      throw new BadRequestException('Choose valid birthday story settings');
    if (dto.specialDate) {
      const date = new Date(`${dto.specialDate}T00:00:00.000Z`);
      if (
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== dto.specialDate
      )
        throw new BadRequestException('Choose a valid special date');
    }
    if (dto.mapUrl?.trim()) {
      try {
        if (!['http:', 'https:'].includes(new URL(dto.mapUrl).protocol))
          throw new Error();
      } catch {
        throw new BadRequestException('Map URL must use HTTP or HTTPS');
      }
    }
    const dates: EditorInput['dates'] = {};
    for (const field of ['publishAt', 'expiresAt'] as const) {
      if (Object.hasOwn(rawMoment, field)) {
        dates[field] = dto[field] == null ? null : new Date(dto[field]);
        if (dates[field] && !Number.isFinite(dates[field]!.getTime()))
          throw new BadRequestException('Choose valid Moment dates');
      }
    }
    const seen = new Set<string>();
    const newIndices = new Set<number>();
    const photos: PhotoReference[] = [];
    for (const reference of envelope.photoOrder) {
      if (typeof reference !== 'string')
        throw new BadRequestException('Choose a valid photo order');
      const canonical = UUID.test(reference)
        ? reference.toLowerCase()
        : reference;
      if (seen.has(canonical))
        throw new BadRequestException('Choose a valid photo order');
      seen.add(canonical);
      if (UUID.test(reference))
        photos.push({ kind: 'existing', id: reference.toLowerCase() });
      else if (/^new:(0|[1-9]\d*)$/.test(reference)) {
        const index = Number(reference.slice(4));
        if (!Number.isSafeInteger(index) || index >= files.length)
          throw new BadRequestException('Choose a valid photo order');
        newIndices.add(index);
        photos.push({ kind: 'new', index });
      } else throw new BadRequestException('Choose a valid photo order');
    }
    if (newIndices.size !== files.length)
      throw new BadRequestException(
        'Each uploaded photo must appear once in the photo order',
      );
    if (story) story.memories = story.memories.slice(0, photos.length);
    const blocks: EditorInput['blocks'] = [];
    const add = (type: MomentBlockType, data: Prisma.InputJsonObject) =>
      blocks.push({ type, position: blocks.length, data });
    add(MomentBlockType.HERO, {
      title: dto.title.trim(),
      ...(audio
        ? { birthdayAudio: audio as unknown as Prisma.InputJsonObject }
        : {}),
      ...(story
        ? { birthdayStory: story as unknown as Prisma.InputJsonObject }
        : {}),
    });
    add(MomentBlockType.MESSAGE, { message: dto.message.trim() });
    add(MomentBlockType.GALLERY, {});
    if (dto.specialDate)
      add(MomentBlockType.COUNTER, { date: dto.specialDate });
    add(MomentBlockType.SECRET, { message: dto.secretMessage.trim() });
    return {
      dto,
      birthdayUnlock:
        dto.birthdayUnlock === null ? null : (birthdayUnlock ?? undefined),
      photos,
      blocks,
      storyEnabled: story?.enabled === true,
      dates,
    };
  }

  private validateStoredContext(input: EditorInput, moment: EditableMoment) {
    const existing = new Set(moment.media.map((media) => media.id));
    if (
      input.photos.some(
        (photo) => photo.kind === 'existing' && !existing.has(photo.id),
      )
    )
      throw new BadRequestException('Choose photos belonging to this Moment');
    if (
      moment.status === MomentStatus.PUBLISHED &&
      !input.storyEnabled &&
      !input.photos.length
    )
      throw new BadRequestException('Add at least one photo for Simple Mode');
    const datesChanged = (['publishAt', 'expiresAt'] as const).some(
      (field) =>
        Object.hasOwn(input.dates, field) &&
        (input.dates[field]?.getTime() ?? null) !==
          (moment[field]?.getTime() ?? null),
    );
    // Expired cards stay expired while their content is edited; only changed schedules need a new date check.
    if (datesChanged) {
      const publishAt = Object.hasOwn(input.dates, 'publishAt')
        ? input.dates.publishAt
        : moment.publishAt;
      const expiresAt = Object.hasOwn(input.dates, 'expiresAt')
        ? input.dates.expiresAt
        : moment.expiresAt;
      if (expiresAt && expiresAt <= (publishAt ?? new Date()))
        throw new BadRequestException(
          'Expiry date must be after the Moment unlocks',
        );
    }
  }

  private async normalizeUpload(file: MomentUpload): Promise<NormalizedPhoto> {
    if (
      !Buffer.isBuffer(file?.buffer) ||
      !file.buffer.length ||
      file.size !== file.buffer.length ||
      file.buffer.length > MAX_MOMENT_IMAGE_BYTES
    )
      throw new BadRequestException(
        'Each Moment image must be valid and 10MB or smaller',
      );
    const mime = detectImageMime(file.buffer);
    if (!mime || mime !== file.mimetype)
      throw new BadRequestException(
        'Only valid JPEG, PNG, and WebP images are accepted',
      );
    if (mime === 'image/webp') {
      // Validate RIFF bounds and dimensions before native decode; a matching magic prefix alone is unsafe.
      const dimensions = webpDimensions(file.buffer);
      if (!dimensions || dimensions.width * dimensions.height > 40_000_000)
        throw new BadRequestException(
          'Choose a valid image of 40 megapixels or smaller',
        );
      try {
        const image = await loadImage(file.buffer);
        if (
          !image.width ||
          !image.height ||
          image.width * image.height > 40_000_000
        )
          throw new Error();
      } catch {
        throw new BadRequestException(
          'Choose a valid image of 40 megapixels or smaller',
        );
      }
    }
    const normalized = await normalizeMomentImage(file.buffer, mime);
    const name =
      basename(file.originalname)
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/\.[^.]+$/, '')
        .slice(0, 175) || 'photo';
    return {
      content: Uint8Array.from(normalized),
      originalName: `${name}.webp`,
    };
  }

  private async replaceMedia(
    tx: Prisma.TransactionClient,
    momentId: string,
    current: EditableMoment,
    photos: PhotoReference[],
    normalized: NormalizedPhoto[],
  ) {
    const existing = photos.flatMap((photo) =>
      photo.kind === 'existing' ? [photo.id] : [],
    );
    await tx.momentMedia.deleteMany({
      where: { momentId, id: { notIn: existing } },
    });
    // Move retained rows below every previous position before swapping order under the unique position constraint.
    const temporaryBase =
      Math.min(0, ...current.media.map((media) => media.position)) -
      existing.length -
      1;
    for (const [index, id] of existing.entries())
      await tx.momentMedia.update({
        where: { id },
        data: { position: temporaryBase - index },
      });
    for (const [position, photo] of photos.entries()) {
      if (photo.kind === 'existing')
        await tx.momentMedia.update({
          where: { id: photo.id },
          data: { position },
        });
      else {
        const prepared = normalized[photo.index];
        await tx.momentMedia.create({
          data: {
            momentId,
            position,
            mimeType: 'image/webp',
            byteSize: prepared.content.length,
            originalName: prepared.originalName,
            content: prepared.content,
          },
        });
      }
    }
  }

  private async replaceBlocks(
    tx: Prisma.TransactionClient,
    momentId: string,
    current: EditableMoment,
    blocks: EditorInput['blocks'],
  ) {
    const retained = new Map(
      blocks.flatMap((block) => {
        const existing = current.blocks.find(
          (item) => item.type === block.type,
        );
        return existing ? [[block.type, existing.id] as const] : [];
      }),
    );
    await tx.momentBlock.deleteMany({
      where: { momentId, id: { notIn: [...retained.values()] } },
    });
    const temporaryBase =
      Math.min(0, ...current.blocks.map((block) => block.position)) -
      retained.size -
      1;
    for (const [index, id] of [...retained.values()].entries())
      await tx.momentBlock.update({
        where: { id },
        data: { position: temporaryBase - index },
      });
    for (const block of blocks) {
      const id = retained.get(block.type);
      if (id)
        await tx.momentBlock.update({
          where: { id },
          data: { position: block.position, data: block.data },
        });
      else await tx.momentBlock.create({ data: { momentId, ...block } });
    }
  }
}
