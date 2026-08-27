import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('analytics')
  getAnalytics(@Query() query: AdminAnalyticsQueryDto) {
    return this.admin.getAnalytics(query.range);
  }
}
