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

  search(userId: string, query = '', subject?: string) {
    const text = query.trim();
    const where: Prisma.PersonalMemoryWhereInput = {
      userId,
      ...(subject
        ? { subject: { contains: subject, mode: 'insensitive' } }
        : {}),
      ...(text
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
        : {}),
    };
    return this.prisma.personalMemory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
