import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MomentsService } from './moments.service';
import type { CreateMomentDto } from './dto/create-moment.dto';

const story = { version: 1 as const, enabled: true, theme: 'ROMANTIC_PINK' as const, scenes: ['gift', 'cake', 'memories', 'message', 'secret', 'celebration'] as const, teaser: 'A gift for you', cake: { design: 'CLASSIC' as const, candles: 3 }, memories: [{ caption: 'Our trip', date: '2026-10-01' }], allowReplay: true, allowReactions: true };
const draft: CreateMomentDto = { recipientName: 'Neth', occasion: 'BIRTHDAY', title: 'Happy birthday', message: 'Have a wonderful day', secretMessage: 'Dinner together', theme: 'CUTE' };
function fixture() {
  const prisma = { moment: {
    count: jest.fn().mockResolvedValue(0), findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'moment', slug: 'neth' }), update: jest.fn().mockResolvedValue({}),
  } };
  return { prisma, service: new MomentsService(prisma as never) };
}

describe('birthday story storage', () => {
  it('saves settings in the existing hero JSON and preserves other blocks and music', async () => {
    const { service, prisma } = fixture();
    const birthdayStory = { ...story, scenes: [...story.scenes] };
    const birthdayAudio = { trackId: 'hbd-001', startMs: 1000, endMs: 5000 };
    await service.create('owner', { ...draft, birthdayStory, birthdayAudio });
    const blocks = prisma.moment.create.mock.calls[0][0].data.blocks.create;
    expect(blocks[0].data).toEqual({ title: draft.title, birthdayStory, birthdayAudio });
    expect(blocks.find((block: { type: string }) => block.type === 'SECRET').data.message).toBe(draft.secretMessage);
  });

  it('rejects invalid or nonbirthday configuration before creating any rows', async () => {
    const { service, prisma } = fixture();
    for (const birthdayStory of [{ ...story, scenes: ['cake', 'gift'] }, { ...story, cake: { design: 'CLASSIC', candles: 99 } }]) {
      await expect(service.create('owner', { ...draft, birthdayStory } as CreateMomentDto)).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(service.create('owner', { ...draft, occasion: 'WEDDING', birthdayStory: { ...story, scenes: [...story.scenes] } })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.moment.create).not.toHaveBeenCalled();
  });

  it('allows a disabled secret while keeping ordinary Moment text validation', async () => {
    const { service } = fixture();
    await expect(service.create('owner', { ...draft, secretMessage: '', birthdayStory: { ...story, scenes: ['gift', 'message'] } })).resolves.toBeDefined();
    await expect(service.create('owner', { ...draft, secretMessage: '' })).resolves.toBeDefined();
    await expect(service.create('owner', { ...draft, occasion: 'ANNIVERSARY', secretMessage: '' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publishes photo-free Story Mode while keeping Simple photo and ownership rules', async () => {
    const { service, prisma } = fixture();
    const moment = { creatorId: 'owner', groupWorkspaceId: null, occasion: 'BIRTHDAY', status: 'DRAFT', slug: 'neth', _count: { media: 0 }, blocks: [{ data: { birthdayStory: { ...story, scenes: [...story.scenes] } } }] };
    prisma.moment.findUnique.mockResolvedValue(moment);
    await expect(service.publish('owner', 'moment')).resolves.toEqual({ slug: 'neth' });
    expect(prisma.moment.update).toHaveBeenCalledTimes(1);
    await expect(service.publish('other', 'moment')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.moment.findUnique.mockResolvedValue({ ...moment, blocks: [] });
    await expect(service.publish('owner', 'moment')).rejects.toBeInstanceOf(BadRequestException);
  });
});
