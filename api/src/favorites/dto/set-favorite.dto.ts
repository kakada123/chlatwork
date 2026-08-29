import { FavoriteKind } from '@prisma/client';
import { IsBoolean, IsEnum, IsString, Matches, MaxLength } from 'class-validator';

export class SetFavoriteDto {
  @IsEnum(FavoriteKind)
  kind!: FavoriteKind;

  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  itemKey!: string;

  @IsBoolean()
  favorite!: boolean;
}
