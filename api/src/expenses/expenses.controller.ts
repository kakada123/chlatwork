import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { CreateQuickExpenseDto } from './dto/create-quick-expense.dto';
import { SaveExpenseStateDto } from './dto/save-expense-state.dto';
import { UpdateQuickExpenseSettingsDto } from './dto/update-quick-expense-settings.dto';
import { ExpensesService } from './expenses.service';
import {
  SaveExpenseChangesDto,
  SaveExpenseProfileDto,
} from './dto/save-expense-changes.dto';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get('profile')
  getProfile(@CurrentAuthUser() user: CurrentUser) {
    return this.expenses.getProfile(user.id);
  }

  @Put('profile')
  saveProfile(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: SaveExpenseProfileDto,
  ) {
    return this.expenses.saveProfile(user.id, dto);
  }

  @Get('entries')
  getEntries(
    @CurrentAuthUser() user: CurrentUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.expenses.getEntries(user.id, from, to);
  }

  @Get('summary')
  getSummary(
    @CurrentAuthUser() user: CurrentUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.expenses.getSummary(user.id, from, to);
  }

  @Patch('entries')
  saveEntries(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: SaveExpenseChangesDto,
  ) {
    return this.expenses.saveEntries(user.id, dto);
  }

  @Get('state')
  getState(@CurrentAuthUser() user: CurrentUser) {
    return this.expenses.getState(user.id);
  }

  @Put('state')
  saveState(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: SaveExpenseStateDto,
  ) {
    return this.expenses.saveState(user.id, dto);
  }

  @Get('quick-entry/settings')
  getQuickEntrySettings(@CurrentAuthUser() user: CurrentUser) {
    return this.expenses.getQuickEntrySettings(user.id);
  }

  @Put('quick-entry/settings')
  updateQuickEntrySettings(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: UpdateQuickExpenseSettingsDto,
  ) {
    return this.expenses.updateQuickEntrySettings(user.id, dto);
  }

  @Post('quick-entry')
  createQuickExpense(
    @CurrentAuthUser() user: CurrentUser,
    @Body() dto: CreateQuickExpenseDto,
  ) {
    return this.expenses.createQuickExpense(user.id, dto);
  }
}
