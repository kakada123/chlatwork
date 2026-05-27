import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedRequest, AuthGuard } from "../auth/auth.guard";
import { CreateExpenseTrackerDto } from "./dto/create-expense-tracker.dto";
import { ExpenseTrackerService } from "./expense-tracker.service";

@Controller("expense-trackers")
@UseGuards(AuthGuard)
export class ExpenseTrackerController {
  constructor(private readonly service: ExpenseTrackerService) {}

  @Post()
  confirmSave(@Body() dto: CreateExpenseTrackerDto, @Req() request: AuthenticatedRequest) {
    return this.service.confirmSave(dto, request.user.sub);
  }

  @Get()
  listByMonth(@Query("month") month: string | undefined, @Req() request: AuthenticatedRequest) {
    return this.service.listByCreatedMonth(request.user.sub, month);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.service.findOne(id, request.user.sub);
  }
}
