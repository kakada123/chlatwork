export type AnalyticsRange = "7d" | "30d" | "90d";

export type AdminUserSummary = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export type DailyAdminActivity = {
  date: string;
  opens: number;
  completions: number;
  activeUsers: number;
};

export type AdminAnalytics = {
  range: AnalyticsRange;
  generatedAt: string;
  overview: {
    totalUsers: number;
    activeUsers: number;
    toolOpens: number;
    completions: number;
    newUsers: number;
  };
  dailyActivity: DailyAdminActivity[];
  topTools: Array<{
    toolKey: string;
    opens: number;
    completions: number;
    uniqueUsers: number;
    lastUsedAt: string | null;
  }>;
  topUsers: Array<AdminUserSummary & { activityCount: number; lastActiveAt: string | null }>;
  recentActivity: Array<{
    id: string;
    toolKey: string;
    event: string;
    createdAt: string;
    user: AdminUserSummary;
  }>;
};
