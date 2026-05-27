import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, AuthGuard } from "./auth.guard";
import { AuthService, ExpenseSessionResponse } from "./auth.service";
import { TelegramLoginDto } from "./dto/telegram-login.dto";

type CookieResponse = {
  getHeader(name: string): number | string | string[] | undefined;
  setHeader(name: string, value: string | string[]): void;
};

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("telegram")
  async telegramLogin(
    @Body() dto: TelegramLoginDto,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const session = await this.auth.loginWithTelegram(dto);

    return this.withSessionCookie(response, session);
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) response: CookieResponse) {
    this.appendSetCookie(response, this.auth.buildClearSessionCookie());

    return {
      ok: true,
    };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.getProfile(request.user.sub);
  }

  private withSessionCookie(response: CookieResponse, session: ExpenseSessionResponse) {
    this.appendSetCookie(
      response,
      this.auth.buildSessionCookie(session.accessToken, session.expiresAt),
    );

    return session;
  }

  private appendSetCookie(response: CookieResponse, cookie: string) {
    const existing = response.getHeader("Set-Cookie");

    if (!existing) {
      response.setHeader("Set-Cookie", cookie);
      return;
    }

    response.setHeader(
      "Set-Cookie",
      Array.isArray(existing) ? [...existing, cookie] : [String(existing), cookie],
    );
  }
}
