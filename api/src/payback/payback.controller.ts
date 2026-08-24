import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { SavePaybackStateDto } from './dto/save-payback-state.dto';
import { CreatePaybackHistoryDto } from './dto/create-payback-history.dto';
import { PaybackService } from './payback.service';

@Controller('payback')
@UseGuards(JwtAuthGuard)
export class PaybackController {
  constructor(private readonly payback: PaybackService) {}

  @Get('state')
  getState(@CurrentAuthUser() user: CurrentUser) {
    return this.payback.getState(user.id);
  }

  @Put('state')
  saveState(@CurrentAuthUser() user: CurrentUser, @Body() dto: SavePaybackStateDto) {
    return this.payback.saveState(user.id, dto);
  }

  @Get('history')
  getHistory(@CurrentAuthUser() user: CurrentUser, @Query('limit') limit?: string) {
    return this.payback.getHistory(user.id, limit);
  }

  @Get('history/count')
  getHistoryCount(@CurrentAuthUser() user: CurrentUser) {
    return this.payback.getHistoryCount(user.id);
  }

  @Post('history')
  createHistory(@CurrentAuthUser() user: CurrentUser, @Body() dto: CreatePaybackHistoryDto) {
    return this.payback.createHistory(user.id, dto);
  }

  @Delete('history/:id')
  deleteHistory(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.payback.deleteHistory(user.id, id);
  }
}
