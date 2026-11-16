import { instantToInput, inputToInstant, safeExternalUrl } from "./prephub.ts";
export { instantToInput, inputToInstant, safeExternalUrl };
export const TASK_STATUSES = [
  "INBOX",
  "PLANNED",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "ARCHIVED",
] as const;
export const TASK_VIEWS = [
  "overview",
  "tasks",
  "work-log",
  "projects",
  "follow-ups",
  "objectives",
  "achievements",
  "reports",
  "archive",
] as const;
export type TaskView = (typeof TASK_VIEWS)[number];
export interface TaskObjective {
  id: string;
  title: string;
  description: string;
  periodStart: string;
  periodEnd: string;
  successCriteria: string;
  targetValue: string | null;
  actualValue: string | null;
  metricUnit: string;
  verifiedAt: string | null;
  verificationEvidence: string;
  status: string;
  linkedTasks: number;
  completedContributions: number;
  projects?: { project: { id: string; name: string } }[];
}
export interface TaskProject {
  id: string;
  name: string;
  description: string;
  color: string;
  status: string;
  targetDate: string | null;
  notes: string;
  objectives: { objective: { id: string; title: string } }[];
  _count: { tasks: number };
}
export interface TaskFollowUp {
  id: string;
  taskId: string;
  followUpAt: string;
  note: string;
  nextAction: string;
  remindAt: string | null;
  dismissedAt: string | null;
  resolvedAt: string | null;
  task?: { id: string; title: string; status: string };
}
export interface TaskAttachment {
  id: string;
  title: string;
  extension: string;
  mimeType: string;
  fileSize: number;
}
export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  previousStatus: string | null;
  priority: string;
  category: string;
  projectId: string | null;
  project: { id: string; name: string; color: string } | null;
  startAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  notes: string;
  tags: string[];
  evidence: string[];
  summary: string;
  contribution: string;
  impact: string;
  skills: string;
  highlighted: boolean;
  createdAt: string;
  updatedAt: string;
  objectives: { objective: { id: string; title: string } }[];
  subtasks: { id: string; title: string; completedAt: string | null }[];
  followUps: TaskFollowUp[];
  attachments: TaskAttachment[];
}
export interface TaskCatalog {
  timeZone: string;
  projects: TaskProject[];
  objectives: TaskObjective[];
}
export interface TaskPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface TaskDashboard {
  timeZone: string;
  from: string;
  to: string;
  counts: Record<string, number>;
  dueToday: number;
  overdue: number;
  completed: number;
  accomplishments: TaskRecord[];
  followUps: TaskPage<TaskFollowUp>;
  objectives: TaskObjective[];
  weekly: {
    from: string;
    to: string;
    total: number;
    byDay: Record<string, number>;
    byCategory: Record<string, number>;
    byProject: Record<string, number>;
    objectiveLinked: number;
    actualMinutes: number;
    estimatedMinutes: number;
  };
}
export interface TaskReportDraft {
  title: string;
  employeeName: string;
  from: string;
  to: string;
  summary: string;
  challenges: string;
  lessons: string;
  priorities: string;
  projectId: string | null;
  objectiveId: string | null;
  category: string;
  status: string;
}
export interface TaskContribution {
  id: string;
  title: string;
  description: string;
  summary: string;
  contribution: string;
  impact: string;
  evidence: string[];
  skills: string;
  notes: string;
  category: string;
  priority: string;
  completedAt: string;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  highlighted: boolean;
  projectName: string;
  objectiveIds: string[];
  objectiveTitles: string[];
}
export interface TaskReport {
  draft: TaskReportDraft;
  timeZone: string;
  generatedAt: string;
  contributions: TaskContribution[];
  objectives: (TaskObjective & { completedContributions: number })[];
  followUps: (TaskFollowUp & { title: string })[];
}
export type TaskMutate = <T = unknown>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown> | FormData,
) => Promise<T | undefined>;
export function isTaskDone(task: {
  status: string;
  previousStatus?: string | null;
}) {
  return (
    task.status === "DONE" ||
    (task.status === "ARCHIVED" && task.previousStatus === "DONE")
  );
}
export function dateInZone(instant: string, timeZone: string) {
  return instantToInput(instant, timeZone).slice(0, 10);
}
export function evaluationPeriod(
  mode: string,
  timeZone: string,
  now = new Date(),
) {
  const today = dateInZone(now.toISOString(), timeZone),
    date = new Date(today + "T00:00:00Z");
  if (mode === "today") return { from: today, to: today };
  if (mode === "week") {
    const end = new Date(date);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    end.setTime(date.getTime() + 6 * 86400000);
    return {
      from: date.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
    };
  }
  const quarter = mode === "quarter";
  const month = quarter
    ? Math.floor(date.getUTCMonth() / 3) * 3
    : date.getUTCMonth();
  return {
    from: new Date(Date.UTC(date.getUTCFullYear(), month, 1))
      .toISOString()
      .slice(0, 10),
    to: new Date(Date.UTC(date.getUTCFullYear(), month + (quarter ? 3 : 1), 0))
      .toISOString()
      .slice(0, 10),
  };
}
export function groupTaskRecords(
  tasks: TaskRecord[],
  group: string,
  timeZone: string,
): [string, TaskRecord[]][] {
  const groups = new Map<string, TaskRecord[]>();
  for (const task of tasks) {
    let key = "";
    if (group === "status") key = task.status;
    else if (group === "project") key = task.project?.name ?? "";
    else if (group === "category") key = task.category;
    else if (group === "objective")
      key = task.objectives.map((o) => o.objective.title).join(" · ");
    else if (["day", "week", "month"].includes(group) && task.completedAt) {
      const day = dateInZone(task.completedAt, timeZone);
      key =
        group === "day"
          ? day
          : group === "month"
            ? day.slice(0, 7)
            : evaluationPeriod("week", timeZone, new Date(task.completedAt))
                .from;
    }
    (groups.get(key) ?? (groups.set(key, []), groups.get(key)!)).push(task);
  }
  return [...groups.entries()];
}
export type TaskRequest = <T>(
  path: string,
  options?: { query?: Record<string, unknown> },
) => Promise<T>;
