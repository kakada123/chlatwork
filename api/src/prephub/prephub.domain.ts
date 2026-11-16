import { BadRequestException } from '@nestjs/common';

export const CATEGORIES = [
  'RESEARCH',
  'MEETING',
  'PROJECT',
  'EVENT',
  'VIDEO',
  'TRAVEL',
  'PERSONAL',
  'OTHER',
] as const;
export const STATUSES = [
  'DRAFT',
  'PREPARING',
  'READY',
  'COMPLETED',
  'ARCHIVED',
] as const;
export const SECTION_TYPES = [
  'CHECKLIST',
  'RESEARCH',
  'NOTES',
  'LINKS',
  'ATTACHMENTS',
  'QUESTIONS',
  'AGENDA',
  'DELIVERABLES',
] as const;
export const RESEARCH_STATUSES = [
  'TO_RESEARCH',
  'RESEARCHING',
  'ANSWERED',
  'NEEDS_VERIFICATION',
] as const;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
// Busboy emits limit events at the threshold; validation below enforces the inclusive 5 MiB cap.
// files/fields independently enforce one file without extra form fields.
export const PREPHUB_UPLOAD_LIMITS = {
  fileSize: MAX_FILE_BYTES + 1,
  files: 1,
  fields: 0,
  parts: 2,
};
export const MAX_SECTIONS = 32;
export const MAX_ITEMS = 500;
export const MAX_FILES = 20;
export type Upload = { buffer: Buffer; originalname: string; mimetype: string };

type ProgressSection = {
  type: string;
  items: {
    isRequired?: boolean;
    isCompleted?: boolean;
    status?: string;
    dueAt?: Date | string | null;
  }[];
};
export function progressFor(sections: ProgressSection[], now = new Date()) {
  const requirements = sections
    .filter((s) => ['CHECKLIST', 'DELIVERABLES'].includes(s.type))
    .flatMap((s) => s.items)
    .filter((i) => i.isRequired);
  const completed = requirements.filter((i) => i.isCompleted).length;
  return {
    total: requirements.length,
    completed,
    remaining: requirements.length - completed,
    percent: requirements.length
      ? Math.round((completed / requirements.length) * 100)
      : 0,
    overdue: requirements.filter(
      (i) => !i.isCompleted && i.dueAt && new Date(i.dueAt) < now,
    ).length,
    unansweredResearch: sections
      .filter((s) => s.type === 'RESEARCH')
      .flatMap((s) => s.items)
      .filter((i) => i.status !== 'ANSWERED').length,
    unansweredQuestions: sections
      .filter((s) => s.type === 'QUESTIONS')
      .flatMap((s) => s.items)
      .filter((i) => !i.isCompleted).length,
    missingDeliverables: sections
      .filter((s) => s.type === 'DELIVERABLES')
      .flatMap((s) => s.items)
      .filter((i) => i.isRequired && !i.isCompleted).length,
  };
}

export function safeUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      !url.hostname
    )
      throw new Error();
    return url.href;
  } catch {
    throw new BadRequestException(
      'Use an absolute HTTP or HTTPS URL without embedded login details.',
    );
  }
}

export function effectiveSchedule(
  eventAt: Date | null,
  deadlineAt: Date | null,
) {
  if (!eventAt) return deadlineAt;
  if (!deadlineAt) return eventAt;
  return eventAt < deadlineAt ? eventAt : deadlineAt;
}

export function validateUpload(file?: Upload) {
  if (!file?.buffer?.length || file.buffer.length > MAX_FILE_BYTES)
    throw new BadRequestException(
      'Choose a non-empty file of 5 MiB or smaller.',
    );
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  const b = file.buffer;
  const hex = b.subarray(0, 12).toString('hex');
  let mimeType = '';
  if (ext === 'pdf' && b.subarray(0, 5).toString() === '%PDF-')
    mimeType = 'application/pdf';
  if (ext === 'png' && hex.startsWith('89504e470d0a1a0a'))
    mimeType = 'image/png';
  if (['jpg', 'jpeg'].includes(ext ?? '') && hex.startsWith('ffd8ff'))
    mimeType = 'image/jpeg';
  if (
    ext === 'webp' &&
    b.subarray(0, 4).toString() === 'RIFF' &&
    b.subarray(8, 12).toString() === 'WEBP'
  )
    mimeType = 'image/webp';
  // Office containers are downloaded only: never execute, unpack or render user documents on the server.
  const office: Record<string, string> = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  if (ext && office[ext] && hex.startsWith('504b0304')) mimeType = office[ext];
  if (
    ext === 'txt' &&
    !b.includes(0) &&
    Buffer.from(b.toString('utf8'), 'utf8').equals(b)
  )
    mimeType = 'text/plain';
  if (!mimeType)
    throw new BadRequestException(
      'Supported files: PDF, PNG, JPEG, WebP, DOCX, PPTX, XLSX and UTF-8 TXT. The file contents must match its extension.',
    );
  return { mimeType, extension: ext!, fileSize: b.length };
}

export function templateSections(
  name: string,
): { type: string; title: string }[] {
  const templates: Record<string, [string, string][]> = {
    NONE: [],
    RESEARCH: [
      ['NOTES', 'Research objectives'],
      ['RESEARCH', 'Research questions and findings'],
      ['LINKS', 'Sources'],
      ['NOTES', 'Conclusions'],
      ['DELIVERABLES', 'Deliverables'],
    ],
    MEETING: [
      ['AGENDA', 'Agenda and discussion points'],
      ['QUESTIONS', 'Questions'],
      ['ATTACHMENTS', 'Documents'],
      ['CHECKLIST', 'Meeting checklist'],
      ['NOTES', 'Notes'],
    ],
    VIDEO: [
      ['NOTES', 'Concept and script'],
      ['CHECKLIST', 'Equipment'],
      ['NOTES', 'Location'],
      ['AGENDA', 'Shot list'],
      ['CHECKLIST', 'Filming checklist'],
      ['LINKS', 'References'],
    ],
    GENERAL: [
      ['CHECKLIST', 'Checklist'],
      ['NOTES', 'Notes'],
      ['ATTACHMENTS', 'Files'],
      ['LINKS', 'Links'],
    ],
  };
  if (!Object.hasOwn(templates, name))
    throw new BadRequestException('Choose a supported preparation template.');
  return templates[name].map(([type, title]) => ({ type, title }));
}
