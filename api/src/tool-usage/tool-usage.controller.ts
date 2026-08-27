import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { RecordToolUsageDto } from './dto/record-tool-usage.dto';
import { ToolUsageService } from './tool-usage.service';

@Controller('tool-usage')
export class ToolUsageController {
  constructor(private readonly toolUsage: ToolUsageService) {}

  @Get('popular')
  getPopular() {
    return this.toolUsage.getPopular();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  record(@CurrentAuthUser() user: CurrentUser, @Body() dto: RecordToolUsageDto) {
    return this.toolUsage.record(user.id, dto);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  getSummary(@CurrentAuthUser() user: CurrentUser) {
    return this.toolUsage.getSummary(user.id);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  clear(@CurrentAuthUser() user: CurrentUser) {
    return this.toolUsage.clear(user.id);
  }
}
