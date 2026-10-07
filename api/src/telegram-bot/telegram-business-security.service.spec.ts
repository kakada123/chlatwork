import { Logger } from '@nestjs/common';
import { TelegramBusinessSecurityService } from './telegram-business-security.service';
import { TelegramBotService } from './telegram-bot.service';
import { SecurityService } from './security.service';

describe('Telegram Business security', () => {
  function setup(overrides: Record<string, unknown> = {}) {
    const settings: Record<string, unknown> = {
      TELEGRAM_BUSINESS_SECURITY_ENABLED: 'true',
      TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE: 'true',
      ...overrides,
    };
    const config = { get: jest.fn((key: string) => settings[key]) };
    const connection = {
      id: 'test-connection',
      user: { id: 111 },
      is_enabled: true,
      rights: { can_delete_all_messages: true },
    };
    const bot = {
      getBusinessConnection: jest.fn().mockResolvedValue(connection),
      deleteBusinessMessages: jest.fn().mockResolvedValue(true),
      sendMessage: jest.fn(),
    };
    const result = {
      status: 'scanned',
      riskScore: 92,
      confidence: 98,
      categories: ['phishing_url'],
    };
    const security = { scan: jest.fn().mockResolvedValue(result) };
    const alerts = {
      ownerAlertsEnabled: () =>
        settings.TELEGRAM_BUSINESS_SECURITY_ENABLED === 'true',
      chatAlertsEnabled: () =>
        settings.TELEGRAM_BUSINESS_SECURITY_ENABLED === 'true',
      notify: jest.fn().mockResolvedValue(undefined),
      handleCallback: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TelegramBusinessSecurityService(
      config as never,
      bot as never,
      security as never,
      alerts as never,
    );
    const message = {
      business_connection_id: 'test-connection',
      message_id: 10,
      from: { id: 222 },
      chat: { id: 222, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text: 'Verify at https://example.invalid',
    };
    return {
      settings,
      config,
      connection,
      bot,
      result,
      security,
      alerts,
      service,
      message,
    };
  }

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('reports only non-sensitive scanner settings at startup', () => {
    const { service, bot, security } = setup({
      TELEGRAM_BUSINESS_SECURITY_ENABLED: 'false',
      TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE: 'false',
      TELEGRAM_BUSINESS_SECURITY_RISK_THRESHOLD: '96',
      TELEGRAM_BUSINESS_SECURITY_CONFIDENCE_THRESHOLD: '99',
    });
    service.onModuleInit();
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'telegram_business_security_status',
        scanningEnabled: false,
        fileScanEnabled: false,
        urlScanEnabled: false,
        ownerAlertsEnabled: false,
        chatAlertsEnabled: false,
        autoDeleteEnabled: false,
        riskThreshold: 96,
        confidenceThreshold: 99,
      }),
    );
    expect(bot.getBusinessConnection).not.toHaveBeenCalled();
    expect(security.scan).not.toHaveBeenCalled();
  });

  it('deletes a 92/100 high-confidence incoming message using the Business API', async () => {
    const { service, message, bot, security } = setup();
    await service.handleMessage(message);
    expect(security.scan).toHaveBeenCalledWith(message);
    expect(bot.deleteBusinessMessages).toHaveBeenCalledWith(
      'test-connection',
      [10],
    );
    expect(bot.sendMessage).not.toHaveBeenCalled();
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('"action":"deleted"'),
    );
  });

  it.each([
    {
      verdict: 'infected',
      autoDelete: 'true',
      permission: true,
      deleted: true,
    },
    {
      verdict: 'infected',
      autoDelete: 'false',
      permission: true,
      deleted: false,
    },
    {
      verdict: 'infected',
      autoDelete: 'true',
      permission: false,
      deleted: false,
    },
    { verdict: 'clean', autoDelete: 'true', permission: true, deleted: false },
    {
      verdict: 'unavailable',
      autoDelete: 'true',
      permission: true,
      deleted: false,
    },
    {
      verdict: 'unsupported',
      autoDelete: 'true',
      permission: true,
      deleted: false,
    },
    { verdict: 'busy', autoDelete: 'true', permission: true, deleted: false },
  ])(
    'applies malware verdict $verdict with deletion=$autoDelete and permission=$permission',
    async ({ verdict, autoDelete, permission, deleted }) => {
      const test = setup({
        TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE: autoDelete,
      });
      test.connection.rights.can_delete_all_messages = permission;
      const ai = {
        isConfigured: () => false,
        assessMessageSecurity: jest.fn(),
      };
      const files = { scan: jest.fn().mockResolvedValue({ status: verdict }) };
      const security = new SecurityService(
        ai as never,
        files as never,
        { scan: jest.fn().mockResolvedValue({ status: 'disabled' }) } as never,
      );
      const service = new TelegramBusinessSecurityService(
        test.config as never,
        test.bot as never,
        security,
        test.alerts as never,
      );
      await service.handleMessage({
        ...test.message,
        text: undefined,
        document: {
          file_id: 'private-file',
          file_name: 'private-document.pdf',
        },
      });
      expect(test.bot.deleteBusinessMessages).toHaveBeenCalledTimes(
        deleted ? 1 : 0,
      );
      expect(test.alerts.notify).toHaveBeenCalledWith(
        expect.objectContaining({ document: expect.any(Object) }),
        test.connection,
        expect.objectContaining({ fileScan: { status: verdict } }),
        deleted
          ? 'deleted'
          : verdict === 'infected' && autoDelete === 'true' && !permission
            ? 'permission_missing'
            : 'preserved',
      );
      const logs = JSON.stringify(
        (Logger.prototype.log as jest.Mock).mock.calls,
      );
      expect(
        (Logger.prototype.log as jest.Mock).mock.calls.map(([line]) =>
          JSON.parse(line),
        ),
      ).toContainEqual(expect.objectContaining({ fileScanStatus: verdict }));
      expect(logs).not.toContain('private-file');
      expect(logs).not.toContain('private-document');
      expect(ai.assessMessageSecurity).not.toHaveBeenCalled();
    },
  );

  it.each([
    { riskScore: 89 },
    { confidence: 94 },
    { categories: [] },
    { status: 'unavailable' },
    { status: 'unsupported' },
  ])(
    'preserves a message with inconclusive assessment %j',
    async (assessment) => {
      const { service, message, security, result, bot } = setup();
      security.scan.mockResolvedValue({ ...result, ...assessment });
      await service.handleMessage(message);
      expect(bot.deleteBusinessMessages).not.toHaveBeenCalled();
    },
  );

  it('uses configured risk and confidence thresholds inclusively', async () => {
    const test = setup({
      TELEGRAM_BUSINESS_SECURITY_RISK_THRESHOLD: '96',
      TELEGRAM_BUSINESS_SECURITY_CONFIDENCE_THRESHOLD: '99',
    });
    await test.service.handleMessage(test.message);
    expect(test.bot.deleteBusinessMessages).not.toHaveBeenCalled();
    test.security.scan.mockResolvedValue({
      ...test.result,
      riskScore: 96,
      confidence: 99,
    });
    await test.service.handleMessage(test.message);
    expect(test.bot.deleteBusinessMessages).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, 'false', 'yes'])(
    'leaves deletion disabled for flag %s',
    async (flag) => {
      const { service, message, bot } = setup({
        TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE: flag,
      });
      await service.handleMessage(message);
      expect(bot.deleteBusinessMessages).not.toHaveBeenCalled();
    },
  );

  it('does not scan or make Telegram requests when security is disabled', async () => {
    const { service, message, bot, security } = setup({
      TELEGRAM_BUSINESS_SECURITY_ENABLED: 'false',
    });
    await service.handleMessage(message);
    expect(bot.getBusinessConnection).not.toHaveBeenCalled();
    expect(security.scan).not.toHaveBeenCalled();
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'telegram_business_security',
        action: 'skipped',
        reason: 'disabled',
      }),
    );
  });

  it('requires permission to delete incoming messages, not merely bot replies', async () => {
    const { service, message, connection, bot } = setup();
    connection.rights.can_delete_all_messages = false;
    await service.handleMessage(message);
    expect(bot.deleteBusinessMessages).not.toHaveBeenCalled();
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('permission_missing'),
    );
  });

  it('excludes outgoing messages and disabled connections', async () => {
    const { service, message, connection, bot, security } = setup();
    await service.handleMessage({ ...message, from: { id: 111 } });
    await service.handleMessage({
      ...message,
      sender_business_bot: { id: 333 },
    });
    await service.handleMessage({
      ...message,
      from: { id: 333, is_bot: true },
    });
    connection.is_enabled = false;
    await service.handleMessage(message);
    expect(security.scan).not.toHaveBeenCalled();
    expect(bot.deleteBusinessMessages).not.toHaveBeenCalled();
    for (const reason of [
      'outgoing_message',
      'bot_message',
      'inactive_connection',
    ]) {
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        JSON.stringify({
          event: 'telegram_business_security',
          action: 'skipped',
          reason,
        }),
      );
    }
  });

  it('preserves messages outside the Telegram deletion window', async () => {
    const { service, message, bot } = setup();
    await service.handleMessage({
      ...message,
      date: message.date - 48 * 60 * 60,
    });
    expect(bot.getBusinessConnection).not.toHaveBeenCalled();
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'telegram_business_security',
        action: 'skipped',
        reason: 'expired_message',
      }),
    );
  });

  it.each([
    { message_id: 0 },
    { date: 'today' },
    { from: null },
    { chat: { id: 222, type: 'group' } },
    { text: {} },
    { caption: 'a'.repeat(1025) },
    { business_connection_id: '' },
    {
      entities: [
        {
          type: 'text_link',
          offset: -1,
          length: 5,
          url: 'https://example.invalid',
        },
      ],
    },
    { entities: [{ type: 'text_link', offset: 0, length: 1 }] },
    { document: { file_name: {} } },
    { document: { file_name: 'missing-id.pdf' } },
    { document: { file_id: '' } },
    { document: { file_id: 'id', file_size: -1 } },
    { document: { file_id: 'id', file_size: 1.5 } },
  ])(
    'rejects malformed input %j before making provider requests',
    async (input) => {
      const { service, message, bot, security } = setup();
      await expect(
        service.handleMessage({ ...message, ...input }),
      ).rejects.toThrow('invalid');
      expect(bot.getBusinessConnection).not.toHaveBeenCalled();
      expect(security.scan).not.toHaveBeenCalled();
    },
  );

  it('does not scan when connection lookup fails or returns a different account', async () => {
    const { service, message, bot, security, connection } = setup();
    bot.getBusinessConnection.mockRejectedValueOnce(
      new Error('temporary failure'),
    );
    await expect(service.handleMessage(message)).rejects.toThrow(
      'temporary failure',
    );
    bot.getBusinessConnection.mockResolvedValue({ ...connection, id: 'wrong' });
    await expect(service.handleMessage(message)).rejects.toThrow('unavailable');
    expect(security.scan).not.toHaveBeenCalled();
  });

  it('bounds requests per process and resets the scan window', async () => {
    jest.useFakeTimers();
    const { service, message, bot, security } = setup({
      TELEGRAM_BUSINESS_SECURITY_MAX_SCANS_PER_MINUTE: '1',
    });
    await service.handleMessage(message);
    await service.handleMessage({ ...message, message_id: 11 });
    expect(security.scan).toHaveBeenCalledTimes(1);
    expect(bot.getBusinessConnection).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(60_000);
    await service.handleMessage({ ...message, message_id: 12 });
    expect(security.scan).toHaveBeenCalledTimes(2);
  });

  it('never logs identities, message content, or provider error details', async () => {
    const { service, message, bot } = setup();
    bot.deleteBusinessMessages.mockRejectedValue(
      new Error('private-token private-body'),
    );
    await expect(service.handleMessage(message)).rejects.toThrow(
      'Telegram business deletion failed',
    );
    const logs = JSON.stringify((Logger.prototype.log as jest.Mock).mock.calls);
    expect(logs).toContain('delete_failed');
    expect(logs).not.toContain('private-token');
    expect(logs).not.toContain('private-body');
    expect(logs).not.toContain(message.text);
    expect(logs).not.toContain(message.business_connection_id);
  });

  function webhook(test: ReturnType<typeof setup>) {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ updateId: 1n }]),
      telegramBotUpdate: { update: jest.fn(), deleteMany: jest.fn() },
    };
    const service = new TelegramBotService(
      prisma as never,
      test.config as never,
      test.bot as never,
      {} as never,
      {} as never,
      undefined,
      undefined,
      undefined,
      test.service,
    );
    return { prisma, service };
  }

  it('routes the private Delete callback before website account lookup', async () => {
    const test = setup();
    const { service } = webhook(test);
    const callback = {
      id: 'test-callback',
      from: { id: 111 },
      message: { message_id: 9, chat: { id: 111, type: 'private' } },
      data: 'security:delete:12345678-1234-4234-8234-123456789abc',
    };
    await service.handleUpdate({ update_id: 2, callback_query: callback });
    expect(test.alerts.handleCallback).toHaveBeenCalledWith(callback);
    expect(test.security.scan).not.toHaveBeenCalled();
  });

  it.each(['business_message', 'edited_business_message'])(
    'routes %s through scanning and deduplicates webhook retries',
    async (key) => {
      const test = setup();
      const { prisma, service } = webhook(test);
      await service.handleUpdate({ update_id: 1, [key]: test.message });
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        JSON.stringify({ event: 'telegram_webhook_update', updateType: key }),
      );
      expect(test.bot.deleteBusinessMessages).toHaveBeenCalledTimes(1);
      expect(prisma.telegramBotUpdate.update).toHaveBeenCalledWith({
        where: { updateId: 1n },
        data: { processedAt: expect.any(Date) },
      });
      prisma.$queryRaw.mockResolvedValue([]);
      await service.handleUpdate({ update_id: 1, [key]: test.message });
      expect(test.bot.deleteBusinessMessages).toHaveBeenCalledTimes(1);
    },
  );

  it('releases the webhook claim after deletion failure and retries it', async () => {
    const test = setup();
    const { prisma, service } = webhook(test);
    test.bot.deleteBusinessMessages.mockRejectedValueOnce(
      new Error('temporary failure'),
    );
    const update = { update_id: 1, business_message: test.message };
    await expect(service.handleUpdate(update)).rejects.toThrow(
      'deletion failed',
    );
    expect(prisma.telegramBotUpdate.update).not.toHaveBeenCalled();
    expect(prisma.telegramBotUpdate.deleteMany).toHaveBeenCalledWith({
      where: { updateId: 1n, processedAt: null },
    });
    await service.handleUpdate(update);
    expect(test.bot.deleteBusinessMessages).toHaveBeenCalledTimes(2);
    expect(prisma.telegramBotUpdate.update).toHaveBeenCalledTimes(1);
  });

  it('acknowledges connection notifications without treating them as messages', async () => {
    const test = setup();
    const { prisma, service } = webhook(test);
    await service.handleUpdate({
      update_id: 1,
      business_connection: test.connection,
    });
    expect(test.security.scan).not.toHaveBeenCalled();
    expect(prisma.telegramBotUpdate.update).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'telegram_webhook_update',
        updateType: 'business_connection',
      }),
    );
  });

  it('logs receipt of ordinary updates without exposing their contents or identities', async () => {
    const test = setup();
    const { prisma, service } = webhook(test);
    prisma.$queryRaw.mockResolvedValue([]);
    await service.handleUpdate({ update_id: 1, message: test.message });
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'telegram_webhook_update',
        updateType: 'message',
      }),
    );
    const logs = JSON.stringify((Logger.prototype.log as jest.Mock).mock.calls);
    expect(logs).not.toContain(test.message.text);
    expect(logs).not.toContain(test.message.business_connection_id);
    expect(logs).not.toContain(String(test.message.from.id));
  });
});
