import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { CurrentUser } from './types';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = CurrentUser>(
    _error: unknown,
    user: TUser | false | null,
  ): TUser | null {
    return user || null;
  }
}
