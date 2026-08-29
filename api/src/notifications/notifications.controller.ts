import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { UpdateTelegramNotificationsDto } from './dto/update-telegram-notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('telegram/settings')
  getTelegramSettings(@CurrentAuthUser() user: CurrentUser) {
    return this.notifications.getTelegramSettings(user.id);
  }

  @Put('telegram/settings')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  updateTelegramSettings(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: UpdateTelegramNotificationsDto,
  ) {
    return this.notifications.updateTelegramSettings(user.id, dto);
  }
}
