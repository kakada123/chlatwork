import { Injectable } from '@nestjs/common';
import { FavoriteKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SetFavoriteDto } from './dto/set-favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const favorites = await this.prisma.userFavorite.findMany({
      where: { userId },
      select: { kind: true, itemKey: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      toolKeys: favorites
        .filter((favorite) => favorite.kind === FavoriteKind.TOOL)
        .map((favorite) => favorite.itemKey),
      commandIds: favorites
        .filter((favorite) => favorite.kind === FavoriteKind.COMMAND)
        .map((favorite) => favorite.itemKey),
    };
  }

  async set(userId: string, dto: SetFavoriteDto) {
    if (dto.favorite) {
      await this.prisma.userFavorite.upsert({
        where: {
          userId_kind_itemKey: { userId, kind: dto.kind, itemKey: dto.itemKey },
        },
        create: { userId, kind: dto.kind, itemKey: dto.itemKey },
        update: {},
      });
    } else {
      await this.prisma.userFavorite.deleteMany({
        where: { userId, kind: dto.kind, itemKey: dto.itemKey },
      });
    }

    // The client changes state only after this account-scoped write succeeds.
    return { favorite: dto.favorite };
  }
}
