import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BIRTHDAY_AUDIO_TRACKS } from './birthday-audio';
import { CreateMomentDto } from './dto/create-moment.dto';
import { MomentsService } from './moments.service';

const clip = { trackId: 'hbd-001', startMs: 5000, endMs: 20_000 };
const draft: CreateMomentDto = {
  recipientName: 'Neth', occasion: 'BIRTHDAY', title: 'Happy birthday!',
  message: 'Have a lovely day.', secretMessage: 'See you soon!', theme: 'CUTE',
};

function fixture() {
  const prisma = { moment: {
    count: jest.fn().mockResolvedValue(0),
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'moment', slug: 'neth' }),
  } };
  return { prisma, service: new MomentsService(prisma as never) };
}

describe('birthday music creation', () => {
  it('persists only the selected track and boundaries in the existing hero block', async () => {
    const { service, prisma } = fixture();
    await service.create('owner', { ...draft, birthdayAudio: clip });
    expect(prisma.moment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ creatorId: 'owner', blocks: { create: expect.arrayContaining([
        { type: 'HERO', position: 0, data: { title: draft.title, birthdayAudio: clip } },
      ]) } }),
    }));
  });

  it('keeps existing birthday and nonbirthday moments without music unchanged', async () => {
    const { service, prisma } = fixture();
    await service.create('owner', draft);
    expect(prisma.moment.create.mock.calls[0][0].data.blocks.create[0].data).toEqual({ title: draft.title });
    await expect(service.create('owner', { ...draft, occasion: 'ANNIVERSARY' })).resolves.toBeDefined();
  });

  it.each([
    { ...clip, trackId: 'https://untrusted.test/music' },
    { ...clip, startMs: -1000 }, { ...clip, endMs: 5000 },
    { ...clip, endMs: BIRTHDAY_AUDIO_TRACKS[0].durationMs + 1 },
    { ...clip, endMs: 5500 }, { ...clip, startMs: 0.2 },
  ])('rejects invalid clips before writing: %j', async (birthdayAudio) => {
    const { service, prisma } = fixture();
    await expect(service.create('owner', { ...draft, birthdayAudio })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.moment.create).not.toHaveBeenCalled();
  });

  it('does not accept music on another occasion', async () => {
    const { service, prisma } = fixture();
    await expect(service.create('owner', { ...draft, occasion: 'WEDDING', birthdayAudio: clip })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.moment.create).not.toHaveBeenCalled();
  });

  it('validates the nested API object without coercing strings or accepting arrays', () => {
    expect(validateSync(plainToInstance(CreateMomentDto, { ...draft, birthdayAudio: clip }))).toEqual([]);
    for (const birthdayAudio of [{ ...clip, startMs: '5000' }, [], 'music', { ...clip, endMs: NaN }]) {
      expect(validateSync(plainToInstance(CreateMomentDto, { ...draft, birthdayAudio })).length).toBeGreaterThan(0);
    }
  });

  it('returns the clip on ready shares but reveals no block data before scheduled unlock', async () => {
    const { service, prisma } = fixture();
    const moment = {
      id: 'moment', slug: 'neth', recipientName: 'Neth', occasion: 'BIRTHDAY',
      title: draft.title, theme: 'CUTE', status: 'PUBLISHED', expiresAt: null,
      publishAt: null as Date | null, groupWorkspaceId: null, media: [], voteSchedule: null,
      blocks: [{ id: 'hero', type: 'HERO', position: 0, data: { title: draft.title, birthdayAudio: clip } }],
    };
    prisma.moment.findUnique.mockResolvedValue(moment);
    expect(await service.getPublic('neth')).toMatchObject({ status: 'ready', blocks: moment.blocks });
    moment.publishAt = new Date(Date.now() + 60_000);
    expect(await service.getPublic('neth')).toEqual({
      status: 'locked', recipientName: 'Neth', unlockAt: moment.publishAt.toISOString(),
    });
  });
});
