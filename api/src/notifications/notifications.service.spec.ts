import { createHmac } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

const BOT_TOKEN = '123456:test-token';
const USER_ID = '00000000-0000-4000-8000-000000000001';

function signedInitData(telegramUserId: string) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'AAEAAAE',
    user: JSON.stringify({ id: Number(telegramUserId), first_name: 'Test' }),
  });
  const checkString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  params.set(
    'hash',
    createHmac('sha256', secret).update(checkString).digest('hex'),
  );
  return params.toString();
}

describe('NotificationsService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    socialAccount: {
      findFirst: jest.fn(),
    },
  };
  const config = {
    getOrThrow: jest.fn(() => BOT_TOKEN),
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports availability from a numeric Telegram social identity', async () => {
    prisma.$queryRaw.mockResolvedValue([{ enabled: true }]);
    prisma.socialAccount.findFirst.mockResolvedValue({
      providerUserId: '123456789',
    });

    await expect(service.getTelegramSettings(USER_ID)).resolves.toEqual({
      available: true,
      enabled: true,
    });
  });

  it('requires the signed Mini App identity to match before enabling', async () => {
    prisma.socialAccount.findFirst.mockResolvedValue({
      providerUserId: '123456789',
    });
    const fetchSpy = jest.spyOn(global, 'fetch');

    await expect(
      service.updateTelegramSettings(USER_ID, {
        enabled: true,
        initData: signedInitData('987654321'),
      }),
    ).rejects.toThrow('Telegram account does not match');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('confirms delivery before saving the opt-in preference', async () => {
    prisma.socialAccount.findFirst.mockResolvedValue({
      providerUserId: '123456789',
    });
    prisma.$executeRaw.mockResolvedValue(1);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: true }),
    } as unknown as Response);

    await expect(
      service.updateTelegramSettings(USER_ID, {
        enabled: true,
        initData: signedInitData('123456789'),
      }),
    ).resolves.toEqual({ available: true, enabled: true });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/api\.telegram\.org\/bot.+\/sendMessage$/,
      ),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('does not persist opt-in when Telegram rejects delivery', async () => {
    prisma.socialAccount.findFirst.mockResolvedValue({
      providerUserId: '123456789',
    });
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ ok: false }),
    } as unknown as Response);

    await expect(
      service.updateTelegramSettings(USER_ID, {
        enabled: true,
        initData: signedInitData('123456789'),
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('allows a signed-in user to disable notifications without Mini App data', async () => {
    prisma.$executeRaw.mockResolvedValue(1);
    prisma.socialAccount.findFirst.mockResolvedValue({
      providerUserId: '123456789',
    });
    const fetchSpy = jest.spyOn(global, 'fetch');

    await expect(
      service.updateTelegramSettings(USER_ID, { enabled: false }),
    ).resolves.toEqual({ available: true, enabled: false });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
