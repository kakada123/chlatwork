import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrepHubService } from './prephub.service';

function setup() {
  const db: any = {
    preparationSubject: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    preparationSection: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    preparationItem: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    preparationResource: {
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    preparationReminder: { create: jest.fn() },
    preparationHistory: { create: jest.fn() },
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ telegramNotificationTimeZone: 'Asia/Phnom_Penh' }),
    },
  };
  db.$transaction = (fn: any) => fn(db);
  return { db, service: new PrepHubService(db) };
}

describe('PrepHub private workspaces', () => {
  it('does not expose a foreign subject', async () => {
    const { db, service } = setup();
    db.preparationSubject.findFirst.mockResolvedValue(null);
    await expect(service.workspace('owner', 'foreign')).rejects.toThrow(
      NotFoundException,
    );
    expect(db.preparationSubject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'foreign', userId: 'owner' } }),
    );
  });
  it('does not mutate nested content when subject ownership is absent', async () => {
    const { db, service } = setup();
    db.preparationSubject.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.addItem('owner', 'foreign', 'section', { title: 'Private' }),
    ).rejects.toThrow(NotFoundException);
    expect(db.preparationItem.create).not.toHaveBeenCalled();
  });
  it('does not read foreign file bytes', async () => {
    const { db, service } = setup();
    db.preparationResource.findFirst.mockResolvedValue(null);
    await expect(service.file('owner', 'subject', 'resource')).rejects.toThrow(
      NotFoundException,
    );
    expect(db.preparationResource.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'resource',
        section: { subjectId: 'subject', subject: { userId: 'owner' } },
      },
    });
  });
  it('rejects a section from another subject before adding an item', async () => {
    const { db, service } = setup();
    db.preparationSubject.updateMany.mockResolvedValue({ count: 1 });
    db.preparationSubject.findFirst.mockResolvedValue({ id: 'subject' });
    db.preparationSection.findFirst.mockResolvedValue(null);
    await expect(
      service.addItem('owner', 'subject', 'foreign-section', {
        title: 'Private',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(db.preparationItem.create).not.toHaveBeenCalled();
  });
  it('creates a subject without requiring dates and populates the chosen template', async () => {
    const { db, service } = setup();
    db.preparationSubject.create.mockImplementation(({ data }: any) => data);
    const result = await service.create('owner', {
      title: 'Offline POS',
      template: 'RESEARCH',
    });
    expect(result.eventAt).toBeNull();
    expect(result.deadlineAt).toBeNull();
    expect(result.userId).toBe('owner');
    expect(
      db.preparationSubject.create.mock.calls[0][0].data.sections.create.some(
        (s: any) => s.type === 'RESEARCH',
      ),
    ).toBe(true);
  });
  it('rejects blank titles even when DTO minimum length passes', async () => {
    const { service } = setup();
    await expect(service.create('owner', { title: '   ' })).rejects.toThrow(
      BadRequestException,
    );
  });
  it('requires exact membership for reordering', async () => {
    const { db, service } = setup();
    db.preparationSubject.updateMany.mockResolvedValue({ count: 1 });
    db.preparationSubject.findFirst.mockResolvedValue({ id: 'subject' });
    db.preparationSection.findMany.mockResolvedValue([
      { id: 'a' },
      { id: 'b' },
    ]);
    await expect(
      service.reorderSections('owner', 'subject', ['a', 'foreign']),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.reorderSections('owner', 'subject', ['a', 'a']),
    ).rejects.toThrow(BadRequestException);
  });
  it('refuses past reminders and subjects without a schedule', async () => {
    const { db, service } = setup();
    db.preparationSubject.updateMany.mockResolvedValue({ count: 1 });
    db.preparationSubject.findFirst.mockResolvedValue({
      id: 'subject',
      eventAt: null,
      deadlineAt: null,
    });
    await expect(
      service.addReminder('owner', 'subject', {
        remindAt: '2099-01-01T00:00:00Z',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(db.preparationReminder.create).not.toHaveBeenCalled();
  });
});

describe('PrepHub lifecycle retention', () => {
  it.each(['READY', 'COMPLETED', 'PREPARING'])(
    'archives and restores %s without touching sections or files',
    async (status) => {
      const { db, service } = setup();
      let stored: any = {
        id: 'subject',
        userId: 'owner',
        status,
        eventAt: null,
        deadlineAt: null,
        completedAt: status === 'COMPLETED' ? new Date('2026-11-01') : null,
        archivedAt: null,
      };
      db.preparationSubject.updateMany.mockResolvedValue({ count: 1 });
      db.preparationSubject.findFirst.mockImplementation(async () => stored);
      db.preparationSubject.update = jest
        .fn()
        .mockImplementation(async ({ data }: any) => {
          stored = { ...stored, ...data };
          return stored;
        });
      const completedAt = stored.completedAt;
      const archived = await service.update('owner', 'subject', {
        status: 'ARCHIVED',
      });
      expect(archived.status).toBe('ARCHIVED');
      expect(archived.previousStatus).toBe(status);
      const restored = await service.restore('owner', 'subject');
      expect(restored.status).toBe(status);
      expect(restored.archivedAt).toBeNull();
      expect(restored.completedAt).toEqual(completedAt);
      expect(db.preparationSection.create).not.toHaveBeenCalled();
      expect(db.preparationResource.create).not.toHaveBeenCalled();
      expect(db.preparationHistory.create).toHaveBeenCalledTimes(2);
    },
  );
  it('rejects foreign nested resources even inside an owned subject', async () => {
    const { db, service } = setup();
    db.preparationSubject.updateMany.mockResolvedValue({ count: 1 });
    db.preparationSubject.findFirst.mockResolvedValue({
      id: 'subject',
      userId: 'owner',
    });
    db.preparationResource.findFirst.mockResolvedValue(null);
    await expect(
      service.resource('owner', 'subject', 'foreign-file', 'Renamed'),
    ).rejects.toThrow(NotFoundException);
  });
});
