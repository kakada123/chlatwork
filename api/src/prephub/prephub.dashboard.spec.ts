import { PrepHubService } from './prephub.service';
describe('PrepHub dashboard facets', () => {
  it('counts matching categories across pages while preserving owner, search and status scope', async () => {
    const db: any = {
      preparationSubject: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([
          { category: 'RESEARCH', _count: 25 },
          { category: 'MEETING', _count: 2 },
        ]),
      },
    };
    const result: any = await new PrepHubService(db).list('owner', {
      page: 2,
      limit: 20,
      sort: 'TITLE',
      category: 'MEETING',
      q: 'POS',
      status: 'ACTIVE',
    });
    expect(result.categoryCounts).toEqual({ RESEARCH: 25, MEETING: 2 });
    expect(result.total).toBe(2);
    const facet = db.preparationSubject.groupBy.mock.calls[0][0];
    expect(facet.where).toEqual({
      userId: 'owner',
      OR: ['title', 'description', 'goal'].map((key) => ({
        [key]: { contains: 'POS', mode: 'insensitive' },
      })),
      status: { notIn: ['COMPLETED', 'ARCHIVED'] },
    });
    expect(facet.by).toEqual(['category']);
    expect(db.preparationSubject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'owner',
          category: 'MEETING',
        }),
        skip: 20,
        take: 20,
      }),
    );
  });
  it('returns actual task counts without counting notes or changing required-item progress', async () => {
    const db: any = {
      preparationSubject: {
        count: jest.fn().mockResolvedValue(1),
        groupBy: jest
          .fn()
          .mockResolvedValue([{ category: 'RESEARCH', _count: 1 }]),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'subject',
            sections: [
              {
                type: 'CHECKLIST',
                items: [{ isRequired: false, isCompleted: false }],
              },
              {
                type: 'NOTES',
                items: [{ isRequired: true, isCompleted: false }],
              },
            ],
          },
        ]),
      },
    };
    const result: any = await new PrepHubService(db).list('owner', {
      page: 1,
      limit: 20,
      sort: 'TITLE',
    });
    expect(result.subjects[0].taskCount).toBe(1);
    expect(result.subjects[0].progress.total).toBe(0);
    expect(result.subjects[0].progress.percent).toBe(0);
  });
});
