import { UnauthorizedException } from '@nestjs/common';
import { UserRole, type User } from '@prisma/client';
import { AuthService } from './auth.service';

const user: User = {
  id: '4e4f663a-44da-439c-a08e-fc3a41bb0054',
  email: 'person@example.com',
  phone: null,
  name: 'Test Person',
  avatarUrl: null,
  role: UserRole.USER,
  isActive: true,
  createdAt: new Date('2026-08-21T00:00:00.000Z'),
  updatedAt: new Date('2026-08-21T00:00:00.000Z'),
};

function createService() {
  const refreshToken = {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const prisma = { refreshToken };
  const jwt = { signAsync: jest.fn().mockResolvedValue('new-access-token') };
  const service = new AuthService({} as never, jwt as never, prisma as never);

  return { service, refreshToken };
}

function storedToken(revokedAt: Date | null) {
  return {
    id: '0094d419-2e05-4d91-a43f-5079638cf503',
    tokenHash: 'stored-hash',
    userId: user.id,
    user,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt,
    createdAt: new Date(),
  };
}

describe('AuthService refresh rotation', () => {
  it('allows a parallel refresh that arrives during the rotation grace period', async () => {
    const { service, refreshToken } = createService();
    refreshToken.findUnique.mockResolvedValue(storedToken(new Date(Date.now() - 1_000)));

    const result = await service.refresh('same-browser-refresh-token');

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('rejects reuse after the rotation grace period', async () => {
    const { service, refreshToken } = createService();
    refreshToken.findUnique.mockResolvedValue(storedToken(new Date(Date.now() - 11_000)));

    await expect(service.refresh('reused-refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(refreshToken.create).not.toHaveBeenCalled();
  });

  it('does not fail when another request wins the atomic revocation race', async () => {
    const { service, refreshToken } = createService();
    refreshToken.findUnique.mockResolvedValue(storedToken(null));
    refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.refresh('parallel-refresh-token')).resolves.toMatchObject({
      accessToken: 'new-access-token',
    });
  });

  it('deletes the presented token on explicit logout so rotation grace cannot revive it', async () => {
    const { service, refreshToken } = createService();

    await service.logout('logout-refresh-token');

    expect(refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    expect(refreshToken.updateMany).not.toHaveBeenCalled();
  });
});
