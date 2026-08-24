import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentAuthUser } from './current-user.decorator';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TelegramAuthDto } from './dto/telegram-auth.dto';
import { TelegramCodeAuthDto } from './dto/telegram-code-auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { CurrentUser } from './types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  google(@Body() dto: GoogleAuthDto) {
    return this.auth.google(dto.token);
  }

  @Post('telegram')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  telegram(@Body() dto: TelegramAuthDto) {
    return this.auth.telegram(dto.idToken);
  }

  @Post('telegram/code')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  telegramCode(@Body() dto: TelegramCodeAuthDto) {
    return this.auth.telegramCode(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentAuthUser() user: CurrentUser) {
    return this.auth.me(user.id);
  }
}
