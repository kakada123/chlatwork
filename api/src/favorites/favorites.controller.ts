import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { SetFavoriteDto } from './dto/set-favorite.dto';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list(@CurrentAuthUser() user: CurrentUser) {
    return this.favorites.list(user.id);
  }

  @Put()
  set(@CurrentAuthUser() user: CurrentUser, @Body() dto: SetFavoriteDto) {
    return this.favorites.set(user.id, dto);
  }
}
