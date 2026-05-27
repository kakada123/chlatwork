import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService, ExpenseAuthPayload } from "./auth.service";

type RequestWithAuthHeader = {
  headers: {
    authorization?: string | string[];
    cookie?: string | string[];
  };
  user?: ExpenseAuthPayload;
};

export type AuthenticatedRequest = RequestWithAuthHeader & {
  user: ExpenseAuthPayload;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithAuthHeader>();
    const authorization = request.headers.authorization;
    const header = Array.isArray(authorization) ? authorization[0] : authorization;
    const cookie = Array.isArray(request.headers.cookie)
      ? request.headers.cookie[0]
      : request.headers.cookie;
    const token = this.extractBearerToken(header) ?? this.extractCookieToken(cookie);

    if (!token) {
      throw new UnauthorizedException("Login is required to save Expense Tracker records.");
    }

    request.user = this.auth.verifyAccessToken(token);

    return true;
  }

  private extractBearerToken(header: string | undefined) {
    if (!header?.startsWith("Bearer ")) {
      return null;
    }

    const token = header.slice("Bearer ".length).trim();

    if (!token) {
      return null;
    }

    return token;
  }

  private extractCookieToken(header: string | undefined) {
    if (!header) {
      return null;
    }

    const cookieName = `${this.auth.getCookieName()}=`;
    const rawValue = header
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(cookieName))
      ?.slice(cookieName.length);

    if (!rawValue) {
      return null;
    }

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return null;
    }
  }
}
