import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { MomentsService } from "../moments/moments.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { TelegramBotClient } from "./telegram-bot.client";
import { DailyMomentVoteScheduler } from "./daily-moment-vote.scheduler";

describe("DailyMomentVoteScheduler", () => {
  it.each(["group-policy", "round-start", "telegram-send"])(
    "identifies a %s failure without logging provider or group data",
    async (stage) => {
      const warning = jest.spyOn(Logger.prototype, "warn").mockImplementation();
      const failure = new Error("private provider details for chat -100123");
      const policy = { chat: jest.fn().mockResolvedValue({}) };
      const moments = {
        startTelegramVoteRound: jest.fn().mockResolvedValue({
          id: "moment",
          slug: "lunch",
          title: "Lunch",
          identityMode: "ANONYMOUS",
          results: [],
        }),
      };
      const bot = {
        sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
      };
      const prisma = {
        $queryRaw: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              scheduleId: "schedule",
              momentId: "moment",
              telegramChatId: "-100123",
            },
          ]),
        momentVoteSchedule: { update: jest.fn() },
      };
      if (stage === "group-policy") policy.chat.mockRejectedValueOnce(failure);
      if (stage === "round-start")
        moments.startTelegramVoteRound.mockRejectedValueOnce(failure);
      if (stage === "telegram-send")
        bot.sendMessage.mockRejectedValueOnce(failure);
      const scheduler = new DailyMomentVoteScheduler(
        prisma as never,
        { getOrThrow: () => "https://example.test" } as never,
        bot as never,
        moments as never,
        undefined,
        policy as never,
      );
      try {
        await scheduler.runOnce();
        expect(warning).toHaveBeenCalledWith(
          `A daily Moment vote could not be delivered (stage=${stage})`,
        );
        expect(JSON.stringify(warning.mock.calls)).not.toMatch(
          /private provider|-100123/,
        );
        expect(prisma.momentVoteSchedule.update).not.toHaveBeenCalled();
      } finally {
        warning.mockRestore();
      }
    },
  );

  it("sends each claimed poll and records successful delivery", async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValue([
          {
            scheduleId: "00000000-0000-4000-8000-000000000010",
            momentId: "00000000-0000-4000-8000-000000000001",
            telegramChatId: "-1001234567890",
          },
        ]),
      momentVoteSchedule: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue("https://chlatwork.com"),
    };
    const poll = {
      id: "00000000-0000-4000-8000-000000000001",
      slug: "team-lunch",
      title: "Team lunch",
      question: "Where should we eat?",
      identityMode: "NAME_REQUIRED" as const,
      voteDate: "2026-09-04",
      totalVotes: 0,
      results: [
        { optionId: "option-1", label: "Khmer food", votes: 0, voters: [] },
        { optionId: "option-2", label: "Pizza", votes: 0, voters: [] },
      ],
    };
    const moments = {
      startTelegramVoteRound: jest.fn().mockResolvedValue(poll),
    };
    const bot = { sendMessage: jest.fn().mockResolvedValue({}) };
    const scheduler = new DailyMomentVoteScheduler(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
      bot as unknown as TelegramBotClient,
      moments as unknown as MomentsService,
    );

    await expect(
      scheduler.runOnce(new Date("2026-09-04T03:00:00.000Z")),
    ).resolves.toBe(1);
    expect(bot.sendMessage).toHaveBeenCalledWith(
      -1001234567890,
      "🗳 Team lunch",
      expect.objectContaining({ inline_keyboard: expect.any(Array) }),
    );
    expect(prisma.momentVoteSchedule.update).toHaveBeenCalledWith({
      where: { id: "00000000-0000-4000-8000-000000000010" },
      data: { lastSentAt: expect.any(Date) },
    });
  });
});

describe("Daily vote timer finalization", () => {
  const roundId = "00000000-0000-4000-8000-000000000003";
  const deadline = new Date("2026-09-08T03:30:00Z");
  function setup(failEdit = false) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          telegramChatId: -100n,
          messageId: 88 as number | null,
          closesAt: deadline,
        },
      ]),
      $executeRaw: jest.fn(),
    };
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ id: roundId }])
        .mockResolvedValue([]),
      $transaction: jest.fn().mockImplementation((work) => work(tx)),
    };
    const bot = {
      editMessage: failEdit
        ? jest.fn().mockRejectedValue(new Error("Unavailable"))
        : jest.fn(),
      sendMessage: jest.fn(),
      sendPhoto: jest.fn().mockResolvedValue({ message_id: 99 }),
      sendAnimation: jest.fn().mockResolvedValue({ message_id: 99 }),
    };
    const moments = {
      getTelegramVoteRoundResults: jest.fn().mockResolvedValue({
        id: "moment",
        slug: "lunch",
        title: "Lunch",
        question: "Lunch?",
        roundId,
        closesAt: deadline.toISOString(),
        identityMode: "ANONYMOUS",
        totalVotes: 3,
        participants: ["Sokha"],
        results: [{ optionId: "option-1", label: "Pizza", votes: 3 }],
      }),
    };
    const scheduler = new DailyMomentVoteScheduler(
      prisma as never,
      { getOrThrow: () => "https://example.com" } as never,
      bot as never,
      moments as never,
    );
    return { tx, prisma, bot, moments, scheduler };
  }
  it("edits the tracked message into a celebration and records final delivery", async () => {
    const { tx, bot, scheduler } = setup();
    await scheduler.runOnce(deadline);
    expect(bot.editMessage).toHaveBeenCalledWith(
      -100,
      88,
      expect.stringContaining("🏆 Winner: Pizza"),
      {
        inline_keyboard: [
          [{ text: "Details", url: "https://example.com/m/lunch" }],
        ],
      },
    );
    expect(tx.$executeRaw.mock.calls[0][0].join("")).toContain(
      "SET finalized_at",
    );
    expect(bot.sendMessage).not.toHaveBeenCalled();
    expect(bot.sendAnimation).toHaveBeenCalledWith(
      -100,
      "https://example.com/images/telegram/vote-celebration.gif",
      88,
    );
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      bot.sendAnimation.mock.invocationCallOrder[0]!,
    );
    await scheduler.runOnce(deadline);
    expect(bot.sendAnimation).toHaveBeenCalledTimes(1);
  });
  it("sends the single winner image in place of the celebration animation", async () => {
    const { scheduler, moments, bot } = setup();
    moments.getTelegramVoteRoundResults.mockResolvedValue({
      id: "moment",
      slug: "lunch",
      title: "Lunch",
      question: "Lunch?",
      roundId,
      closesAt: deadline.toISOString(),
      identityMode: "ANONYMOUS",
      totalVotes: 3,
      results: [
        {
          optionId: "option-1",
          label: "Pizza",
          votes: 3,
          imageId: "00000000-0000-4000-8000-000000000009",
        },
      ],
    });
    await scheduler.runOnce(deadline);
    expect(bot.sendPhoto).toHaveBeenCalledWith(
      -100,
      "https://example.com/api/moments/lunch/media/00000000-0000-4000-8000-000000000009?format=jpeg",
      "🏆 Winner: Pizza",
      88,
    );
    expect(bot.sendAnimation).not.toHaveBeenCalled();
  });
  it("leaves failed final edits retryable without marking delivery complete", async () => {
    const { tx, bot, scheduler } = setup(true);
    await scheduler.runOnce(deadline);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(bot.sendAnimation).not.toHaveBeenCalled();
  });
  it("propagates manual publication failures so the command can retry", async () => {
    const { tx, scheduler } = setup(true);
    await expect(scheduler.refreshRound(roundId, deadline)).rejects.toThrow(
      "Unavailable",
    );
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it("reuses the persisted poll message when a manual start follows a scheduler send", async () => {
    const { bot, scheduler } = setup();
    await scheduler.refreshRound(roundId, new Date("2026-09-08T03:00:00Z"));
    await scheduler.refreshRound(roundId, new Date("2026-09-08T03:00:00Z"));
    expect(bot.editMessage).toHaveBeenCalledTimes(2);
    expect(bot.sendMessage).not.toHaveBeenCalled();
  });
  it("skips a round already claimed or completed by another replica", async () => {
    const { tx, bot, scheduler } = setup();
    tx.$queryRaw.mockResolvedValue([]);
    await scheduler.runOnce(deadline);
    expect(bot.editMessage).not.toHaveBeenCalled();
    expect(bot.sendAnimation).not.toHaveBeenCalled();
  });

  it("does not celebrate an open round or a round with no votes", async () => {
    const open = setup();
    await open.scheduler.runOnce(new Date(deadline.getTime() - 60_000));
    expect(open.bot.sendAnimation).not.toHaveBeenCalled();
    expect(open.tx.$executeRaw).not.toHaveBeenCalled();

    const empty = setup();
    const poll = await empty.moments.getTelegramVoteRoundResults();
    empty.moments.getTelegramVoteRoundResults.mockResolvedValue({
      ...poll,
      totalVotes: 0,
      results: [{ optionId: "option-1", label: "Pizza", votes: 0 }],
    });
    await empty.scheduler.runOnce(deadline);
    expect(empty.tx.$executeRaw).toHaveBeenCalled();
    expect(empty.bot.sendAnimation).not.toHaveBeenCalled();
  });

  it("keeps finalization complete when animation delivery fails", async () => {
    const { tx, bot, scheduler } = setup();
    bot.sendAnimation.mockRejectedValue(new Error("Unavailable"));
    await scheduler.runOnce(deadline);
    expect(tx.$executeRaw.mock.calls[0][0].join("")).toContain(
      "SET finalized_at",
    );
    await scheduler.runOnce(deadline);
    expect(bot.sendAnimation).toHaveBeenCalledTimes(1);
  });

  it("does not send an animation if the finalization transaction fails to commit", async () => {
    const { prisma, bot, scheduler } = setup();
    const transaction = prisma.$transaction.getMockImplementation()!;
    prisma.$transaction.mockImplementation(async (work) => {
      await transaction(work);
      throw new Error("Commit failed");
    });
    await scheduler.runOnce(deadline);
    expect(bot.sendAnimation).not.toHaveBeenCalled();
  });

  it("replies to the recovered final message when initial delivery was missing", async () => {
    const { tx, bot, scheduler } = setup();
    tx.$queryRaw.mockResolvedValue([
      { telegramChatId: -100n, messageId: null, closesAt: deadline },
    ]);
    bot.sendMessage.mockResolvedValue({ message_id: 123 });
    await scheduler.runOnce(deadline);
    expect(bot.sendAnimation).toHaveBeenCalledWith(
      -100,
      "https://example.com/images/telegram/vote-celebration.gif",
      123,
    );
  });
});

describe("workspace delivery revocation", () => {
  it("does not deliver to a removed or migrated old chat after starting its round", async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            momentId: "moment",
            telegramChatId: "-1001",
            scheduleId: "schedule",
          },
        ]),
    };
    const bot = { sendMessage: jest.fn() };
    const moments = {
      startTelegramVoteRound: jest.fn().mockResolvedValue({
        id: "moment",
        slug: "private",
        groupWorkspaceId: "A",
      }),
    };
    const policy = {
      chat: jest
        .fn()
        .mockResolvedValueOnce({ workspaceId: "A" })
        .mockRejectedValueOnce(new Error("migrated")),
    };
    const scheduler = new DailyMomentVoteScheduler(
      prisma as never,
      { getOrThrow: () => "https://example.test" } as never,
      bot as never,
      moments as never,
      undefined,
      policy as never,
    );
    await scheduler.runOnce();
    expect(moments.startTelegramVoteRound).toHaveBeenCalled();
    expect(bot.sendMessage).not.toHaveBeenCalled();
  });
});

describe("previous daily poll message cleanup", () => {
  const roundId = "00000000-0000-4000-8000-000000000011";
  const oldRoundId = "00000000-0000-4000-8000-000000000010";
  const momentId = "00000000-0000-4000-8000-000000000001";
  const now = new Date("2026-10-28T04:15:00Z");

  function setup() {
    const events: string[] = [];
    const tx = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([
          {
            telegramChatId: -100n,
            messageId: null,
            closesAt: new Date("2026-10-28T04:45:00Z"),
          },
        ]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (work) => {
        const result = await work(tx);
        events.push("commit");
        return result;
      }),
      momentVoteRound: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: oldRoundId, messageId: 88 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const bot = {
      sendMessage: jest.fn().mockImplementation(async () => {
        events.push("send");
        return { message_id: 123 };
      }),
      editMessage: jest.fn(),
      deleteMessage: jest.fn().mockImplementation(async () => {
        events.push("delete");
        return true;
      }),
    };
    const moments = {
      getTelegramVoteRoundResults: jest.fn().mockResolvedValue({
        id: momentId,
        slug: "lunch",
        title: "Lunch",
        question: "Lunch?",
        roundId,
        voteDate: "2026-10-28",
        identityMode: "ANONYMOUS",
        totalVotes: 0,
        results: [],
      }),
    };
    const scheduler = new DailyMomentVoteScheduler(
      prisma as never,
      { getOrThrow: () => "https://example.test" } as never,
      bot as never,
      moments as never,
    );
    return { tx, prisma, bot, moments, scheduler, events };
  }

  it("removes only the previous completed same-poll same-chat message after the replacement commits", async () => {
    const { scheduler, prisma, bot, events } = setup();
    await scheduler.refreshRound(roundId, now);
    expect(events).toEqual(["send", "commit", "delete"]);
    expect(prisma.momentVoteRound.findFirst).toHaveBeenCalledWith({
      where: {
        momentId,
        telegramChatId: -100n,
        voteDate: { lt: new Date("2026-10-28T00:00:00Z") },
        finalizedAt: { not: null },
        messageId: { not: null },
      },
      orderBy: { voteDate: "desc" },
      select: { id: true, messageId: true },
    });
    expect(bot.deleteMessage).toHaveBeenCalledWith(-100, 88);
    expect(prisma.momentVoteRound.updateMany).toHaveBeenCalledWith({
      where: { id: oldRoundId, telegramChatId: -100n, messageId: 88 },
      data: { messageId: null },
    });
  });

  it("keeps the old poll if sending its replacement fails", async () => {
    const { scheduler, prisma, bot } = setup();
    bot.sendMessage.mockRejectedValueOnce(new Error("Send failed"));
    await expect(scheduler.refreshRound(roundId, now)).rejects.toThrow(
      "Send failed",
    );
    expect(prisma.momentVoteRound.findFirst).not.toHaveBeenCalled();
    expect(bot.deleteMessage).not.toHaveBeenCalled();
  });

  it("keeps the old poll if the replacement transaction does not commit", async () => {
    const { scheduler, prisma, bot, tx } = setup();
    prisma.$transaction.mockImplementationOnce(async (work) => {
      await work(tx);
      throw new Error("Commit failed");
    });
    await expect(scheduler.refreshRound(roundId, now)).rejects.toThrow(
      "Commit failed",
    );
    expect(bot.deleteMessage).not.toHaveBeenCalled();
  });

  it("does not delete anything while merely editing an already published round", async () => {
    const { scheduler, prisma, bot, tx } = setup();
    tx.$queryRaw.mockResolvedValueOnce([
      {
        telegramChatId: -100n,
        messageId: 123,
        closesAt: new Date("2026-10-28T04:45:00Z"),
      },
    ]);
    await scheduler.refreshRound(roundId, now);
    expect(bot.sendMessage).not.toHaveBeenCalled();
    expect(prisma.momentVoteRound.findFirst).not.toHaveBeenCalled();
    expect(bot.deleteMessage).not.toHaveBeenCalled();
  });

  it("leaves successful new delivery intact when Telegram rejects deleting the old poll", async () => {
    const { scheduler, prisma, bot } = setup();
    const warning = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    bot.deleteMessage.mockRejectedValueOnce(
      new Error("private provider details -100"),
    );
    try {
      await expect(
        scheduler.refreshRound(roundId, now),
      ).resolves.toBeUndefined();
      expect(bot.sendMessage).toHaveBeenCalledTimes(1);
      expect(prisma.momentVoteRound.updateMany).not.toHaveBeenCalled();
      expect(warning).toHaveBeenCalledWith(
        "A previous voting message could not be removed",
      );
      expect(JSON.stringify(warning.mock.calls)).not.toMatch(
        /private provider|-100/,
      );
    } finally {
      warning.mockRestore();
    }
  });

  it("never removes the new message if an old record contains the same message ID", async () => {
    const { scheduler, prisma, bot } = setup();
    prisma.momentVoteRound.findFirst.mockResolvedValueOnce({
      id: oldRoundId,
      messageId: 123,
    });
    await scheduler.refreshRound(roundId, now);
    expect(bot.deleteMessage).not.toHaveBeenCalled();
  });
});
