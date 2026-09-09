import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/types';
import { CreatorCreditAdminService } from './creator-credit-admin.service';
import {
  AdjustCreatorCreditsDto,
  CreatorCreditUsersQueryDto,
  UpdateCreatorUsageLimitDto,
} from './dto/creator-credit-admin.dto';

@Controller('creator-ai/admin/credits')
@UseGuards(JwtAuthGuard, AdminGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class CreatorCreditAdminController {
  constructor(private readonly credits: CreatorCreditAdminService) {}

  @Get('users')
  users(@Query() query: CreatorCreditUsersQueryDto) {
    return this.credits.users(query);
  }

  @Get('users/:id')
  details(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.credits.details(id);
  }

  @Post('adjustments')
  adjust(
    @CurrentAuthUser() admin: CurrentUser,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: AdjustCreatorCreditsDto,
  ) {
    return this.credits.adjust(admin.id, key, dto);
  }

  @Post('usage-limits')
  updateUsageLimit(
    @CurrentAuthUser() admin: CurrentUser,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: UpdateCreatorUsageLimitDto,
  ) {
    return this.credits.updateUsageLimit(admin.id, key, dto);
  }
}
