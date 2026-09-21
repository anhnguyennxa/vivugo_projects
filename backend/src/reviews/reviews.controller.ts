import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('tours/:tourId/reviews')
  async findByTour(
    @Param('tourId') tourId: string,
    @Query() query: QueryReviewsDto,
  ) {
    const { items, page, limit, total } = await this.reviewsService.findByTour(
      tourId,
      query,
    );
    return {
      message: 'Lấy danh sách đánh giá thành công',
      data: items,
      meta: { page, limit, total },
    };
  }

  @Post('reviews')
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateReviewDto) {
    const data = await this.reviewsService.create(user.id, dto);
    return { message: 'Gửi đánh giá thành công, đang chờ duyệt', data };
  }

  @Roles(Role.ADMIN)
  @Patch('reviews/:id/moderate')
  async moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    const data = await this.reviewsService.moderate(id, dto);
    return { message: 'Cập nhật trạng thái đánh giá thành công', data };
  }
}
