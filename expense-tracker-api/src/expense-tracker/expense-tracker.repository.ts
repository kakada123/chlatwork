import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { And, LessThan, MoreThanOrEqual, Repository } from "typeorm";
import { ExpenseTrackerRecord } from "./entities/expense-tracker-record.entity";

@Injectable()
export class ExpenseTrackerRepository {
  constructor(
    @InjectRepository(ExpenseTrackerRecord)
    private readonly records: Repository<ExpenseTrackerRecord>,
  ) {}

  async save(record: ExpenseTrackerRecord) {
    return this.records.save(record);
  }

  async findByIdAndUserId(id: string, userId: string) {
    return this.records.findOne({
      where: { id, userId },
    });
  }

  async findByUserIdAndCreatedMonth(userId: string, start: Date, end: Date) {
    return this.records.find({
      where: {
        userId,
        createdAt: And(MoreThanOrEqual(start), LessThan(end)),
      },
      order: {
        createdAt: "DESC",
      },
    });
  }
}
