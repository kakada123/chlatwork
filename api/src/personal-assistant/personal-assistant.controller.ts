import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import {
  PersonalRecordIdDto,
  PersonalReminderQueryDto,
  PersonalSearchDto,
  PersonalTaskQueryDto,
} from './dto/personal-query.dto';
import { PersonalMemoryService } from './memory.service';
import { PersonalReminderService } from './reminder.service';
import { PersonalTaskService } from './task.service';

@Controller('personal')
@UseGuards(JwtAuthGuard)
export class PersonalAssistantController {
  constructor(
    private readonly memories: PersonalMemoryService,
    private readonly tasks: PersonalTaskService,
    private readonly reminders: PersonalReminderService,
  ) {}

  @Get('memories')
  memoriesList(
    @CurrentAuthUser() user: CurrentUser,
    @Query() query: PersonalSearchDto,
  ) {
    return this.memories.search(user.id, query.q, query.subject);
  }

  @Get('memories/search')
  memoriesSearch(
    @CurrentAuthUser() user: CurrentUser,
    @Query() query: PersonalSearchDto,
  ) {
    return this.memories.search(user.id, query.q, query.subject);
  }

  @Get('tasks')
  tasksList(
    @CurrentAuthUser() user: CurrentUser,
    @Query() query: PersonalTaskQueryDto,
  ) {
    if (!query.status) {
      return this.tasks.listAll(user.id, query.q, query.subject);
    }
    return this.tasks.list(
      user.id,
      query.status,
      query.q,
      query.subject,
    );
  }

  @Patch('tasks/:id/complete')
  completeTask(
    @CurrentAuthUser() user: CurrentUser,
    @Param() params: PersonalRecordIdDto,
  ) {
    return this.tasks.complete(user.id, params.id);
  }

  @Get('reminders')
  remindersList(
    @CurrentAuthUser() user: CurrentUser,
    @Query() query: PersonalReminderQueryDto,
  ) {
    return this.reminders.list(user.id, query.status);
  }

  @Patch('reminders/:id/cancel')
  cancelReminder(
    @CurrentAuthUser() user: CurrentUser,
    @Param() params: PersonalRecordIdDto,
  ) {
    return this.reminders.cancel(user.id, params.id);
  }
}
