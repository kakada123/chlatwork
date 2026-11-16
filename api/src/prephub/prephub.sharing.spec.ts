import { NotFoundException } from '@nestjs/common';
import { PrepHubService } from './prephub.service';
const token = 'a'.repeat(43);
function setup() {
  let subject: any = {
    id: 'subject',
    userId: 'owner',
    title: 'Research',
    description: '',
    category: 'RESEARCH',
    goal: 'Explain offline checkout',
    status: 'PREPARING',
    priority: 'NORMAL',
    eventAt: null,
    deadlineAt: null,
    updatedAt: new Date(),
    shareToken: null,
    sharedAt: null,
    shareAttachments: false,
    sections: [],
    user: { telegramNotificationTimeZone: 'Asia/Phnom_Penh' },
    reminders: [{ private: 'reminder' }],
  };
  const db: any = {
    preparationSubject: {
      findFirst: jest.fn(async ({ where }: any) =>
        (where.userId && where.userId !== subject.userId) ||
        (where.shareToken && where.shareToken !== subject.shareToken)
          ? null
          : subject,
      ),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (where.userId !== subject.userId) return { count: 0 };
        Object.assign(subject, data);
        return { count: 1 };
      }),
      update: jest.fn(async ({ data }: any) => Object.assign(subject, data)),
    },
    preparationResource: {
      findFirst: jest.fn(async ({ where }: any) =>
        where.section.subject.shareToken === subject.shareToken &&
        subject.shareAttachments &&
        where.id === 'file'
          ? {
              id: 'file',
              data: Buffer.from('file'),
              mimeType: 'application/pdf',
              title: 'Report',
              extension: 'pdf',
              fileSize: 4,
            }
          : null,
      ),
    },
    preparationHistory: { create: jest.fn() },
  };
  db.$transaction = async (fn: any) => fn(db);
  return { db, service: new PrepHubService(db) as any, subject };
}
describe('PrepHub public sharing', () => {
  it('keeps private subjects and UUID workspace identifiers unavailable publicly', async () => {
    const { service } = setup();
    await expect(service.publicWorkspace(token)).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.publicWorkspace('92dde8ab-0279-472c-b9e6-0462072916c7'),
    ).rejects.toThrow(NotFoundException);
  });
  it('requires ownership before reading or changing sharing', async () => {
    const { service, db } = setup();
    await expect(service.sharing('other', 'subject')).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.enableSharing('other', 'subject', { includeAttachments: true }),
    ).rejects.toThrow(NotFoundException);
    await expect(service.disableSharing('other', 'subject')).rejects.toThrow(
      NotFoundException,
    );
    expect(db.preparationSubject.update).not.toHaveBeenCalled();
  });
  it('creates a stable unguessable link, rotates on request and revokes without deleting materials', async () => {
    const { service, subject } = setup();
    const first = await service.enableSharing('owner', 'subject', {
      includeAttachments: false,
    });
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.enabled).toBe(true);
    expect(
      (
        await service.enableSharing('owner', 'subject', {
          includeAttachments: true,
        })
      ).token,
    ).toBe(first.token);
    const next = await service.enableSharing('owner', 'subject', {
      includeAttachments: false,
      regenerate: true,
    });
    expect(next.token).not.toBe(first.token);
    await expect(service.publicWorkspace(first.token)).rejects.toThrow(
      NotFoundException,
    );
    expect((await service.publicWorkspace(next.token)).title).toBe('Research');
    await service.disableSharing('owner', 'subject');
    await expect(service.publicWorkspace(next.token)).rejects.toThrow(
      NotFoundException,
    );
    expect(subject.title).toBe('Research');
    expect((await service.sharing('owner', 'subject')).enabled).toBe(false);
  });
  it('does not expose the share token, ownership, reminders or account details in public data', async () => {
    const { service, subject } = setup();
    subject.shareToken = token;
    const result = await service.publicWorkspace(token);
    expect(result.timeZone).toBe('Asia/Phnom_Penh');
    expect(result.progress.total).toBe(0);
    for (const key of ['user', 'userId', 'shareToken', 'reminders', 'history'])
      expect(result).not.toHaveProperty(key);
    expect(result.sections).toEqual([]);
  });
  it('requires current attachment permission and scopes file reads to the exact shared subject', async () => {
    const { service, subject, db } = setup();
    subject.shareToken = token;
    await expect(service.publicFile(token, 'file')).rejects.toThrow(
      NotFoundException,
    );
    subject.shareAttachments = true;
    expect((await service.publicFile(token, 'file')).data.toString()).toBe(
      'file',
    );
    await expect(service.publicFile('b'.repeat(43), 'file')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.publicFile(token, 'foreign-file')).rejects.toThrow(
      NotFoundException,
    );
    expect(db.preparationResource.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'file',
        section: { subject: { shareToken: token, shareAttachments: true } },
      },
    });
    await service.disableSharing('owner', 'subject');
    await expect(service.publicFile(token, 'file')).rejects.toThrow(
      NotFoundException,
    );
  });
  it('does not expose attachment metadata when file sharing is off', async () => {
    const { service, subject } = setup();
    subject.shareToken = token;
    subject.sections = [
      {
        id: 's',
        title: 'Files',
        type: 'ATTACHMENTS',
        items: [],
        resources: [{ id: 'file', title: 'Private.pdf' }],
      },
    ];
    const result = await service.publicWorkspace(token);
    expect(result.sections[0].resources).toEqual([]);
  });
});
