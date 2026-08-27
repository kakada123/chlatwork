import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AnalyticsRange = '7d' | '30d' | '90d';

type DailyActivityRow = {
  day: Date;
  opens: bigint;
  completions: bigint;
  activeUsers: bigint;
};

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(range: AnalyticsRange) {
    const days = RANGE_DAYS[range];
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const [
      totalUsers,
      activeUserRows,
      toolOpens,
      completions,
      newUsers,
      topToolRows,
      completionRows,
      topUserRows,
      recentEvents,
      dailyRows,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.toolUsageEvent.findMany({
        where: { createdAt: { gte: since } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.toolUsageEvent.count({
        where: { event: 'OPEN', createdAt: { gte: since } },
      }),
      this.prisma.toolUsageEvent.count({
        where: { event: 'COMPLETE', createdAt: { gte: since } },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: since } } }),
      this.prisma.toolUsageEvent.groupBy({
        by: ['toolKey'],
        where: { event: 'OPEN', createdAt: { gte: since } },
        _count: { _all: true },
        _max: { createdAt: true },
        orderBy: { _count: { toolKey: 'desc' } },
        take: 10,
      }),
      this.prisma.toolUsageEvent.groupBy({
        by: ['toolKey'],
        where: { event: 'COMPLETE', createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.toolUsageEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        _max: { createdAt: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 8,
      }),
      this.prisma.toolUsageEvent.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          toolKey: true,
          event: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.$queryRaw<DailyActivityRow[]>(Prisma.sql`
        SELECT
          date_trunc('day', "createdAt") AS day,
          COUNT(*) FILTER (WHERE event = 'OPEN') AS opens,
          COUNT(*) FILTER (WHERE event = 'COMPLETE') AS completions,
          COUNT(DISTINCT "userId") AS "activeUsers"
        FROM tool_usage_events
        WHERE "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
    ]);

    const topToolKeys = topToolRows.map((item) => item.toolKey);
    const [toolUserRows, topUsers] = await Promise.all([
      this.prisma.toolUsageEvent.findMany({
        where: {
          event: 'OPEN',
          createdAt: { gte: since },
          toolKey: { in: topToolKeys },
        },
        distinct: ['toolKey', 'userId'],
        select: { toolKey: true, userId: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: topUserRows.map((item) => item.userId) } },
        select: { id: true, name: true, email: true, avatarUrl: true },
      }),
    ]);

    const completionCounts = new Map(
      completionRows.map((item) => [item.toolKey, item._count._all]),
    );
    const uniqueUsersByTool = new Map<string, number>();
    for (const item of toolUserRows) {
      uniqueUsersByTool.set(item.toolKey, (uniqueUsersByTool.get(item.toolKey) ?? 0) + 1);
    }
    const usersById = new Map(topUsers.map((user) => [user.id, user]));

    return {
      range,
      generatedAt: new Date(),
      overview: {
        totalUsers,
        activeUsers: activeUserRows.length,
        toolOpens,
        completions,
        newUsers,
      },
      dailyActivity: this.fillDailyActivity(since, days, dailyRows),
      topTools: topToolRows.map((item) => ({
        toolKey: item.toolKey,
        opens: item._count._all,
        completions: completionCounts.get(item.toolKey) ?? 0,
        uniqueUsers: uniqueUsersByTool.get(item.toolKey) ?? 0,
        lastUsedAt: item._max.createdAt,
      })),
      topUsers: topUserRows.flatMap((item) => {
        const user = usersById.get(item.userId);
        return user
          ? [{ ...user, activityCount: item._count._all, lastActiveAt: item._max.createdAt }]
          : [];
      }),
      recentActivity: recentEvents,
    };
  }

  private fillDailyActivity(since: Date, days: number, rows: DailyActivityRow[]) {
    const rowsByDay = new Map(
      rows.map((row) => [row.day.toISOString().slice(0, 10), row]),
    );

    return Array.from({ length: days }, (_, index) => {
      const day = new Date(since);
      day.setUTCDate(day.getUTCDate() + index);
      const date = day.toISOString().slice(0, 10);
      const row = rowsByDay.get(date);
      return {
        date,
        opens: Number(row?.opens ?? 0),
        completions: Number(row?.completions ?? 0),
        activeUsers: Number(row?.activeUsers ?? 0),
      };
    });
  }
}
