import {
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MomentsService } from './moments.service';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const WORKSPACE_ID = '00000000-0000-4000-8000-000000000002';

function setup() {
  const personal = {
    id: 'personal',
    creatorId: USER_ID,
    groupWorkspaceId: null,
    title: 'Birthday',
    occasion: 'BIRTHDAY',
    blocks: [],
    voteSchedule: null,
  };
  const group = {
    id: 'group',
    creatorId: USER_ID,
    groupWorkspaceId: WORKSPACE_ID,
    title: 'Lunch',
    occasion: 'VOTING',
    blocks: [{ data: { options: [{ id: 'option-1', label: 'Rice' }] } }],
    voteSchedule: null,
  };
  const records = [
    group,
    personal,
    { ...group, id: 'another-owner', creatorId: 'other' },
  ];
  const prisma = {
    moment: {
      findMany: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve(
            records.filter(
              (row) =>
                row.creatorId === where.creatorId &&
                (where.groupWorkspaceId === undefined ||
                  row.groupWorkspaceId === where.groupWorkspaceId),
            ),
          ),
        ),
    },
  };
  const groups = {
    manager: jest.fn().mockResolvedValue({ title: 'Lunch time' }),
  };
  const service = Reflect.construct(MomentsService, [
    prisma,
    groups,
  ]) as MomentsService;
  return { service, prisma, groups, personal, group, records };
}

describe('My Moments group poll discovery', () => {
  it('lists the owner group poll after live authorization without personal vote controls', async () => {
    const { service, groups } = setup();
    const result = await service.listMine(USER_ID);
    expect(result.map((row) => row.id)).toEqual(['group', 'personal']);
    expect(result[0]).toMatchObject({
      groupWorkspaceId: WORKSPACE_ID,
      groupTitle: 'Lunch time',
    });
    expect(result[0]).not.toHaveProperty('pollSummary');
    expect(result[0]).not.toHaveProperty('pollInsights');
    expect(groups.manager).toHaveBeenCalledWith(
      USER_ID,
      WORKSPACE_ID,
      'CHLATWORK',
    );
    expect(groups.manager).toHaveBeenCalledTimes(1);
  });

  it('hides group metadata when the original creator is no longer an authorized manager', async () => {
    const { service, groups } = setup();
    groups.manager.mockRejectedValue(new ForbiddenException());
    expect((await service.listMine(USER_ID)).map((row) => row.id)).toEqual([
      'personal',
    ]);
    expect(groups.manager).toHaveBeenCalledTimes(1);
  });

  it('reports a failed live permission check instead of silently showing a missing poll', async () => {
    const { service, groups } = setup();
    groups.manager.mockRejectedValue(
      new ServiceUnavailableException('Try again'),
    );
    await expect(service.listMine(USER_ID)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('fails closed if the group authorization service is unavailable', async () => {
    const { prisma } = setup();
    const service = new MomentsService(prisma as never);
    await expect(service.listMine(USER_ID)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('keeps personal Moments available without any Telegram permission request', async () => {
    const { service, groups, records, personal } = setup();
    records.splice(0, records.length, personal);
    expect((await service.listMine(USER_ID)).map((row) => row.id)).toEqual([
      'personal',
    ]);
    expect(groups.manager).not.toHaveBeenCalled();
  });
});
