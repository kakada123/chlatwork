import { BotGatewayService } from './bot-gateway.service';
import type { TelegramUpdate } from '../telegram-bot/telegram-bot.types';

function setup(status = 'PENDING', enabled = true, withGroups = false) {
  const access = {
    register: jest.fn(),
    lookup: jest
      .fn()
      .mockResolvedValue({ userId: 'owner', status, enabled, isActive: true }),
    activity: jest.fn(),
  };
  const qr = {
    awaiting: jest.fn().mockResolvedValue(null),
    current: jest.fn(),
    begin: jest.fn(),
    cancel: jest.fn(),
  };
  const client = {
    sendMessage: jest.fn(),
    answerCallback: jest.fn(),
    answerInlineQuery: jest.fn(),
    getMe: jest.fn().mockResolvedValue({ username: 'testbot' }),
  };
  const service = new BotGatewayService(
    access as never,
    qr as never,
    { get: jest.fn(), getOrThrow: () => 'https://example.test' } as never,
    client as never,
    client as never,
    withGroups ? ({} as never) : undefined,
  );
  return { service, access, qr, client };
}

const message = (text: string, group = false): TelegramUpdate => ({
  update_id: 1,
  message: {
    message_id: 4,
    chat: { id: group ? -100 : 123, type: group ? 'supergroup' : 'private' },
    from: { id: 123, first_name: 'User' },
    text,
  },
});

describe('bot access gateway', () => {
  it('routes reminder cancellation past an active KHQR upload', async () => {
    const { service, qr, client } = setup('APPROVED');
    qr.awaiting.mockResolvedValue('pending-upload' as never);
    expect(
      await service.handle(
        'CHLATWORK',
        message('/cancel 00000000-0000-4000-8000-000000000123'),
      ),
    ).toBe(false);
    expect(qr.cancel).not.toHaveBeenCalled();
    expect(client.sendMessage).not.toHaveBeenCalled();
  });

  it.each(['CHLATWORK', 'CREATOR'] as const)(
    'keeps bare /cancel working for %s KHQR uploads',
    async (kind) => {
      const { service, qr } = setup('APPROVED');
      qr.awaiting.mockResolvedValue('pending-upload' as never);
      expect(await service.handle(kind, message('/cancel'))).toBe(true);
      expect(qr.cancel).toHaveBeenCalledWith(kind, 'owner');
    },
  );

  it.each(['/start', '/menu'])(
    'lets approved ChlatWork users reach the assistant through %s with My Groups enabled',
    async (command) => {
      const { service, client, access } = setup('APPROVED', true, true);
      expect(await service.handle('CHLATWORK', message(command))).toBe(false);
      expect(client.sendMessage).not.toHaveBeenCalled();
      expect(access.activity).toHaveBeenCalledWith('CHLATWORK', 'owner');
    },
  );

  it.each(['PENDING', 'REJECTED', 'SUSPENDED'])(
    'keeps %s users in the My Groups access flow',
    async (status) => {
      const { service, client } = setup(status, true, true);
      expect(await service.handle('CHLATWORK', message('/menu'))).toBe(true);
      expect(client.sendMessage).toHaveBeenCalledWith(
        123,
        expect.any(String),
        expect.objectContaining({
          inline_keyboard: expect.arrayContaining([
            [expect.objectContaining({ text: 'My Groups' })],
          ]),
        }),
      );
    },
  );

  it.each(['CREATOR', 'CHLATWORK'] as const)(
    'registers only a private start for %s and blocks pending tools',
    async (kind) => {
      const { service, access, client } = setup();
      expect(await service.handle(kind, message('/start'))).toBe(true);
      expect(access.register).toHaveBeenCalledWith(
        kind,
        expect.objectContaining({ id: 123 }),
        true,
      );
      expect(client.sendMessage).toHaveBeenCalledWith(
        123,
        expect.stringContaining('wait for admin approval'),
      );
      expect(await service.handle(kind, message('/split 36000/6', true))).toBe(
        true,
      );
      expect(access.register).toHaveBeenCalledTimes(1);
    },
  );

  it('blocks pending callback and inline-query bypasses', async () => {
    const { service, client } = setup();
    const update = message('/grammar');
    update.callback_query = {
      id: 'cb',
      from: { id: 123 },
      message: update.message,
      data: 'mode:grammar',
    };
    expect(await service.handle('CREATOR', update)).toBe(true);
    expect(client.answerCallback).toHaveBeenCalled();
    expect(
      await service.handle('CHLATWORK', {
        update_id: 2,
        inline_query: {
          id: 'inline',
          from: { id: 123 },
          query: '',
          offset: '',
        },
      }),
    ).toBe(true);
    expect(client.answerInlineQuery).toHaveBeenCalledWith('inline', []);
  });

  it('keeps QR management private and blocks a separately disabled bot', async () => {
    const allowed = setup('APPROVED');
    expect(
      await allowed.service.handle('CHLATWORK', message('/myqr', true)),
    ).toBe(true);
    expect(allowed.qr.begin).not.toHaveBeenCalled();
    const disabled = setup('APPROVED', false);
    expect(
      await disabled.service.handle('CREATOR', message('/grammar hi')),
    ).toBe(true);
  });

  it('silently ignores another bot and never registers group /start', async () => {
    const { service, access, client } = setup();
    expect(
      await service.handle('CREATOR', message('/start@otherbot', true)),
    ).toBe(true);
    expect(client.sendMessage).not.toHaveBeenCalled();
    await service.handle('CREATOR', message('/start', true));
    expect(access.register).not.toHaveBeenCalled();
  });
});
