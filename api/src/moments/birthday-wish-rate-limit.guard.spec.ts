import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { BirthdayWishRateLimitGuard } from './birthday-wish-rate-limit.guard';

const context = (id?: string) => ({
  switchToHttp: () => ({ getRequest: () => ({ user: id ? { id } : undefined }) }),
}) as unknown as ExecutionContext;

describe('birthday wish user rate limit', () => {
  it('gives distinct users independent generation quotas behind the same proxy', async () => {
    const counts = new Map<string, number>();
    const storage = { increment: jest.fn(async (key: string) => {
      const hits = (counts.get(key) ?? 0) + 1;
      counts.set(key, hits);
      return { isBlocked: hits > 3, totalHits: hits, timeToExpire: 60, timeToBlockExpire: 60 };
    }) };
    const guard = new BirthdayWishRateLimitGuard(storage);
    for (let request = 0; request < 3; request++) await expect(guard.canActivate(context('user-a'))).resolves.toBe(true);
    await expect(guard.canActivate(context('user-a'))).rejects.toBeInstanceOf(ThrottlerException);
    await expect(guard.canActivate(context('user-b'))).resolves.toBe(true);
    expect(counts.size).toBe(2);
    expect(storage.increment).toHaveBeenCalledWith(expect.stringMatching(/^birthday-wish:/), 60_000, 3, 60_000, 'birthday-wish');
  });

  it('fails closed without an authenticated user and consumes no provider quota', async () => {
    const storage = { increment: jest.fn() };
    const guard = new BirthdayWishRateLimitGuard(storage);
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(storage.increment).not.toHaveBeenCalled();
  });
});
