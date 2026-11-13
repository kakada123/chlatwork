import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import {
  ApplyRosterDto,
  CreateShiftDto,
  GenerateRosterDto,
  LeaveAdjustmentDto,
  UpdatePreferencesDto,
  UpdateShiftDto,
  UpsertRosterDayDto,
  UpdateRosterStatusesDto,
} from './roster.dto';
import { RosterService } from './roster.service';

@Controller('roster')
@UseGuards(JwtAuthGuard)
export class RosterController {
  constructor(private readonly roster: RosterService) {}

  @Get('month')
  getMonth(
    @CurrentAuthUser() user: CurrentUser,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.roster.getMonthlyRoster(
      user.id,
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get('settings')
  getSettings(
    @CurrentAuthUser() user: CurrentUser,
    @Query('year') year?: string,
  ) {
    return this.roster.getSettings(
      user.id,
      year === undefined ? undefined : Number(year),
    );
  }

  @Put('settings/preferences')
  updatePreferences(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.roster.updatePreferences(user.id, dto);
  }

  @Put('month/status')
  updateStatuses(@CurrentAuthUser() user: CurrentUser, @Body() dto: UpdateRosterStatusesDto) {
    return this.roster.updateStatuses(user.id, dto);
  }

  @Get('shifts')
  listShifts(@CurrentAuthUser() user: CurrentUser) {
    return this.roster.listShifts(user.id);
  }

  @Post('shifts')
  createShift(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: CreateShiftDto,
  ) {
    return this.roster.createShift(user.id, dto);
  }

  @Put('shifts/:id')
  updateShift(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.roster.updateShift(user.id, id, dto);
  }

  @Put('days/:date')
  upsertDay(
    @CurrentAuthUser() user: CurrentUser,
    @Param('date') date: string,
    @Body() dto: UpsertRosterDayDto,
  ) {
    return this.roster.upsertRosterDay(user.id, date, dto);
  }

  @Delete('days/:date')
  deleteDay(
    @CurrentAuthUser() user: CurrentUser,
    @Param('date') date: string,
  ) {
    return this.roster.deleteRosterDay(user.id, date);
  }

  @Get('leave/balances')
  getLeaveBalances(
    @CurrentAuthUser() user: CurrentUser,
    @Query('year') year?: string,
  ) {
    return this.roster.getLeaveBalances(
      user.id,
      year === undefined ? undefined : Number(year),
    );
  }

  @Post('leave/adjustments')
  recordLeaveAdjustment(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: LeaveAdjustmentDto,
  ) {
    return this.roster.recordLeaveAdjustment(user.id, dto);
  }

  @Get('leave/transactions')
  listLeaveTransactions(@CurrentAuthUser() user: CurrentUser) {
    return this.roster.listLeaveTransactions(user.id);
  }

  @Post('generate/preview')
  generatePreview(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: GenerateRosterDto,
  ) {
    return this.roster.generatePreview(user.id, dto);
  }

  @Post('generate/apply')
  applyRoster(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: ApplyRosterDto,
  ) {
    return this.roster.applyRosterSuggestions(user.id, dto);
  }

  @Post('month/reset')
  resetMonth(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: GenerateRosterDto,
  ) {
    return this.roster.resetMonth(user.id, dto.year, dto.month);
  }
}
