import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateQuickExpenseDto } from './create-quick-expense.dto';

const entry = {
  amount: '5.25',
  category: '__custom__',
  customCategory: '  Pet care  ',
  date: '2026-10-21',
  note: '',
};

describe('quick expense custom categories', () => {
  it('accepts and trims a custom category name', async () => {
    const dto = plainToInstance(CreateQuickExpenseDto, entry);
    expect(
      await validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).toEqual([]);
    expect(dto.customCategory).toBe('Pet care');
  });

  it.each([undefined, null, '', '   ', 123, 'x'.repeat(121)])(
    'rejects an invalid custom category: %s',
    async (customCategory) => {
      const dto = plainToInstance(CreateQuickExpenseDto, {
        ...entry,
        customCategory,
      });
      const errors = await validate(dto);
      expect(errors.some((error) => error.property === 'customCategory')).toBe(
        true,
      );
    },
  );

  it('keeps preset categories valid without a custom name', async () => {
    const dto = plainToInstance(CreateQuickExpenseDto, {
      amount: '5',
      category: 'Food',
      date: '2026-10-21',
      note: '',
    });
    expect(await validate(dto)).toEqual([]);
  });

  it('continues to reject unsupported category keys', async () => {
    const dto = plainToInstance(CreateQuickExpenseDto, {
      ...entry,
      category: 'unrecognized-key',
    });
    expect(
      (await validate(dto)).some((error) => error.property === 'category'),
    ).toBe(true);
  });
});
