import { BadRequestException } from '@nestjs/common';
import {
  progressFor,
  safeUrl,
  validateUpload,
  templateSections,
  effectiveSchedule,
} from './prephub.domain';

describe('PrepHub preparation rules', () => {
  it('counts only required checklist and deliverable requirements', () => {
    const now = new Date('2026-11-16T10:00:00Z');
    const sections = [
      {
        type: 'CHECKLIST',
        items: [
          { isRequired: true, isCompleted: true },
          {
            isRequired: true,
            isCompleted: false,
            dueAt: new Date('2026-11-15'),
          },
          { isRequired: false, isCompleted: false },
        ],
      },
      {
        type: 'DELIVERABLES',
        items: [{ isRequired: true, isCompleted: false }],
      },
      {
        type: 'RESEARCH',
        items: [
          { status: 'RESEARCHING' },
          { status: 'ANSWERED' },
          { status: 'NEEDS_VERIFICATION' },
        ],
      },
      { type: 'QUESTIONS', items: [{ isCompleted: false }] },
      { type: 'NOTES', items: [{ isRequired: true, isCompleted: true }] },
    ];
    expect(progressFor(sections, now)).toEqual({
      total: 3,
      completed: 1,
      remaining: 2,
      percent: 33,
      overdue: 1,
      unansweredResearch: 2,
      unansweredQuestions: 1,
      missingDeliverables: 1,
    });
    expect(progressFor([], now).percent).toBe(0);
  });
  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    'https://user:password@example.com',
    'file:///etc/passwd',
    'not a url',
  ])('rejects unsafe resource URL %s', (url) => {
    expect(() => safeUrl(url)).toThrow(BadRequestException);
  });
  it('accepts an absolute HTTP resource without fetching it', () => {
    expect(safeUrl('https://example.com/research?q=pos')).toBe(
      'https://example.com/research?q=pos',
    );
  });
  it('validates file signature, extension and bounded size', () => {
    const file = {
      buffer: Buffer.from('%PDF-1.7\n'),
      originalname: 'report.pdf',
      mimetype: 'application/pdf',
    };
    expect(validateUpload(file).mimeType).toBe('application/pdf');
    expect(() =>
      validateUpload({ ...file, originalname: 'report.html' }),
    ).toThrow();
    expect(() =>
      validateUpload({ ...file, buffer: Buffer.from('<script>bad</script>') }),
    ).toThrow();
    expect(() =>
      validateUpload({ ...file, buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }),
    ).toThrow();
  });
  it('provides four independently customizable templates and a blank workspace', () => {
    for (const name of ['RESEARCH', 'MEETING', 'VIDEO', 'GENERAL'])
      expect(templateSections(name).length).toBeGreaterThan(3);
    expect(templateSections('NONE')).toEqual([]);
    expect(
      templateSections('RESEARCH').some((s) => s.type === 'RESEARCH'),
    ).toBe(true);
    expect(() => templateSections('unknown')).toThrow();
  });
  it('allows no schedule and chooses the earlier scheduled commitment', () => {
    expect(effectiveSchedule(null, null)).toBeNull();
    expect(
      effectiveSchedule(new Date('2026-12-02'), new Date('2026-12-01')),
    ).toEqual(new Date('2026-12-01'));
  });
});
