import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async findAll(@CurrentUser() user: RequestUser) {
    const data = await this.favoritesService.findAll(user.id);
    return { message: 'Lấy danh sách yêu thích thành công', data };
  }

  @Post(':tourId')
  async add(@CurrentUser() user: RequestUser, @Param('tourId') tourId: string) {
    const data = await this.favoritesService.add(user.id, tourId);
    return { message: 'Đã thêm vào yêu thích', data };
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':tourId')
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('tourId') tourId: string,
  ) {
    await this.favoritesService.remove(user.id, tourId);
    return { message: 'Đã xoá khỏi yêu thích', data: null };
  }
}
