import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { CurrentUser } from "../auth/types";

@Injectable()
export class FoodOptionalAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = CurrentUser>(
    error: unknown,
    user: TUser | false | null,
    _info: unknown,
    context: ExecutionContext,
  ): TUser | null {
    if (error)
      throw new ServiceUnavailableException(
        "Account verification is unavailable.",
      );
    if (user) return user;
    // An expired supplied session must refresh before paid work, not silently save into anonymous history.
    if (
      context
        .switchToHttp()
        .getRequest<{ headers: { authorization?: string } }>().headers
        .authorization
    )
      throw new UnauthorizedException("Authentication required");
    return null;
  }
}
