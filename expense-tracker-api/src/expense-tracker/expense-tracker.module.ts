import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { ExpenseTrackerRecord } from "./entities/expense-tracker-record.entity";
import { ExpenseTrackerController } from "./expense-tracker.controller";
import { ExpenseTrackerRepository } from "./expense-tracker.repository";
import { ExpenseTrackerService } from "./expense-tracker.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([ExpenseTrackerRecord])],
  controllers: [ExpenseTrackerController],
  providers: [ExpenseTrackerRepository, ExpenseTrackerService],
})
export class ExpenseTrackerModule {}
