export enum AssistantIntent {
  CREATE_MEMORY = 'CREATE_MEMORY',
  CREATE_TASK = 'CREATE_TASK',
  CREATE_TASK_REMINDER = 'CREATE_TASK_REMINDER',
  CREATE_REMINDER = 'CREATE_REMINDER',
  QUERY_MEMORY = 'QUERY_MEMORY',
  QUERY_TASKS = 'QUERY_TASKS',
  COMPLETE_TASK = 'COMPLETE_TASK',
  UNKNOWN = 'UNKNOWN',
}

export interface AssistantIntentResult {
  intent: AssistantIntent;
  memory?: { content: string; subject?: string; category?: string };
  task?: { title: string; subject?: string };
  reminder?: { message: string; remindAt?: string };
  query?: { text: string; subject?: string };
  confidence: number;
  clarification?: string;
}

export interface PersonalAssistantContext {
  userId: string;
  telegramChatId: number;
  timeZone: string;
  now?: Date;
}

export interface PersonalAssistantReply {
  consumed: boolean;
  text?: string;
}
