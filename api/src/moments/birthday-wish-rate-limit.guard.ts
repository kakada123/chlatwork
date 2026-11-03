import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { InjectThrottlerStorage, ThrottlerException, type ThrottlerStorage } from '@nestjs/throttler';
import { createHash } from 'node:crypto';

@Injectable()
export class BirthdayWishRateLimitGuard implements CanActivate {
  constructor(@InjectThrottlerStorage() private readonly storage: ThrottlerStorage) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userId = context.switchToHttp().getRequest<{ user?: { id?: string } }>().user?.id;
    if (!userId) throw new UnauthorizedException();
    // Nuxt forwards many accounts through one IP; apply the generation limit after JWT authentication.
    const key = `birthday-wish:${createHash('sha256').update(userId).digest('hex')}`;
    const result = await this.storage.increment(key, 60_000, 3, 60_000, 'birthday-wish');
    if (result.isBlocked) throw new ThrottlerException();
    return true;
  }
}
