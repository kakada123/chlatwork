import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { CurrentUser } from './types';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ user?: CurrentUser }>();

    if (request.user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Administrator access required');
    }

    return true;
  }
}
