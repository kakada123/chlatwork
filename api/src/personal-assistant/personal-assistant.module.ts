import { forwardRef, Module } from '@nestjs/common';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { PersonalMemoryService } from './memory.service';
import { PersonalAssistantController } from './personal-assistant.controller';
import { PersonalAssistantService } from './personal-assistant.service';
import { PersonalReminderScheduler } from './reminder.scheduler';
import { PersonalReminderService } from './reminder.service';
import { PersonalTaskService } from './task.service';

@Module({
  imports: [forwardRef(() => TelegramBotModule)],
  controllers: [PersonalAssistantController],
  providers: [
    PersonalAssistantService,
    PersonalMemoryService,
    PersonalTaskService,
    PersonalReminderService,
    PersonalReminderScheduler,
  ],
  exports: [PersonalAssistantService],
})
export class PersonalAssistantModule {}
