import { GroupPollMediaService } from './group-poll-media.service';
it('cannot use a normal web access JWT to fetch a group image', async () => {
  const jwt = {
    verifyAsync: jest.fn().mockRejectedValue(new Error('invalid audience')),
  };
  const prisma = { momentMedia: { findFirst: jest.fn() } };
  const service = new GroupPollMediaService(
    prisma as never,
    {} as never,
    jwt as never,
    {} as never,
  );
  await expect(service.fetch('image', 'web-token')).rejects.toThrow(
    'Photo not found',
  );
  expect(prisma.momentMedia.findFirst).not.toHaveBeenCalled();
});
it('binds image tokens to media and workspace and checks the current connection', async () => {
  const jwt = {
    verifyAsync: jest.fn().mockResolvedValue({
      purpose: 'group-poll-image',
      workspaceId: 'A',
      bot: 'CHLATWORK',
      mediaId: 'other',
    }),
  };
  const groups = {
    connection: jest.fn(),
    active: jest.fn().mockReturnValue(false),
  };
  const service = new GroupPollMediaService(
    {} as never,
    groups as never,
    jwt as never,
    {} as never,
  );
  await expect(service.fetch('image', 'token')).rejects.toThrow(
    'Photo not found',
  );
  expect(groups.connection).not.toHaveBeenCalled();
  jwt.verifyAsync.mockResolvedValueOnce({
    purpose: 'group-poll-image',
    workspaceId: 'A',
    bot: 'CHLATWORK',
    mediaId: 'image',
  });
  await expect(service.fetch('image', 'token')).rejects.toThrow(
    'Photo not found',
  );
  expect(groups.connection).toHaveBeenCalledWith('CHLATWORK', 'A');
});
