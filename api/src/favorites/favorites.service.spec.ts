import { FavoriteKind } from '@prisma/client';
import { FavoritesService } from './favorites.service';

function createService() {
  const userFavorite = {
    findMany: jest.fn(),
    upsert: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  return {
    service: new FavoritesService({ userFavorite } as never),
    userFavorite,
  };
}

describe('FavoritesService', () => {
  it('returns tool and command identifiers from only the current account query', async () => {
    const { service, userFavorite } = createService();
    userFavorite.findMany.mockResolvedValue([
      { kind: FavoriteKind.COMMAND, itemKey: 'git-status' },
      { kind: FavoriteKind.TOOL, itemKey: 'calculator' },
    ]);

    await expect(service.list('user-1')).resolves.toEqual({
      toolKeys: ['calculator'],
      commandIds: ['git-status'],
    });
    expect(userFavorite.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1' },
    }));
  });

  it('uses an idempotent account-scoped upsert when adding a favorite', async () => {
    const { service, userFavorite } = createService();

    await expect(service.set('user-1', {
      kind: FavoriteKind.TOOL,
      itemKey: 'calculator',
      favorite: true,
    })).resolves.toEqual({ favorite: true });
    expect(userFavorite.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId_kind_itemKey: {
          userId: 'user-1',
          kind: FavoriteKind.TOOL,
          itemKey: 'calculator',
        },
      },
    }));
  });

  it('removes only the selected favorite owned by the current account', async () => {
    const { service, userFavorite } = createService();

    await expect(service.set('user-1', {
      kind: FavoriteKind.COMMAND,
      itemKey: 'git-status',
      favorite: false,
    })).resolves.toEqual({ favorite: false });
    expect(userFavorite.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        kind: FavoriteKind.COMMAND,
        itemKey: 'git-status',
      },
    });
  });
});
