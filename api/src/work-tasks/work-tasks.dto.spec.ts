import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  CreateTaskDto,
  UpdateTaskDto,
  CreateProjectDto,
  ObjectiveDto,
  ReportDto,
} from './work-tasks.dto';
describe('Tasks input validation', () => {
  it('requires create titles without inherited optional validators', () => {
    expect(validateSync(new CreateTaskDto()).map((e) => e.property)).toContain(
      'title',
    );
    expect(
      validateSync(new CreateProjectDto()).map((e) => e.property),
    ).toContain('name');
    expect(validateSync(new UpdateTaskDto())).toHaveLength(0);
  });
  it('rejects fabricated states, cross-layer fields and oversized arrays', () => {
    expect(
      validateSync(
        plainToInstance(CreateTaskDto, { title: 'Task', status: 'PUBLIC' }),
      ),
    ).not.toHaveLength(0);
    expect(
      validateSync(
        plainToInstance(CreateTaskDto, {
          title: 'Task',
          tags: Array.from({ length: 21 }, (_, i) => String(i)),
        }),
      ),
    ).not.toHaveLength(0);
    expect(
      validateSync(plainToInstance(UpdateTaskDto, { title: null })),
    ).not.toHaveLength(0);
  });
  it('rejects invalid report filters and requires objective dates', () => {
    expect(
      validateSync(
        plainToInstance(ReportDto, {
          title: 'Report',
          from: '2026-01-01',
          to: '2026-01-31',
          status: 'APPROVED',
        }),
      ),
    ).not.toHaveLength(0);
    expect(
      validateSync(plainToInstance(ObjectiveDto, { title: 'Reliability' })),
    ).not.toHaveLength(0);
  });
});
