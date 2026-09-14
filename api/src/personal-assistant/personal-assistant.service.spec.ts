import { BadRequestException } from '@nestjs/common';
import { AssistantIntent } from './assistant.types';
import { PersonalAssistantService } from './personal-assistant.service';

describe('PersonalAssistantService', () => {
  const context = {
    userId: '00000000-0000-4000-8000-000000000001',
    telegramChatId: 123,
    timeZone: 'Asia/Phnom_Penh',
    now: new Date('2026-09-14T03:00:00.000Z'),
  };

  function setup(result: Record<string, unknown>) {
    const ai = {
      isConfigured: jest.fn().mockReturnValue(true),
      parsePersonalAssistantIntent: jest
        .fn()
        .mockResolvedValue({ confidence: 95, ...result }),
    };
    const memories = {
      create: jest.fn(),
      search: jest.fn().mockResolvedValue([]),
    };
    const tasks = {
      create: jest.fn(),
      createWithReminder: jest.fn(),
      list: jest.fn().mockResolvedValue([]),
      findOpenMatches: jest.fn().mockResolvedValue([]),
      complete: jest.fn(),
    };
    const reminders = { create: jest.fn() };
    return {
      ai,
      memories,
      tasks,
      reminders,
      service: new PersonalAssistantService(
        ai as never,
        memories as never,
        tasks as never,
        reminders as never,
      ),
    };
  }

  it('creates a memory from a validated memory intent', async () => {
    const test = setup({
      intent: AssistantIntent.CREATE_MEMORY,
      memory: {
        content: 'O Neth birthday is 15 January',
        subject: 'O Neth',
        category: 'birthday',
      },
    });
    await expect(
      test.service.handleMessage('remember it', context),
    ).resolves.toEqual(expect.objectContaining({ consumed: true }));
    expect(test.memories.create).toHaveBeenCalledWith(
      context.userId,
      expect.objectContaining({ subject: 'O Neth' }),
    );
  });

  it('creates a task without inventing a reminder', async () => {
    const test = setup({
      intent: AssistantIntent.CREATE_TASK,
      task: { title: 'Buy power bank for O Neth', subject: 'O Neth' },
    });
    await test.service.handleMessage('need power bank', context);
    expect(test.tasks.create).toHaveBeenCalled();
    expect(test.tasks.createWithReminder).not.toHaveBeenCalled();
  });

  it('atomically creates a task and future reminder', async () => {
    const test = setup({
      intent: AssistantIntent.CREATE_TASK_REMINDER,
      task: { title: 'Buy power bank for O Neth', subject: 'O Neth' },
      reminder: {
        message: 'Buy power bank for O Neth',
        remindAt: '2026-09-15T07:00:00.000Z',
      },
    });
    await test.service.handleMessage(
      'trov buy power bank tomorrow 2pm',
      context,
    );
    expect(test.tasks.createWithReminder).toHaveBeenCalledWith(
      context.userId,
      expect.objectContaining({
        remindAt: new Date('2026-09-15T07:00:00.000Z'),
      }),
    );
  });

  it('answers memory and task queries only from service results', async () => {
    const memory = setup({
      intent: AssistantIntent.QUERY_MEMORY,
      query: { text: 'birthday', subject: 'O Neth' },
    });
    memory.memories.search.mockResolvedValue([
      { content: 'O Neth birthday is 15 January' },
    ]);
    await expect(
      memory.service.handleMessage('birthday?', context),
    ).resolves.toEqual({
      consumed: true,
      text: '• O Neth birthday is 15 January',
    });

    const task = setup({
      intent: AssistantIntent.QUERY_TASKS,
      query: { text: 'buy', subject: 'O Neth' },
    });
    task.tasks.list.mockResolvedValue([{ title: 'Buy power bank for O Neth' }]);
    await expect(
      task.service.handleMessage('what buy?', context),
    ).resolves.toEqual({
      consumed: true,
      text: 'You still have:\n\n1. Buy power bank for O Neth',
    });
  });

  it('completes exactly one task and asks when matches are ambiguous', async () => {
    const one = setup({
      intent: AssistantIntent.COMPLETE_TASK,
      query: { text: 'power bank', subject: 'O Neth' },
    });
    one.tasks.findOpenMatches.mockResolvedValue([
      { id: 'task-1', title: 'Buy power bank for O Neth' },
    ]);
    await one.service.handleMessage('done buying power bank', context);
    expect(one.tasks.complete).toHaveBeenCalledWith(
      context.userId,
      'task-1',
      context.now,
    );

    const many = setup({
      intent: AssistantIntent.COMPLETE_TASK,
      query: { text: 'buy' },
    });
    many.tasks.findOpenMatches.mockResolvedValue([
      { id: '1', title: 'Buy power bank' },
      { id: '2', title: 'Buy gift' },
    ]);
    const reply = await many.service.handleMessage('done buying', context);
    expect(reply.text).toContain('Which task');
    expect(many.tasks.complete).not.toHaveBeenCalled();
  });

  it('falls through unknown input and rejects past reminders without writes', async () => {
    const unknown = setup({ intent: AssistantIntent.UNKNOWN, confidence: 99 });
    await expect(
      unknown.service.handleMessage('hello', context),
    ).resolves.toEqual({ consumed: false });

    const past = setup({
      intent: AssistantIntent.CREATE_REMINDER,
      reminder: {
        message: 'Old reminder',
        remindAt: '2026-09-13T03:00:00.000Z',
      },
    });
    await expect(
      past.service.handleMessage('remind yesterday', context),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(past.reminders.create).not.toHaveBeenCalled();
  });
});
