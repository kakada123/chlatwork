export const PREP_CATEGORIES = [
  "RESEARCH",
  "MEETING",
  "PROJECT",
  "EVENT",
  "VIDEO",
  "TRAVEL",
  "PERSONAL",
  "OTHER",
] as const;
export const PREP_STATUSES = [
  "DRAFT",
  "PREPARING",
  "READY",
  "COMPLETED",
  "ARCHIVED",
] as const;
export const PREP_TYPES = [
  "CHECKLIST",
  "RESEARCH",
  "NOTES",
  "LINKS",
  "ATTACHMENTS",
  "QUESTIONS",
  "AGENDA",
  "DELIVERABLES",
] as const;
export type PrepType = (typeof PREP_TYPES)[number];
export interface PrepProgress {
  total: number;
  completed: number;
  remaining: number;
  percent: number;
  overdue: number;
  unansweredResearch: number;
  unansweredQuestions: number;
  missingDeliverables: number;
}
export interface PrepItem {
  id: string;
  title: string;
  content: string;
  objective: string;
  findings: string;
  sources: string;
  conclusion: string;
  url: string;
  label: string;
  status: string;
  isRequired: boolean;
  isCompleted: boolean;
  dueAt: string | null;
}
export interface PrepResource {
  id: string;
  title: string;
  mimeType: string;
  extension: string;
  fileSize: number;
}
export interface PrepSection {
  id: string;
  title: string;
  type: PrepType;
  items: PrepItem[];
  resources: PrepResource[];
}
export interface PrepReminder {
  id: string;
  remindAt: string;
  dismissedAt: string | null;
}
export interface PrepSubject {
  id: string;
  title: string;
  description: string;
  category: string;
  goal: string;
  status: string;
  priority: string;
  eventAt: string | null;
  deadlineAt: string | null;
  updatedAt: string;
  progress: PrepProgress;
  sections: PrepSection[];
  reminders: PrepReminder[];
}
export interface PrepInbox {
  id: string;
  subjectId: string;
  remindAt: string;
  subject: { title: string };
}
export interface PrepDashboard {
  counts: Record<string, number>;
  upcoming: number;
  overdue: number;
  timeZone: string;
  reminders: PrepInbox[];
}
export interface PrepList {
  subjects: PrepSubject[];
  total: number;
  page: number;
  limit: number;
}

export function instantToInput(instant: string | null, timeZone: string) {
  if (!instant) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const get = (name: string) => parts.find((p) => p.type === name)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function inputToInstant(value: string, timeZone: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Choose a valid date and time.");
  const target = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(target))
    throw new Error("Choose a valid date and time.");
  // Sample the real offsets around this local date, including non-hour DST changes.
  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 12) {
    const sample = target + hours * 3600000;
    const wall = Date.parse(
      instantToInput(new Date(sample).toISOString(), timeZone) + ":00Z",
    );
    offsets.add(wall - sample);
  }
  const candidates = [...offsets]
    .map((offset) => target - offset)
    .filter(
      (instant) =>
        instantToInput(new Date(instant).toISOString(), timeZone) === value,
    );
  if (!candidates.length)
    throw new Error("This local time does not exist. Choose another time.");
  // A repeated wall-clock time consistently selects its earliest occurrence.
  return new Date(Math.min(...candidates)).toISOString();
}
export function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}
export function inlineParts(
  text: string,
): { text: string; type: "text" | "strong" | "em" | "code" }[] {
  return text
    .split(/(\*\*[^*\n]+\*\*|_[^_\n]+_|`[^`\n]+`)/g)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return { text: part.slice(2, -2), type: "strong" };
      if (part.startsWith("_") && part.endsWith("_"))
        return { text: part.slice(1, -1), type: "em" };
      if (part.startsWith("`") && part.endsWith("`"))
        return { text: part.slice(1, -1), type: "code" };
      return { text: part, type: "text" };
    });
}
export type PrepMutation = (
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: Record<string, unknown> | FormData,
) => Promise<boolean>;

export interface PrepSharing {
  enabled: boolean;
  token: string | null;
  includeAttachments: boolean;
  sharedAt: string | null;
}
export interface PrepSharedSubject extends Omit<PrepSubject, "reminders"> {
  timeZone: string;
  includeAttachments: boolean;
}

export type PrepNotebookArea = "checklist" | "materials" | "questions";
/** Group for display only; keep original sections, item identities and saved order intact. */
export function notebookGroups(sections: readonly PrepSection[]) {
  const groups: Record<PrepNotebookArea, PrepSection[]> = {
    checklist: [],
    materials: [],
    questions: [],
  };
  for (const section of sections) {
    const area = ["CHECKLIST", "DELIVERABLES"].includes(section.type)
      ? "checklist"
      : ["QUESTIONS", "RESEARCH"].includes(section.type)
        ? "questions"
        : "materials";
    groups[area].push(section);
  }
  return groups;
}
export function notebookCaptureLabel(type: PrepType) {
  const labels: Partial<Record<PrepType, string>> = {
    CHECKLIST: "task",
    NOTES: "note",
    ATTACHMENTS: "file",
    LINKS: "link",
    QUESTIONS: "question",
  };
  return labels[type] ? `prephub.notebook.${labels[type]}` : `prephub.${type}`;
}
