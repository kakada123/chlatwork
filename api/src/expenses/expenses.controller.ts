import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { CreateQuickExpenseDto } from './dto/create-quick-expense.dto';
import { SaveExpenseStateDto } from './dto/save-expense-state.dto';
import { UpdateQuickExpenseSettingsDto } from './dto/update-quick-expense-settings.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get('state')
  getState(@CurrentAuthUser() user: CurrentUser) {
    return this.expenses.getState(user.id);
  }

  @Put('state')
  saveState(@CurrentAuthUser() user: CurrentUser, @Body() dto: SaveExpenseStateDto) {
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
  createQuickExpense(@CurrentAuthUser() user: CurrentUser, @Body() dto: CreateQuickExpenseDto) {
    return this.expenses.createQuickExpense(user.id, dto);
  }
}
