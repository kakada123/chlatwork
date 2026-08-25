import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentUser } from './types';

export const CurrentAuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUser =>
    context.switchToHttp().getRequest<{ user: CurrentUser }>().user,
);

export const OptionalCurrentAuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUser | null =>
    context.switchToHttp().getRequest<{ user?: CurrentUser }>().user ?? null,
);
