import { Logger } from '@nestjs/common';
import { buildSecurityOwnerDetails } from './security-owner-details';
import * as ownerDetails from './security-owner-details';
import { TelegramBusinessSecurityAlertsService } from './telegram-business-security-alerts.service';

describe('Business security owner alerts and manual deletion', () => {
  const id = '12345678-1234-4234-8234-123456789abc';
  function setup(overrides: Record<string, unknown> = {}) {
    const values: Record<string, unknown> = {
      TELEGRAM_BUSINESS_SECURITY_ENABLED: 'true',
      ...overrides,
    };
    const config = { get: (key: string) => values[key] };
    const connection = {
      id: 'private-connection',
      is_enabled: true,
      user: { id: 111 },
      user_chat_id: 999,
      rights: { can_delete_all_messages: true },
    };
    const message = {
      business_connection_id: connection.id,
      message_id: 7,
      chat: { id: 222, type: 'private' },
      from: { id: 222 },
      date: Math.floor(Date.now() / 1000),
      document: { file_id: 'private-file', file_name: 'private-filename.pdf' },
    };
    const result = {
      status: 'scanned',
      riskScore: 100,
      confidence: 100,
      categories: ['suspicious_file'],
      fileScan: { status: 'infected' },
    };
    const record = {
      id,
      event_key: 'a'.repeat(64),
      audience: 'owner',
      source_chat_id: 222n,
      business_connection_id: connection.id,
      owner_user_id: 111n,
      owner_chat_id: 999n,
      source_message_id: 7n,
      source_message_date: new Date(message.date * 1000),
      expires_at: new Date(Date.now() + 3600000),
      decision: 'preserved',
      threat_kind: 'infected_file',
      notified_threat_kind: null as string | null,
      alert_message_id: null as bigint | null,
      notified_decision: null as string | null,
      deleted_at: null as Date | null,
      delivery_started_at: new Date(),
      delivery_attempts: 1,
      owner_details: null as string | null,
      owner_details_hash: null as string | null,
    };
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([record]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const bot = {
      sendMessage: jest.fn().mockResolvedValue({
        message_id: 88,
        chat: { id: 999, type: 'private' },
      }),
      editMessage: jest.fn().mockResolvedValue({ message_id: 88 }),
      answerCallback: jest.fn().mockResolvedValue(undefined),
      getBusinessConnection: jest.fn().mockResolvedValue(connection),
      deleteBusinessMessages: jest.fn().mockResolvedValue(true),
      sendBusinessMessage: jest.fn().mockResolvedValue({
        message_id: 89,
        chat: { id: 222, type: 'private' },
      }),
      editBusinessMessage: jest.fn().mockResolvedValue({ message_id: 89 }),
    };
    const service = new TelegramBusinessSecurityAlertsService(
      config as never,
      bot as never,
      prisma as never,
    );
    const callback = {
      id: 'callback',
      from: { id: 111 },
      message: { message_id: 88, chat: { id: 999, type: 'private' } },
      data: `security:delete:${id}`,
    };
    return {
      values,
      connection,
      message,
      result,
      record,
      prisma,
      bot,
      service,
      callback,
    };
  }

  beforeEach(() =>
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined),
  );
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('delivers and persists bounded details only for the owner, never the managed chat or logs', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-07T07:01:00Z'));
    const test = setup();
    Object.assign(test.message.from, {
      first_name: 'Sok',
      username: 'sok_dara',
    });
    Object.assign(test.message, {
      text: 'https://example.com/login?token=private-token',
    });
    Object.assign(test.connection.rights, { can_reply: true });
    test.record.owner_details = buildSecurityOwnerDetails(
      test.message,
      test.result as never,
    );
    const chat = { ...test.record, audience: 'chat' };
    test.prisma.$queryRaw
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([chat])
      .mockResolvedValueOnce([chat]);
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'preserved',
    );
    const privateText = test.bot.sendMessage.mock.calls[0]![1];
    for (const field of [
      'Sok',
      '@sok_dara',
      'private-filename.pdf',
      'hxxps://example[.]com/login',
      '100/100',
      'UTC+07',
      'Kept',
    ])
      expect(privateText).toContain(field);
    expect(privateText).not.toContain('private-token');
    expect(privateText.length).toBeLessThanOrEqual(4096);
    const chatText = test.bot.sendBusinessMessage.mock.calls[0]![2];
    for (const field of [
      'Sok',
      '@sok_dara',
      'private-filename.pdf',
      'example',
      'Sender ID',
      '100/100',
    ])
      expect(chatText).not.toContain(field);
    const ownerInsert = test.prisma.$queryRaw.mock.calls[0]!;
    expect(ownerInsert).toContain(test.record.owner_details);
    const chatInsert = test.prisma.$queryRaw.mock.calls[2]!;
    expect(chatInsert.slice(-2)).toEqual([null, null]);
    expect(
      JSON.stringify((Logger.prototype.log as jest.Mock).mock.calls),
    ).not.toMatch(/Sok|private-filename|example\.com|private-token/);
  });

  it('uses the persisted private snapshot for queued deliveries and Delete-button updates', async () => {
    const test = setup();
    test.record.owner_details = buildSecurityOwnerDetails(
      test.message,
      test.result as never,
    );
    await test.service.processPending();
    expect(test.bot.sendMessage.mock.calls[0]![1]).toContain(
      'private-filename.pdf',
    );
    test.record.alert_message_id = 88n;
    const deleted = {
      ...test.record,
      decision: 'deleted',
      deleted_at: new Date(),
    };
    test.prisma.$queryRaw
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([deleted])
      .mockResolvedValueOnce([deleted]);
    await test.service.handleCallback(test.callback);
    expect(test.bot.editMessage.mock.calls[0]![2]).toContain(
      'private-filename.pdf',
    );
    expect(test.bot.editMessage.mock.calls[0]![2]).toContain('Deleted');
    expect(test.bot.editMessage.mock.calls[0]![3]).toEqual({
      inline_keyboard: [],
    });
  });

  it('refreshes changed metadata even for the same finding and acknowledges the claimed snapshot', async () => {
    const test = setup();
    test.record.alert_message_id = 88n;
    test.record.owner_details = 'Sender: updated sender';
    test.record.owner_details_hash = 'b'.repeat(64);
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'preserved',
    );
    expect(test.prisma.$queryRaw.mock.calls[0]![0].join('')).toContain(
      'owner_details_hash IS DISTINCT FROM EXCLUDED.owner_details_hash',
    );
    expect(test.prisma.$queryRaw.mock.calls[1]![0].join('')).toContain(
      "audience = 'owner' AND notified_owner_details_hash IS DISTINCT FROM owner_details_hash",
    );
    expect(test.bot.editMessage.mock.calls[0]![2]).toContain('updated sender');
    expect(test.prisma.$executeRaw.mock.calls[0]).toContain('b'.repeat(64));
  });

  it('still sends the brief warning when optional detail formatting fails', async () => {
    const test = setup();
    jest
      .spyOn(ownerDetails, 'buildSecurityOwnerDetails')
      .mockImplementation(() => {
        throw new Error('private metadata');
      });
    await expect(
      test.service.notify(
        test.message,
        test.connection,
        test.result as never,
        'preserved',
      ),
    ).resolves.toBeUndefined();
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(test.prisma.$queryRaw.mock.calls[0]!.slice(-2)).toEqual([
      null,
      null,
    ]);
    expect(
      JSON.stringify((Logger.prototype.log as jest.Mock).mock.calls),
    ).not.toContain('private metadata');
  });

  it.each([
    {
      kind: 'unsafe_link',
      urlScan: { status: 'unsafe', threatTypes: ['SOCIAL_ENGINEERING'] },
      header: 'Unsafe link detected',
    },
    {
      kind: 'suspicious_link',
      urlScan: { status: 'not_listed' },
      header: 'Suspicious link detected',
    },
  ])(
    'delivers $kind warnings to both chats with an owner-only Delete message button',
    async ({ kind, urlScan, header }) => {
      const test = setup({ TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE: 'false' });
      Object.assign(test.message, { text: 'https://example.com/login' });
      Object.assign(test.connection.rights, { can_reply: true });
      Object.assign(test.record, { threat_kind: kind });
      const chat = { ...test.record, audience: 'chat' };
      test.prisma.$queryRaw
        .mockResolvedValueOnce([test.record])
        .mockResolvedValueOnce([test.record])
        .mockResolvedValueOnce([chat])
        .mockResolvedValueOnce([chat]);
      const result = {
        status: 'scanned',
        riskScore: 95,
        confidence: 90,
        categories: ['phishing_url'],
        urlScan,
      };
      await test.service.notify(
        test.message,
        test.connection,
        result as never,
        'preserved',
      );
      expect(test.bot.sendMessage).toHaveBeenCalledWith(
        999,
        expect.stringContaining(header),
        {
          inline_keyboard: [
            [
              {
                text: expect.stringContaining('Delete message'),
                callback_data: `security:delete:${id}`,
              },
            ],
          ],
        },
        undefined,
        undefined,
        { disableLinkPreview: true },
      );
      expect(test.bot.sendBusinessMessage).toHaveBeenCalledWith(
        test.connection.id,
        222,
        expect.stringContaining(header),
      );
      const text = test.bot.sendMessage.mock.calls[0]![1] as unknown as string;
      expect(text).not.toContain('ClamAV');
      expect(text).toContain(
        kind === 'unsafe_link' ? 'Google Web Risk' : 'AI assessment',
      );
      expect(test.bot.deleteBusinessMessages).not.toHaveBeenCalled();
      expect(test.prisma.$queryRaw.mock.calls[0]).toContain(kind);
      expect(test.prisma.$executeRaw.mock.calls[0]![0].join('')).toContain(
        'notified_threat_kind',
      );
    },
  );

  it('retries the persisted link verdict rather than showing an infected-file warning', async () => {
    const test = setup();
    Object.assign(test.record, { threat_kind: 'suspicious_link' });
    await test.service.processPending();
    expect(test.bot.sendMessage).toHaveBeenCalledWith(
      999,
      expect.stringContaining('AI assessment'),
      expect.anything(),
      undefined,
      undefined,
      { disableLinkPreview: true },
    );
    expect(test.prisma.$queryRaw.mock.calls[0]![0].join('')).toContain(
      'notified_threat_kind IS DISTINCT FROM threat_kind',
    );
  });

  it('does not emit an AI link warning for a message containing only file metadata', async () => {
    const test = setup();
    await test.service.notify(
      test.message,
      test.connection,
      {
        status: 'scanned',
        riskScore: 95,
        confidence: 85,
        categories: ['phishing_url'],
      },
      'preserved',
    );
    expect(test.prisma.$queryRaw).not.toHaveBeenCalled();
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
  });

  it('deletes a flagged link through the same owner authorization and removes its button', async () => {
    const test = setup();
    Object.assign(test.record, {
      threat_kind: 'unsafe_link',
      alert_message_id: 88n,
    });
    const deleted = {
      ...test.record,
      decision: 'deleted',
      deleted_at: new Date(),
    };
    test.prisma.$queryRaw
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([deleted])
      .mockResolvedValueOnce([deleted]);
    await test.service.handleCallback(test.callback);
    expect(test.bot.deleteBusinessMessages).toHaveBeenCalledWith(
      test.connection.id,
      [7],
    );
    expect(test.bot.editMessage).toHaveBeenCalledWith(
      999,
      88,
      expect.stringContaining('Unsafe link detected'),
      { inline_keyboard: [] },
      { disableLinkPreview: true },
    );
  });

  it('alerts the connection owner, not the incoming chat, with an opaque Delete button', async () => {
    const test = setup();
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'preserved',
    );
    expect(test.bot.sendMessage).toHaveBeenCalledWith(
      999,
      expect.stringContaining('Infected file detected'),
      {
        inline_keyboard: [
          [
            {
              text: expect.stringContaining('Delete'),
              callback_data: `security:delete:${id}`,
            },
          ],
        ],
      },
      undefined,
      undefined,
      { disableLinkPreview: true },
    );
    const text = test.bot.sendMessage.mock.calls[0]![1] as unknown as string;
    expect(text).toContain('Kept');
    expect(text).toContain('រកឃើញ');
    expect(text).not.toContain('private-filename');
    expect(text).not.toContain('private-file');
    expect(text).not.toContain('private-connection');
    expect(test.prisma.$queryRaw.mock.calls[0]![0].join('')).toContain(
      'ON CONFLICT',
    );
    expect(test.prisma.$queryRaw.mock.calls[0]).toEqual(
      expect.arrayContaining([expect.stringMatching(/^[0-9a-f]{64}$/)]),
    );
    expect(Buffer.byteLength(test.callback.data)).toBeLessThanOrEqual(64);
  });

  it('shows automatic deletion without a Delete button', async () => {
    const test = setup();
    Object.assign(test.record, { decision: 'deleted', deleted_at: new Date() });
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'deleted',
    );
    expect(test.bot.sendMessage).toHaveBeenCalledWith(
      999,
      expect.stringContaining('Deleted'),
      { inline_keyboard: [] },
      undefined,
      undefined,
      { disableLinkPreview: true },
    );
  });

  it('updates the existing alert after the deletion outcome changes', async () => {
    const test = setup();
    Object.assign(test.record, {
      decision: 'deleted',
      deleted_at: new Date(),
      alert_message_id: 88n,
      notified_decision: 'preserved',
    });
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'deleted',
    );
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
    expect(test.bot.editMessage).toHaveBeenCalledWith(
      999,
      88,
      expect.stringContaining('Deleted'),
      { inline_keyboard: [] },
      { disableLinkPreview: true },
    );
  });

  it('uses a shared database delivery claim to suppress simultaneous/retried alerts', async () => {
    const test = setup();
    test.prisma.$queryRaw
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([]);
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'preserved',
    );
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
  });

  it.each(['clean', 'disabled', 'unsupported', 'unavailable', 'busy'])(
    'does not alert for file verdict %s without a suspicious AI assessment',
    async (status) => {
      const test = setup();
      await test.service.notify(
        test.message,
        test.connection,
        {
          ...test.result,
          riskScore: 0,
          confidence: 0,
          categories: [],
          fileScan: { status },
        } as never,
        'preserved',
      );
      expect(test.bot.sendMessage).not.toHaveBeenCalled();
      expect(test.prisma.$queryRaw).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      category: 'phishing_url',
      kind: 'suspicious_link',
      header: 'Suspicious link detected',
    },
    {
      category: 'scam',
      kind: 'suspicious_message',
      header: 'Security warning',
    },
    {
      category: 'suspicious_file',
      kind: 'suspicious_message',
      header: 'Security warning',
    },
    {
      category: 'spam',
      kind: 'suspicious_message',
      header: 'Security warning',
    },
    {
      category: 'dangerous_content',
      kind: 'suspicious_message',
      header: 'Security warning',
    },
  ])(
    'delivers a moderate $category warning to both chats without claiming confirmed malware',
    async ({ category, kind, header }) => {
      const test = setup({ TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE: 'true' });
      Object.assign(test.message, {
        text:
          category === 'phishing_url'
            ? 'https://example.com/login'
            : 'Untrusted message',
      });
      Object.assign(test.connection.rights, { can_reply: true });
      Object.assign(test.record, { threat_kind: kind });
      const chat = { ...test.record, audience: 'chat' };
      test.prisma.$queryRaw
        .mockResolvedValueOnce([test.record])
        .mockResolvedValueOnce([test.record])
        .mockResolvedValueOnce([chat])
        .mockResolvedValueOnce([chat]);
      await test.service.notify(
        test.message,
        test.connection,
        {
          status: 'scanned',
          riskScore: 50,
          confidence: 60,
          categories: [category],
          fileScan: { status: 'clean' },
        } as never,
        'preserved',
      );
      expect(test.bot.sendMessage).toHaveBeenCalledWith(
        999,
        expect.stringContaining(header),
        {
          inline_keyboard: [
            [
              {
                text: expect.stringContaining('Delete message'),
                callback_data: `security:delete:${id}`,
              },
            ],
          ],
        },
        undefined,
        undefined,
        { disableLinkPreview: true },
      );
      expect(test.bot.sendBusinessMessage).toHaveBeenCalledWith(
        test.connection.id,
        222,
        expect.stringContaining(header),
      );
      const text = test.bot.sendMessage.mock.calls[0]![1] as unknown as string;
      expect(text).toContain('AI assessment');
      expect(text).toContain('Kept');
      expect(text).not.toContain('ClamAV');
      expect(text).not.toContain('Infected file');
      expect(test.bot.deleteBusinessMessages).not.toHaveBeenCalled();
      expect(test.prisma.$queryRaw.mock.calls[0]).toContain(kind);
    },
  );

  it('retries generic warnings with the persisted AI evidence source', async () => {
    const test = setup();
    Object.assign(test.record, { threat_kind: 'suspicious_message' });
    await test.service.processPending();
    expect(test.bot.sendMessage).toHaveBeenCalledWith(
      999,
      expect.stringContaining('Security warning'),
      expect.anything(),
      undefined,
      undefined,
      { disableLinkPreview: true },
    );
    expect(test.bot.sendMessage.mock.calls[0]![1]).not.toContain('ClamAV');
  });

  it('honors custom warning thresholds and fails closed on invalid values', async () => {
    for (const threshold of ['70', 'invalid']) {
      const test = setup({
        TELEGRAM_BUSINESS_SECURITY_WARNING_RISK_THRESHOLD: threshold,
      });
      await test.service.notify(
        test.message,
        test.connection,
        {
          status: 'scanned',
          riskScore: 60,
          confidence: 80,
          categories: ['scam'],
        },
        'preserved',
      );
      expect(test.prisma.$queryRaw).not.toHaveBeenCalled();
    }
  });

  it.each([undefined, 0, -1, 1.5, '999'])(
    'never falls back to the incoming chat when owner chat ID is invalid: %s',
    async (value) => {
      const test = setup();
      test.connection.user_chat_id = value as number;
      await test.service.notify(
        test.message,
        test.connection,
        test.result as never,
        'preserved',
      );
      expect(test.bot.sendMessage).not.toHaveBeenCalled();
      expect(test.prisma.$queryRaw).not.toHaveBeenCalled();
    },
  );

  it.each([
    { TELEGRAM_BUSINESS_SECURITY_ENABLED: 'false' },
    { TELEGRAM_BUSINESS_SECURITY_OWNER_ALERTS: 'false' },
  ])('keeps notifications disabled for %j', async (settings) => {
    const test = setup(settings);
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'preserved',
    );
    expect(test.prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('does not interrupt security handling on database or Telegram delivery failures', async () => {
    const test = setup();
    test.prisma.$queryRaw.mockRejectedValueOnce(
      new Error('private database connection'),
    );
    await expect(
      test.service.notify(
        test.message,
        test.connection,
        test.result as never,
        'preserved',
      ),
    ).resolves.toBeUndefined();
    test.bot.sendMessage.mockRejectedValueOnce(new Error('private bot token'));
    await expect(
      test.service.notify(
        test.message,
        test.connection,
        test.result as never,
        'preserved',
      ),
    ).resolves.toBeUndefined();
    expect(test.prisma.$executeRaw).toHaveBeenCalled();
    const logs = JSON.stringify((Logger.prototype.log as jest.Mock).mock.calls);
    expect(logs).toContain('delivery_failed');
    expect(logs).not.toContain('private bot token');
    expect(logs).not.toContain('private database connection');
  });

  it('requires callback owner identity and exact private alert message binding', async () => {
    for (const change of [
      { from: { id: 222 } },
      { from: { id: 111, is_bot: true } },
      { message: { message_id: 88, chat: { id: 222, type: 'private' } } },
      { message: { message_id: 89, chat: { id: 999, type: 'private' } } },
      { message: { message_id: 88, chat: { id: 999, type: 'group' } } },
    ]) {
      const test = setup();
      test.record.alert_message_id = 88n;
      await test.service.handleCallback({
        ...test.callback,
        ...change,
      } as never);
      expect(test.bot.deleteBusinessMessages).not.toHaveBeenCalled();
      expect(test.bot.getBusinessConnection).not.toHaveBeenCalled();
    }
  });

  it('deletes the stored infected message after checking current owner/rights, independently of auto-delete', async () => {
    const test = setup({ TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE: 'false' });
    test.record.alert_message_id = 88n;
    const deleted = {
      ...test.record,
      decision: 'deleted',
      deleted_at: new Date(),
    };
    test.prisma.$queryRaw
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([deleted])
      .mockResolvedValueOnce([deleted]);
    await test.service.handleCallback(test.callback);
    expect(test.bot.getBusinessConnection).toHaveBeenCalledWith(
      'private-connection',
    );
    expect(test.bot.deleteBusinessMessages).toHaveBeenCalledWith(
      'private-connection',
      [7],
    );
    expect(test.bot.editMessage).toHaveBeenCalledWith(
      999,
      88,
      expect.stringContaining('Deleted'),
      { inline_keyboard: [] },
      { disableLinkPreview: true },
    );
  });

  it.each([
    { is_enabled: false },
    { id: 'other-connection' },
    { user: { id: 222 } },
    { user_chat_id: 222 },
    { rights: { can_delete_all_messages: false } },
  ])(
    'rejects stale/changed connections and missing deletion permission: %j',
    async (override) => {
      const test = setup();
      test.record.alert_message_id = 88n;
      test.bot.getBusinessConnection.mockResolvedValue({
        ...test.connection,
        ...override,
      });
      await test.service.handleCallback(test.callback);
      expect(test.bot.deleteBusinessMessages).not.toHaveBeenCalled();
    },
  );

  it('rejects expired, missing and already-deleted actions without issuing a deletion', async () => {
    for (const record of [
      null,
      { expires_at: new Date(0) },
      { deleted_at: new Date() },
    ]) {
      const test = setup();
      test.record.alert_message_id = 88n;
      test.prisma.$queryRaw.mockResolvedValue(
        record ? [{ ...test.record, ...record }] : [],
      );
      await test.service.handleCallback(test.callback);
      expect(test.bot.deleteBusinessMessages).not.toHaveBeenCalled();
    }
  });

  it('uses an atomic deletion claim so concurrent clicks cannot both delete', async () => {
    const test = setup();
    test.record.alert_message_id = 88n;
    test.prisma.$queryRaw
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([]);
    await test.service.handleCallback(test.callback);
    expect(test.bot.deleteBusinessMessages).not.toHaveBeenCalled();
  });

  it('keeps the button retryable on Telegram deletion failure and logs no private context', async () => {
    const test = setup();
    test.record.alert_message_id = 88n;
    test.bot.deleteBusinessMessages.mockRejectedValueOnce(
      new Error('private-error-token'),
    );
    await test.service.handleCallback(test.callback);
    expect(test.prisma.$executeRaw).toHaveBeenCalled();
    expect(test.bot.answerCallback).toHaveBeenCalled();
    const logs = JSON.stringify((Logger.prototype.log as jest.Mock).mock.calls);
    expect(logs).not.toContain('private-error-token');
    expect(logs).not.toContain('private-connection');
  });

  it('rejects malformed callback tokens without reading records', async () => {
    const test = setup();
    await test.service.handleCallback({
      ...test.callback,
      data: 'security:delete:forged',
    });
    expect(test.prisma.$queryRaw).not.toHaveBeenCalled();
    expect(test.bot.deleteBusinessMessages).not.toHaveBeenCalled();
  });

  it('retries queued delivery after rechecking the current Business connection', async () => {
    const test = setup();
    await test.service.processPending();
    expect(test.bot.getBusinessConnection).toHaveBeenCalledWith(
      'private-connection',
    );
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(test.prisma.$executeRaw).toHaveBeenCalled();
  });

  it('does not deliver queued alerts after the account disconnects or ownership changes', async () => {
    const test = setup();
    test.bot.getBusinessConnection.mockResolvedValue({
      ...test.connection,
      user: { id: 222 },
    });
    await test.service.processPending();
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
  });

  it('includes a failed connection lookup in the bounded delivery retry budget', async () => {
    const test = setup();
    test.bot.getBusinessConnection.mockRejectedValueOnce(
      new Error('private connection details'),
    );
    await expect(test.service.processPending()).resolves.toBeUndefined();
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('delivery_failed'),
    );
    const queries = test.prisma.$executeRaw.mock.calls
      .map(([parts]) => parts.join(''))
      .join('\n');
    expect(queries).toContain('next_delivery_at');
    expect(queries).toContain("INTERVAL '1 minute'");
    expect(
      JSON.stringify((Logger.prototype.log as jest.Mock).mock.calls),
    ).not.toContain('private connection details');
  });

  it('skips another connection lookup when a replica already holds the delivery claim', async () => {
    const test = setup();
    test.prisma.$queryRaw
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([]);
    await test.service.processPending();
    expect(test.bot.getBusinessConnection).not.toHaveBeenCalled();
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
  });

  it('also posts a warning in the source chat using the Business connection, without an owner Delete button', async () => {
    const test = setup();
    Object.assign(test.connection.rights, { can_reply: true });
    const chatAlert = {
      ...test.record,
      audience: 'chat',
      alert_message_id: null,
    };
    test.prisma.$queryRaw
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([chatAlert])
      .mockResolvedValueOnce([chatAlert]);
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'preserved',
    );
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(test.bot.sendBusinessMessage).toHaveBeenCalledWith(
      'private-connection',
      222,
      expect.stringContaining('Infected file detected'),
    );
    const text = test.bot.sendBusinessMessage.mock.calls[0]![2];
    expect(text).not.toMatch(
      /hacker|private-file|private-filename|security:delete/i,
    );
  });

  it.each([false, undefined])(
    'skips a current-chat warning without reply permission: %s',
    async (canReply) => {
      const test = setup();
      Object.assign(test.connection.rights, { can_reply: canReply });
      await test.service.notify(
        test.message,
        test.connection,
        test.result as never,
        'preserved',
      );
      expect(test.bot.sendBusinessMessage).not.toHaveBeenCalled();
      expect(test.bot.sendMessage).toHaveBeenCalledTimes(1);
    },
  );

  it('does not reply to an old edited message outside the 24-hour reply window', async () => {
    const test = setup();
    Object.assign(test.connection.rights, { can_reply: true });
    test.message.date = Math.floor(Date.now() / 1000) - 25 * 3600;
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'preserved',
    );
    expect(test.bot.sendBusinessMessage).not.toHaveBeenCalled();
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('does not accept an action token from the current chat alert', async () => {
    const test = setup();
    test.record.audience = 'chat';
    test.record.alert_message_id = 88n;
    await test.service.handleCallback(test.callback);
    expect(test.bot.deleteBusinessMessages).not.toHaveBeenCalled();
  });

  it('updates both existing warnings after the owner deletes the file message', async () => {
    const test = setup();
    Object.assign(test.connection.rights, { can_reply: true });
    test.record.alert_message_id = 88n;
    const owner = {
      ...test.record,
      decision: 'deleted',
      deleted_at: new Date(),
    };
    const chat = { ...owner, audience: 'chat', alert_message_id: 89n };
    test.prisma.$queryRaw
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([owner, chat])
      .mockResolvedValueOnce([owner])
      .mockResolvedValueOnce([chat]);
    await test.service.handleCallback(test.callback);
    expect(test.bot.editMessage).toHaveBeenCalledWith(
      999,
      88,
      expect.stringContaining('Deleted'),
      { inline_keyboard: [] },
      { disableLinkPreview: true },
    );
    expect(test.bot.editBusinessMessage).toHaveBeenCalledWith(
      'private-connection',
      222,
      89,
      expect.stringContaining('Deleted'),
    );
  });

  it('still delivers the source chat warning if the owner DM fails', async () => {
    const test = setup();
    Object.assign(test.connection.rights, { can_reply: true });
    const chat = { ...test.record, audience: 'chat' };
    test.prisma.$queryRaw
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([chat])
      .mockResolvedValueOnce([chat]);
    test.bot.sendMessage.mockRejectedValueOnce(new Error('unavailable'));
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'preserved',
    );
    expect(test.bot.sendBusinessMessage).toHaveBeenCalledTimes(1);
  });

  it('supports current-chat warnings while private owner alerts are disabled', async () => {
    const test = setup({ TELEGRAM_BUSINESS_SECURITY_OWNER_ALERTS: 'false' });
    Object.assign(test.connection.rights, { can_reply: true });
    const chat = { ...test.record, audience: 'chat' };
    test.prisma.$queryRaw.mockResolvedValue([chat]);
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'preserved',
    );
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
    expect(test.bot.sendBusinessMessage).toHaveBeenCalledTimes(1);
    await test.service.handleCallback(test.callback);
    expect(test.bot.deleteBusinessMessages).not.toHaveBeenCalled();
  });

  it('keeps the owner alert when current-chat warnings are disabled', async () => {
    const test = setup({ TELEGRAM_BUSINESS_SECURITY_CHAT_ALERTS: 'false' });
    Object.assign(test.connection.rights, { can_reply: true });
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'preserved',
    );
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(test.bot.sendBusinessMessage).not.toHaveBeenCalled();
  });

  it('shows a failed manual deletion and preserves its retry button', async () => {
    const test = setup();
    test.record.alert_message_id = 88n;
    const failed = { ...test.record, decision: 'delete_failed' };
    test.prisma.$queryRaw
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([test.record])
      .mockResolvedValueOnce([failed])
      .mockResolvedValueOnce([failed]);
    test.bot.deleteBusinessMessages.mockRejectedValueOnce(
      new Error('unavailable'),
    );
    await test.service.handleCallback(test.callback);
    expect(test.bot.editMessage).toHaveBeenCalledWith(
      999,
      88,
      expect.stringContaining('deletion failed'),
      {
        inline_keyboard: [
          [
            {
              text: expect.stringContaining('Delete'),
              callback_data: test.callback.data,
            },
          ],
        ],
      },
      { disableLinkPreview: true },
    );
  });

  it('does not notify for an expired source message', async () => {
    const test = setup();
    test.message.date = Math.floor(Date.now() / 1000) - 48 * 3600;
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'preserved',
    );
    expect(test.prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('does not accept a delivery receipt for the wrong recipient', async () => {
    const test = setup();
    test.bot.sendMessage.mockResolvedValueOnce({
      message_id: 88,
      chat: { id: 222, type: 'private' },
    });
    await test.service.notify(
      test.message,
      test.connection,
      test.result as never,
      'preserved',
    );
    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('delivery_failed'),
    );
  });

  it('starts and clears the background retry timer with module lifecycle', () => {
    jest.useFakeTimers();
    const test = setup();
    const pending = jest
      .spyOn(test.service, 'processPending')
      .mockResolvedValue(undefined);
    test.service.onModuleInit();
    jest.advanceTimersByTime(30_000);
    expect(pending).toHaveBeenCalledTimes(1);
    test.service.onModuleDestroy();
    jest.advanceTimersByTime(30_000);
    expect(pending).toHaveBeenCalledTimes(1);
  });

  it('does not start background work when both alert destinations are disabled', () => {
    jest.useFakeTimers();
    const test = setup({
      TELEGRAM_BUSINESS_SECURITY_OWNER_ALERTS: 'false',
      TELEGRAM_BUSINESS_SECURITY_CHAT_ALERTS: 'false',
    });
    const pending = jest.spyOn(test.service, 'processPending');
    test.service.onModuleInit();
    jest.advanceTimersByTime(60_000);
    expect(pending).not.toHaveBeenCalled();
  });
});
