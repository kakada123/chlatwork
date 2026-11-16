import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateItemDto,
  CreateSubjectDto,
  ItemDto,
  ListSubjectsDto,
  SubjectDto,
} from './prephub.dto';

describe('PrepHub input validation', () => {
  it.each([CreateSubjectDto, CreateItemDto])(
    'requires a title when creating %p',
    (Dto) => {
      expect(validateSync(new Dto()).map((e) => e.property)).toContain('title');
    },
  );
  it('allows partial updates but rejects null titles and unknown status', () => {
    expect(validateSync(new SubjectDto())).toHaveLength(0);
    expect(validateSync(new ItemDto())).toHaveLength(0);
    expect(
      validateSync(plainToInstance(SubjectDto, { title: null })),
    ).not.toHaveLength(0);
    expect(
      validateSync(plainToInstance(SubjectDto, { status: 'PUBLIC' })),
    ).not.toHaveLength(0);
  });
  it('bounds and transforms pagination and rejects invalid categories', () => {
    const query = plainToInstance(ListSubjectsDto, { page: '2', limit: '20' });
    expect(validateSync(query)).toHaveLength(0);
    expect(query.page).toBe(2);
    expect(
      validateSync(plainToInstance(ListSubjectsDto, { limit: 1000 })),
    ).not.toHaveLength(0);
    expect(
      validateSync(
        plainToInstance(CreateSubjectDto, {
          title: 'Meeting',
          category: 'UNKNOWN',
        }),
      ),
    ).not.toHaveLength(0);
  });
});
