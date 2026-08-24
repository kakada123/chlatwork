import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { SaveExpenseStateDto } from './dto/save-expense-state.dto';
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
}
