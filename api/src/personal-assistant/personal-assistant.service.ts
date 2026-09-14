import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PersonalTaskStatus } from '@prisma/client';
import {
  TelegramAssistantAiProcessingError,
  TelegramAssistantAiService,
  TelegramAssistantAiUnavailableError,
} from '../telegram-bot/telegram-assistant-ai.service';
import {
  AssistantIntent,
  type PersonalAssistantContext,
  type PersonalAssistantReply,
} from './assistant.types';
import { PersonalMemoryService } from './memory.service';
import { PersonalReminderService } from './reminder.service';
import { PersonalTaskService } from './task.service';

const MINIMUM_ASSISTANT_CONFIDENCE = 70;

@Injectable()
export class PersonalAssistantService {
  private readonly logger = new Logger(PersonalAssistantService.name);

  constructor(
    private readonly ai: TelegramAssistantAiService,
    private readonly memories: PersonalMemoryService,
    private readonly tasks: PersonalTaskService,
    private readonly reminders: PersonalReminderService,
  ) {}

  async handleMessage(
    message: string,
    context: PersonalAssistantContext,
  ): Promise<PersonalAssistantReply> {
    const text = message.trim();
    if (!text || text.length > 2000 || !this.ai.isConfigured())
      return { consumed: false };

    let parsed;
    try {
      parsed = await this.ai.parsePersonalAssistantIntent(
        text,
        context.timeZone,
        context.now,
      );
    } catch (error) {
      if (error instanceof TelegramAssistantAiUnavailableError)
        return { consumed: false };
      if (
        error instanceof TelegramAssistantAiProcessingError ||
        error instanceof SyntaxError
      ) {
        this.logger.warn('Personal assistant intent parsing failed');
        return {
          consumed: true,
          text: "I couldn't understand that. Try “Remind me tomorrow at 2 PM to buy a power bank.”",
        };
      }
      throw error;
    }

    if (
      parsed.intent === AssistantIntent.UNKNOWN ||
      parsed.confidence < MINIMUM_ASSISTANT_CONFIDENCE
    ) {
      return { consumed: false };
    }
    if (parsed.clarification)
      return { consumed: true, text: parsed.clarification };

    const now = context.now ?? new Date();
    switch (parsed.intent) {
      case AssistantIntent.CREATE_MEMORY: {
        if (!parsed.memory) return this.invalidResult();
        await this.memories.create(context.userId, parsed.memory);
        this.logger.log('Personal memory created');
        return {
          consumed: true,
          text: `Got it. I’ll remember: ${parsed.memory.content}`,
        };
      }
      case AssistantIntent.CREATE_TASK: {
        if (!parsed.task) return this.invalidResult();
        await this.tasks.create(context.userId, parsed.task);
        this.logger.log('Personal task created');
        return {
          consumed: true,
          text: `Got it. I added “${parsed.task.title}” to your tasks.`,
        };
      }
      case AssistantIntent.CREATE_TASK_REMINDER: {
        if (!parsed.task || !parsed.reminder) return this.invalidResult();
        const remindAt = this.futureReminderDate(parsed.reminder.remindAt, now);
        await this.tasks.createWithReminder(context.userId, {
          ...parsed.task,
          message: parsed.reminder.message,
          remindAt,
        });
        this.logger.log('Personal task and reminder created');
        return {
          consumed: true,
          text: `Got it. I’ll remind you ${this.formatDate(remindAt, context.timeZone)} to ${this.lowercaseFirst(parsed.reminder.message)}.`,
        };
      }
      case AssistantIntent.CREATE_REMINDER: {
        if (!parsed.reminder) return this.invalidResult();
        const remindAt = this.futureReminderDate(parsed.reminder.remindAt, now);
        await this.reminders.create(
          context.userId,
          { ...parsed.reminder, remindAt },
          now,
        );
        this.logger.log('Personal reminder created');
        return {
          consumed: true,
          text: `Got it. I’ll remind you ${this.formatDate(remindAt, context.timeZone)}.`,
        };
      }
      case AssistantIntent.QUERY_MEMORY: {
        const found = await this.memories.search(
          context.userId,
          parsed.query?.text,
          parsed.query?.subject,
        );
        if (!found.length)
          return {
            consumed: true,
            text: parsed.query?.subject
              ? `I don’t remember anything about ${parsed.query.subject} yet.`
              : 'I don’t have a matching memory yet.',
          };
        return {
          consumed: true,
          text: found.map((item) => `• ${item.content}`).join('\n'),
        };
      }
      case AssistantIntent.QUERY_TASKS: {
        const found = await this.tasks.list(
          context.userId,
          PersonalTaskStatus.OPEN,
          parsed.query?.text,
          parsed.query?.subject,
        );
        if (!found.length)
          return {
            consumed: true,
            text: parsed.query?.subject
              ? `You don’t have any open tasks for ${parsed.query.subject}.`
              : 'You don’t have any open tasks.',
          };
        return {
          consumed: true,
          text: `You still have:\n\n${found.map((item, index) => `${index + 1}. ${item.title}`).join('\n')}`,
        };
      }
      case AssistantIntent.COMPLETE_TASK: {
        const matches = await this.tasks.findOpenMatches(
          context.userId,
          parsed.query?.text ?? parsed.task?.title ?? '',
          parsed.query?.subject ?? parsed.task?.subject,
        );
        if (!matches.length)
          return {
            consumed: true,
            text: 'I couldn’t find a matching open task.',
          };
        if (matches.length > 1)
          return {
            consumed: true,
            text: `Which task did you finish?\n\n${matches.map((item, index) => `${index + 1}. ${item.title}`).join('\n')}`,
          };
        await this.tasks.complete(context.userId, matches[0].id, now);
        this.logger.log('Personal task completed');
        return {
          consumed: true,
          text: `Done. I marked “${matches[0].title}” as completed.`,
        };
      }
      default:
        return { consumed: false };
    }
  }

  private futureReminderDate(value: string | undefined, now: Date) {
    const date = value ? new Date(value) : new Date(Number.NaN);
    if (!Number.isFinite(date.getTime()) || date <= now) {
      throw new BadRequestException(
        'I couldn’t understand a future reminder time. Try “tomorrow at 2 PM.”',
      );
    }
    return date;
  }

  private invalidResult(): PersonalAssistantReply {
    this.logger.warn(
      'Personal assistant returned an invalid structured result',
    );
    return {
      consumed: true,
      text: 'I couldn’t understand that. Please try rewording it.',
    };
  }

  private formatDate(date: Date, timeZone: string) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private lowercaseFirst(value: string) {
    return value ? `${value[0].toLocaleLowerCase()}${value.slice(1)}` : value;
  }
}
