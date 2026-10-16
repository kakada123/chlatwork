import { GroupConnectionsService } from './group-connections.service';

function setup() {
  const request = {
    id: 'request',
    userId: 'manager',
    telegramUserId: 123n,
    bot: 'CHLATWORK',
    requestId: 42,
    expiresAt: new Date(Date.now() + 60000),
    connectedChatId: null,
  };
  const prisma = {
    telegramGroupConnectRequest: {
      findUnique: jest.fn().mockResolvedValue(request),
    },
  };
  const client = {
    sendMessage: jest.fn(),
    getMe: jest.fn().mockResolvedValue({ username: 'test_bot' }),
  };
  const access = {
    client: () => client,
    verifyRole: jest.fn().mockResolvedValue(true),
  };
  const identities = {
    identity: jest.fn().mockResolvedValue({
      telegramId: '123',
      status: 'APPROVED',
      enabled: true,
      isActive: true,
    }),
  };
  const service = new GroupConnectionsService(
    prisma as never,
    access as never,
    identities as never,
  );
  return { service, request, prisma, access, client };
}

describe('verified Telegram connections', () => {
  it('rejects expired private start links', async () => {
    const { service, request, client } = setup();
    request.expiresAt = new Date(0);
    await expect(
      service.handlePrivateStart('CHLATWORK', {
        message_id: 1,
        chat: { id: 123, type: 'private' },
        from: { id: 123 },
        text: '/start connect_' + 'a'.repeat(32),
      }),
    ).rejects.toThrow('expired');
    expect(client.sendMessage).not.toHaveBeenCalled();
  });
  it('rejects a link opened by another Telegram identity', async () => {
    const { service, client } = setup();
    await expect(
      service.handlePrivateStart('CHLATWORK', {
        message_id: 1,
        chat: { id: 456, type: 'private' },
        from: { id: 456 },
        text: '/start connect_' + 'a'.repeat(32),
      }),
    ).rejects.toThrow('expired');
    expect(client.sendMessage).not.toHaveBeenCalled();
  });
  it('shows Telegram group selection only for the bound approved sender', async () => {
    const { service, client } = setup();
    expect(
      await service.handlePrivateStart('CHLATWORK', {
        message_id: 1,
        chat: { id: 123, type: 'private' },
        from: { id: 123 },
        text: '/start connect_' + 'a'.repeat(32),
      }),
    ).toBe(true);
    expect(client.sendMessage).toHaveBeenCalledWith(
      123,
      expect.any(String),
      expect.objectContaining({
        keyboard: expect.any(Array),
        one_time_keyboard: true,
      }),
    );
  });
});

function sharedSetup(connectedChatId: bigint | null = null, status = 'ACTIVE') {
  const workspace = {
    id: 'workspace',
    telegramChatId: -1001n,
    title: 'Lunch',
    status,
  };
  const request = {
    id: 'request',
    userId: 'manager',
    telegramUserId: 123n,
    bot: 'CHLATWORK',
    requestId: 42,
    expiresAt: new Date(Date.now() + 60000),
    connectedChatId,
  };
  const tx = {
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce([{ connectedChatId }])
      .mockResolvedValueOnce([{ status, chatId: -1001n }]),
    telegramGroupChatAlias: {
      findUnique: jest.fn().mockResolvedValue({ workspaceId: 'workspace' }),
      upsert: jest.fn(),
    },
    telegramGroupWorkspace: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(workspace),
      upsert: jest.fn().mockResolvedValue(workspace),
    },
    telegramGroupConnection: { upsert: jest.fn() },
    telegramGroupManager: { upsert: jest.fn() },
    telegramGroupConnectRequest: { update: jest.fn() },
    telegramGroupAudit: { upsert: jest.fn() },
  };
  const prisma = {
    telegramGroupConnectRequest: {
      findUnique: jest.fn().mockResolvedValue(request),
    },
    $transaction: async (fn: Function) => fn(tx),
  };
  const client = { sendMessage: jest.fn() };
  const access = {
    client: () => client,
    verifyRole: jest.fn().mockResolvedValue(true),
  };
  const identities = {
    identity: jest.fn().mockResolvedValue({
      telegramId: '123',
      status: 'APPROVED',
      enabled: true,
      isActive: true,
    }),
    assertAllowedInTransaction: jest.fn(),
  };
  const service = new GroupConnectionsService(
    prisma as never,
    access as never,
    identities as never,
  );
  const message = {
    message_id: 1,
    chat: { id: 123, type: 'private' },
    from: { id: 123 },
    chat_shared: { request_id: 42, chat_id: -1001, title: 'Lunch' },
  };
  return { service, tx, request, message, access };
}
it('treats delivery of the same completed connection as a retry without resetting settings', async () => {
  const { service, tx, message } = sharedSetup(-1001n);
  expect(await service.handleShared('CHLATWORK', message)).toBe(true);
  expect(tx.telegramGroupConnection.upsert).not.toHaveBeenCalled();
  expect(tx.telegramGroupAudit.upsert).not.toHaveBeenCalled();
});
it('rejects a completed request replayed into another group before any connection write', async () => {
  const { service, tx, message } = sharedSetup(-2002n);
  await expect(service.handleShared('CHLATWORK', message)).rejects.toThrow(
    'another group',
  );
  expect(tx.telegramGroupConnection.upsert).not.toHaveBeenCalled();
});
it('does not clear platform suspension while connecting', async () => {
  const { service, tx, message } = sharedSetup(null, 'SUSPENDED');
  await expect(service.handleShared('CHLATWORK', message)).rejects.toThrow(
    'unavailable',
  );
  expect(tx.telegramGroupConnection.upsert).not.toHaveBeenCalled();
});
it('requires the selecting sender to still administer the chosen group', async () => {
  const { service, tx, message, access } = sharedSetup();
  access.verifyRole.mockResolvedValueOnce(false);
  await expect(service.handleShared('CHLATWORK', message)).rejects.toThrow(
    'administrators',
  );
  expect(tx.$queryRaw).not.toHaveBeenCalled();
});
it('adds another manager or bot to the same durable workspace while preserving connection settings', async () => {
  const { service, tx, message } = sharedSetup();
  await service.handleShared('CHLATWORK', message);
  expect(tx.telegramGroupConnection.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        workspaceId_bot: { workspaceId: 'workspace', bot: 'CHLATWORK' },
      },
      update: {
        health: 'CONNECTED',
        lastVerifiedAt: expect.any(Date),
        version: { increment: 1 },
      },
    }),
  );
  expect(tx.telegramGroupManager.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        workspaceId_userId: { workspaceId: 'workspace', userId: 'manager' },
      },
    }),
  );
});

function migrationSetup(alreadyMoved = false, conflict = false) {
  const tx = {
    $executeRaw: jest.fn(),
    telegramGroupChatAlias: {
      findUnique: jest
        .fn()
        .mockResolvedValueOnce({ workspaceId: 'A' })
        .mockResolvedValueOnce(conflict ? { workspaceId: 'B' } : null),
      upsert: jest.fn(),
    },
    telegramGroupWorkspace: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 'A',
        telegramChatId: alreadyMoved ? -2002n : -1001n,
        status: 'ACTIVE',
      }),
      update: jest.fn(),
    },
    telegramGroupConnection: { update: jest.fn(), updateMany: jest.fn() },
    momentVoteSchedule: { updateMany: jest.fn() },
    momentVoteRound: { updateMany: jest.fn() },
    telegramGroupSplit: { updateMany: jest.fn() },
    telegramQuickSplitSession: { updateMany: jest.fn() },
    telegramGroupAudit: { create: jest.fn() },
  };
  const groups = {
    botId: async () => 999,
    client: () => ({
      getChatMember: async () => ({
        user: { id: 999 },
        status: 'administrator',
      }),
    }),
  };
  const service = new GroupConnectionsService(
    { $transaction: async (fn: Function) => fn(tx) } as never,
    groups as never,
    {} as never,
  );
  const update = {
    update_id: 5,
    message: {
      message_id: 1,
      chat: { id: -1001, type: 'group' },
      migrate_to_chat_id: -2002,
    },
  };
  return { tx, service, update };
}
it('moves an open round with its ID and ballots and requests a replacement message in the new chat', async () => {
  const { tx, service, update } = migrationSetup();
  expect(await service.handleLifecycle('CHLATWORK', update)).toBe(true);
  expect(tx.momentVoteRound.updateMany).toHaveBeenCalledWith({
    where: {
      telegramChatId: -1001n,
      finalizedAt: null,
      closesAt: { gt: expect.any(Date) },
    },
    data: { telegramChatId: -2002n, messageId: null },
  });
  expect(tx.telegramQuickSplitSession.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({ data: { expiresAt: new Date(0) } }),
  );
});
it('refuses a migration into another workspace before updating records', async () => {
  const { tx, service, update } = migrationSetup(false, true);
  await expect(service.handleLifecycle('CHLATWORK', update)).rejects.toThrow(
    'another workspace',
  );
  expect(tx.telegramGroupWorkspace.update).not.toHaveBeenCalled();
});
it('verifies the second bot connection even when the other bot already moved the workspace', async () => {
  const { tx, service, update } = migrationSetup(true);
  await service.handleLifecycle('CREATOR', update);
  expect(tx.telegramGroupConnection.update).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { workspaceId_bot: { workspaceId: 'A', bot: 'CREATOR' } },
      data: expect.objectContaining({ health: 'CONNECTED' }),
    }),
  );
  expect(tx.momentVoteRound.updateMany).not.toHaveBeenCalled();
});
