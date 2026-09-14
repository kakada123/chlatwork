import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonalMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    input: { content: string; subject?: string; category?: string },
  ) {
    return this.prisma.personalMemory.create({
      data: {
        userId,
        content: input.content,
        normalizedContent: input.content.toLocaleLowerCase(),
        subject: input.subject,
        category: input.category,
      },
    });
  }

  async search(userId: string, query = '', subject?: string) {
    const text = query.trim();
    const normalizedSubject = subject?.trim();
    const subjectWhere: Prisma.PersonalMemoryWhereInput = normalizedSubject
      ? {
          OR: [
            {
              subject: { contains: normalizedSubject, mode: 'insensitive' },
            },
            {
              content: { contains: normalizedSubject, mode: 'insensitive' },
            },
          ],
        }
      : {};
    const textWhere: Prisma.PersonalMemoryWhereInput = text
      ? {
          OR: [
            { content: { contains: text, mode: 'insensitive' } },
            {
              normalizedContent: {
                contains: text.toLocaleLowerCase(),
                mode: 'insensitive',
              },
            },
            { category: { contains: text, mode: 'insensitive' } },
          ],
        }
      : {};
    const where: Prisma.PersonalMemoryWhereInput = {
      userId,
      ...(normalizedSubject && text
        ? { AND: [subjectWhere, textWhere] }
        : { ...subjectWhere, ...textWhere }),
    };
    const matches = await this.prisma.personalMemory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    if (matches.length || !normalizedSubject || !text) return matches;

    // Natural questions rarely repeat stored wording. Once the subject matches,
    // return its facts instead of treating the user's phrasing as a hard filter.
    return this.prisma.personalMemory.findMany({
      where: { userId, ...subjectWhere },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
