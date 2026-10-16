import { BotAdminService } from './bot-admin.service';
import type { ReviewBotUser } from './bot-admin.dto';

const input: ReviewBotUser = {
  status: 'APPROVED',
  creatorEnabled: true,
  chlatworkEnabled: false,
  expectedVersion: 0,
  startingCredits: 10,
  expectedBalance: 0,
  reason: 'Welcome grant',
};

function setup() {
  const tx = {
    $executeRaw: jest.fn(),
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ status: 'PENDING', version: 0 }]),
  };
  const prisma = {
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const credits = { adjust: jest.fn() };
  return {
    tx,
    credits,
    service: new BotAdminService(prisma as never, credits as never),
  };
}

describe('bot admin approval', () => {
  it('uses the existing credit service in the same transaction as approval', async () => {
    const { service, credits, tx } = setup();
    await expect(
      service.review('admin', 'owner', 'approval-key-0001', input),
    ).resolves.toEqual({ version: 1 });
    expect(credits.adjust).toHaveBeenCalledWith(
      'admin',
      expect.any(String),
      {
        userId: 'owner',
        amount: 10,
        expectedBalance: 0,
        reason: 'Welcome grant',
      },
      tx,
    );
    expect(tx.$executeRaw.mock.calls.flat().join(' ')).not.toContain(
      'UPDATE users',
    );
  });

  it('rejects stale profile changes without granting credits', async () => {
    const { service, credits } = setup();
    await expect(
      service.review('admin', 'owner', 'approval-key-0001', {
        ...input,
        expectedVersion: 3,
      }),
    ).rejects.toThrow('profile changed');
    expect(credits.adjust).not.toHaveBeenCalled();
  });

  it('rejects key reuse for a different user before any mutation', async () => {
    const { service, tx, credits } = setup();
    tx.$queryRaw.mockReset().mockResolvedValue([
      {
        userId: 'someone-else',
        details: { fingerprint: 'other', version: 1 },
      },
    ]);
    await expect(
      service.review('admin', 'owner', 'approval-key-0001', input),
    ).rejects.toThrow('different change');
    expect(credits.adjust).not.toHaveBeenCalled();
  });
});

describe('approval retries', () => {
  it('returns the stored approval without repeating its starting grant', async () => {
    const { service, tx, credits } = setup();
    await service.review('admin', 'owner', 'approval-key-0001', input);
    const audit = tx.$executeRaw.mock.calls.find((call) =>
      String(call[0]).includes("'ACCESS_REVIEW'"),
    );
    expect(audit).toBeDefined();
    // Read the persisted intent written by the first attempt, rather than
    // duplicating the service's hashing algorithm in this retry regression.
    const persisted = JSON.parse(audit![4] as string);
    tx.$queryRaw
      .mockReset()
      .mockResolvedValue([{ userId: 'owner', details: persisted }]);
    await expect(
      service.review('admin', 'owner', 'approval-key-0001', input),
    ).resolves.toEqual({ version: 1 });
    expect(credits.adjust).toHaveBeenCalledTimes(1);
  });
});
