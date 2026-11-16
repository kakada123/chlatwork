import { completionChange, currentDone, periodBounds, buildReportData, validTitle } from './work-tasks.domain';

describe('ChlatWork Tasks completion and evaluation rules', () => {
  const now = new Date('2026-11-16T10:00:00Z');
  it('records actual backdated completion and refuses future claims', () => {
    expect(completionChange({ status: 'INBOX', completedAt: null, previousStatus: null }, { status: 'DONE', completedAt: '2026-11-01T08:00:00Z' }, now)).toMatchObject({ completedAt: new Date('2026-11-01T08:00:00Z'), event: 'COMPLETED' });
    expect(() => completionChange({ status: 'INBOX' }, { status: 'DONE', completedAt: '2027-01-01T00:00:00Z' }, now)).toThrow();
  });
  it('preserves completion on archive and clears current completion on reopen', () => {
    const done = { status: 'DONE', completedAt: new Date('2026-11-01'), previousStatus: null };
    const archived = completionChange(done, { status: 'ARCHIVED' }, now);
    expect(archived.completedAt).toEqual(done.completedAt); expect(archived.previousStatus).toBe('DONE');
    expect(currentDone({ ...done, ...archived })).toBe(true);
    expect(completionChange(done, { status: 'PLANNED' }, now)).toMatchObject({ completedAt: null, event: 'REOPENED' });
  });
  it('does not fabricate a second completion event on repeated Done updates', () => {
    expect(completionChange({ status: 'DONE', completedAt: now }, { status: 'DONE' }, now).event).toBeNull();
  });
  it('uses inclusive local dates and an exclusive next-day boundary across DST', () => {
    const p = periodBounds('2026-03-08', '2026-03-08', 'America/New_York');
    expect(p.start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-03-09T04:00:00.000Z');
    expect(() => periodBounds('2026-02-30', '2026-03-01', 'Asia/Phnom_Penh')).toThrow();
    expect(() => validTitle('  ')).toThrow();
  });
  it('deduplicates multi-objective contributions and leaves absent outcomes unclaimed', () => {
    const task = { id: 't', title: 'POS fix', status: 'DONE', completedAt: now, impact: '', objectives: [{ objective: { id: 'o1', title: 'Reliability' } }, { objective: { id: 'o2', title: 'Quality' } }] };
    const data = buildReportData([task, task, { id: 'open', status: 'PLANNED' }], [], []);
    expect(data.contributions).toHaveLength(1); expect(data.contributions[0].impact).toBe('');
    expect(data.contributions[0].objectiveTitles).toEqual(['Reliability', 'Quality']);
  });
});
