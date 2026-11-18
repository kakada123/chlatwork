import { validateSync } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppearanceController, UpdateAppearanceDto } from './appearance.controller';

describe('site appearance', () => {
  it('allows public reads and requires an authenticated administrator to save', () => {
    expect(Reflect.getMetadata('__guards__', AppearanceController.prototype.get)).toBeUndefined();
    expect(Reflect.getMetadata('__guards__', AppearanceController.prototype.save)).toEqual([JwtAuthGuard, AdminGuard]);
  });

  it('accepts only the two supported preset IDs', () => {
    for (const khmerFont of ['google-sans', 'hanuman', 'url(example)', '', null, 0]) {
      const dto = Object.assign(new UpdateAppearanceDto(), { khmerFont });
      expect(validateSync(dto).length === 0).toBe(['google-sans', 'hanuman'].includes(String(khmerFont)));
    }
  });

  it('defaults an empty table and returns the stored preset after a save', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ khmerFont: 'hanuman' }]), $executeRaw: jest.fn() };
    const controller = new AppearanceController(prisma as never);
    await expect(controller.get()).resolves.toEqual({ khmerFont: 'google-sans' });
    await expect(controller.save({ khmerFont: 'hanuman' })).resolves.toEqual({ khmerFont: 'hanuman' });
    expect(prisma.$executeRaw).toHaveBeenCalledWith(expect.any(Array), 'hanuman');
    await expect(controller.get()).resolves.toEqual({ khmerFont: 'hanuman' });
  });
});
