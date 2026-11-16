import { BadRequestException } from '@nestjs/common';
export const TASK_STATUSES = [
  'INBOX',
  'PLANNED',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'ARCHIVED',
] as const;
export const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export const PROJECT_STATUSES = ['ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;
export const OBJECTIVE_STATUSES = [
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED',
] as const;
export const taskDoneWhere = {
  OR: [{ status: 'DONE' }, { status: 'ARCHIVED', previousStatus: 'DONE' }],
};
export function validTitle(title: string) {
  if (typeof title !== 'string' || !title.trim())
    throw new BadRequestException('A title is required.');
  return title.trim();
}
export function instant(value: string | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(date.getTime()))
    throw new BadRequestException(
      'Use an ISO date and time with a UTC offset.',
    );
  return date;
}
export function calendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new BadRequestException('Choose a valid calendar date.');
  return date;
}
export function localDay(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (key: string) => parts.find((p) => p.type === key)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function midnight(day: string, timeZone: string) {
  const target = calendarDate(day).getTime();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const offsets = new Set<number>();
  for (let h = -48; h <= 48; h += 12) {
    const sample = target + h * 3600000,
      parts = formatter.formatToParts(new Date(sample));
    const get = (key: string) => parts.find((p) => p.type === key)!.value;
    offsets.add(
      Date.parse(
        `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:00Z`,
      ) - sample,
    );
  }
  const candidates = [...offsets]
    .map((offset) => target - offset)
    .filter(
      (t) =>
        localDay(new Date(t), timeZone) === day &&
        formatter.formatToParts(new Date(t)).find((p) => p.type === 'hour')!
          .value === '00',
    );
  // Some zones skip midnight. The first existing minute of that local day is the date boundary.
  if (!candidates.length) {
    for (let minute = 0; minute <= 2880; minute++) {
      const t = target - 24 * 3600000 + minute * 60000;
      if (localDay(new Date(t), timeZone) === day) return new Date(t);
    }
    throw new BadRequestException(
      'This calendar date does not exist in the selected time zone.',
    );
  }
  return new Date(Math.min(...candidates));
}
export function periodBounds(from: string, to: string, timeZone: string) {
  const startDay = calendarDate(from),
    endDay = calendarDate(to);
  if (
    startDay > endDay ||
    endDay.getTime() - startDay.getTime() > 366 * 5 * 86400000
  )
    throw new BadRequestException(
      'Choose an ordered evaluation period of five years or less.',
    );
  endDay.setUTCDate(endDay.getUTCDate() + 1);
  return {
    start: midnight(from, timeZone),
    end: midnight(endDay.toISOString().slice(0, 10), timeZone),
  };
}
export function currentDone(task: {
  status?: string;
  previousStatus?: string | null;
}) {
  return (
    task.status === 'DONE' ||
    (task.status === 'ARCHIVED' && task.previousStatus === 'DONE')
  );
}
export function completionChange(
  current: {
    status?: string;
    previousStatus?: string | null;
    completedAt?: Date | null;
    archivedAt?: Date | null;
  },
  input: { status?: string; completedAt?: string | null },
  now = new Date(),
) {
  const status = input.status ?? current.status ?? 'INBOX';
  const previousStatus =
    status === 'ARCHIVED'
      ? current.status === 'ARCHIVED'
        ? (current.previousStatus ?? 'INBOX')
        : (current.status ?? 'INBOX')
      : null;
  const before = currentDone(current),
    after = currentDone({ status, previousStatus });
  if (input.completedAt !== undefined && !after)
    throw new BadRequestException(
      'Only completed work can have a completion date.',
    );
  const completedAt = after
    ? input.completedAt !== undefined
      ? instant(input.completedAt)
      : (current.completedAt ?? now)
    : null;
  if (after && (!completedAt || completedAt > now))
    throw new BadRequestException(
      'Completion must be an actual date and time, not a future claim.',
    );
  const event =
    after && !before
      ? 'COMPLETED'
      : before && !after
        ? 'REOPENED'
        : after &&
            input.completedAt !== undefined &&
            completedAt?.getTime() !== current.completedAt?.getTime()
          ? 'COMPLETION_CORRECTED'
          : null;
  return {
    status,
    previousStatus,
    completedAt,
    archivedAt: status === 'ARCHIVED' ? (current.archivedAt ?? now) : null,
    event,
  };
}
export interface ReportTaskInput {
  id: string;
  title?: string;
  status: string;
  previousStatus?: string | null;
  completedAt?: Date | string | null;
  description?: string;
  summary?: string;
  contribution?: string;
  impact?: string;
  evidence?: string[];
  skills?: string;
  notes?: string;
  category?: string;
  priority?: string;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  highlighted?: boolean;
  isMilestone?: boolean;
  tags?: string[];
  startAt?: Date | string | null;
  dueAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  project?: { id: string; name: string } | null;
  objectives?: { objective: { id: string; title: string } }[];
}
export function buildReportData(
  tasks: ReportTaskInput[],
  objectives: Record<string, unknown>[],
  followUps: Record<string, unknown>[],
) {
  // A task remains one contribution even when several objective links match the report filter.
  const unique = [
    ...new Map(
      tasks.filter(currentDone).map((task) => [task.id, task]),
    ).values(),
  ];
  return {
    contributions: unique.map((task) => ({
      id: task.id,
      status: task.status,
      previousStatus: task.previousStatus ?? null,
      startAt: task.startAt ?? null,
      dueAt: task.dueAt ?? null,
      createdAt: task.createdAt ?? null,
      updatedAt: task.updatedAt ?? null,
      tags: task.tags ?? [],
      isMilestone: task.isMilestone ?? false,
      title: task.title ?? '',
      description: task.description ?? '',
      summary: task.summary ?? '',
      contribution: task.contribution ?? '',
      impact: task.impact ?? '',
      evidence: task.evidence ?? [],
      skills: task.skills ?? '',
      notes: task.notes ?? '',
      category: task.category ?? '',
      priority: task.priority ?? '',
      completedAt: task.completedAt,
      estimatedMinutes: task.estimatedMinutes ?? null,
      actualMinutes: task.actualMinutes ?? null,
      highlighted: task.highlighted ?? false,
      projectName: task.project?.name ?? '',
      objectiveIds: (task.objectives ?? []).map((link) => link.objective.id),
      objectiveTitles: (task.objectives ?? []).map(
        (link) => link.objective.title,
      ),
    })),
    objectives,
    followUps,
  };
}
