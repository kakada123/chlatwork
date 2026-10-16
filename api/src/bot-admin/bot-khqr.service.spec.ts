import { createCanvas } from '@napi-rs/canvas';
import { BotKhqrService, validateBotQr } from './bot-khqr.service';

function png(width = 100, height = 100) {
  return createCanvas(width, height).toBuffer('image/png');
}

describe('owner KHQR', () => {
  it('accepts a decoded PNG and rejects a spoofed, truncated or oversized image', async () => {
    await expect(validateBotQr(png())).resolves.toBeInstanceOf(Buffer);
    await expect(validateBotQr(Buffer.from('not an image'))).rejects.toThrow();
    await expect(validateBotQr(png().subarray(0, 24))).rejects.toThrow();
    const bomb = png();
    bomb.writeUInt32BE(100000, 16);
    await expect(validateBotQr(bomb)).rejects.toThrow('dimensions');
    await expect(
      validateBotQr(Buffer.alloc(2 * 1024 * 1024 + 1)),
    ).rejects.toThrow();
  });

  it('preserves saved QR when an invalid draft is uploaded', async () => {
    const prisma = { $executeRaw: jest.fn() };
    const access = { assertAllowed: jest.fn() };
    const service = new BotKhqrService(prisma as never, access as never);
    await expect(
      service.preview('CREATOR', 'owner', 'token', Buffer.from('invalid')),
    ).rejects.toThrow();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('rejects a disabled owner before accepting bytes or confirming', async () => {
    const prisma = { $executeRaw: jest.fn(), $transaction: jest.fn() };
    const service = new BotKhqrService(
      prisma as never,
      {
        assertAllowed: jest.fn().mockRejectedValue(new Error('disabled')),
      } as never,
    );
    await expect(
      service.preview('CHLATWORK', 'owner', 'token', png()),
    ).rejects.toThrow('disabled');
    await expect(
      service.confirm('CHLATWORK', 'owner', 'token'),
    ).rejects.toThrow('disabled');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
