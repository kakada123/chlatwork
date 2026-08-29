import { Module } from "@nestjs/common";
import { DailyExpenseSummaryScheduler } from "./daily-expense-summary.scheduler";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, DailyExpenseSummaryScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
