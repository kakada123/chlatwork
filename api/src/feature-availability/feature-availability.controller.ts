import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { FeatureAvailabilityService } from './feature-availability.service';

class UpdateAvailabilityDto {
  @IsBoolean()
  enabled: boolean;
}

@Controller('feature-availability')
@Throttle({ default: { limit: 300, ttl: 60_000 } })
export class FeatureAvailabilityController {
  constructor(private readonly availability: FeatureAvailabilityService) {}

  @Get()
  async publicStatus() {
    return { disabled: await this.availability.disabledKeys() };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  list() {
    return this.availability.list();
  }

  @Put('admin/:key')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  update(
    @Param('key') key: string,
    @Body() dto: UpdateAvailabilityDto,
    @CurrentAuthUser() admin: CurrentUser,
  ) {
    return this.availability.update(key, dto.enabled, admin.id);
  }
}
