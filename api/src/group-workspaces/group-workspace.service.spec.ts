import { ForbiddenException } from '@nestjs/common';
import { GroupWorkspaceService } from './group-workspace.service';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

describe('group list permission checks', () => {
  function setup(ids: string[], manager = jest.fn()) {
    const findMany = jest
      .fn()
      .mockResolvedValue(ids.map((workspaceId) => ({ workspaceId })));
    const service = new GroupWorkspaceService(
      { telegramGroupManager: { findMany } } as never,
      { manager } as never,
      {} as never,
    );
    return { service, findMany, manager };
  }

  it('checks four groups concurrently, preserves order and checks all twenty live', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => String(i));
    const started: string[] = [];
    const waits = ids.map(() => deferred<{ workspaceId: string }>());
    let signal = deferred<void>();
    const manager = jest.fn((_user: string, id: string) => {
      started.push(id);
      if (started.length % 4 === 0) signal.resolve();
      return waits[Number(id)].promise;
    });
    const { service, findMany } = setup(ids, manager);
    const result = service.list('user', 'CHLATWORK', 2);
    for (let start = 0; start < 20; start += 4) {
      await signal.promise;
      expect(started).toEqual(ids.slice(0, start + 4));
      signal = deferred<void>();
      for (let i = start + 3; i >= start; i--)
        waits[i].resolve({ workspaceId: ids[i] });
    }
    expect(await result).toEqual({
      items: ids.map((workspaceId) => ({ workspaceId })),
      page: 2,
      hasMore: true,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
    expect(manager).toHaveBeenCalledTimes(20);
    expect(manager).toHaveBeenCalledWith('user', '0', 'CHLATWORK');
  });

  it('omits revoked groups while retaining allowed groups', async () => {
    const { service } = setup(
      ['allowed', 'revoked'],
      jest.fn(async (_user, id) => {
        if (id === 'revoked') throw new ForbiddenException();
        return { workspaceId: id };
      }),
    );
    expect(await service.list('user', 'CHLATWORK', 1)).toEqual({
      items: [{ workspaceId: 'allowed' }],
      page: 1,
      hasMore: false,
    });
  });

  it('propagates unexpected permission-provider failures', async () => {
    const { service } = setup(
      ['group'],
      jest.fn().mockRejectedValue(new Error('Telegram unavailable')),
    );
    await expect(service.list('user', 'CHLATWORK', 1)).rejects.toThrow(
      'Telegram unavailable',
    );
  });
});
