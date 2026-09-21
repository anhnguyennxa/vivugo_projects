import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';

import { Role } from '../../generated/prisma/enums';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { QueryAdminBookingsDto } from './dto/query-admin-bookings.dto';
import { QueryAdminReviewsDto } from './dto/query-admin-reviews.dto';
import { QueryAdminToursDto } from './dto/query-admin-tours.dto';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async stats() {
    const data = await this.adminService.getStats();
    return { message: 'Lấy thống kê thành công', data };
  }

  @Get('tours')
  async tours(@Query() query: QueryAdminToursDto) {
    const { items, page, limit, total } =
      await this.adminService.findTours(query);
    return {
      message: 'Lấy danh sách tour thành công',
      data: items,
      meta: { page, limit, total },
    };
  }

  @Get('tours/:id')
  async tour(@Param('id') id: string) {
    const data = await this.adminService.findTourById(id);
    return { message: 'Lấy chi tiết tour thành công', data };
  }

  @Get('bookings')
  async bookings(@Query() query: QueryAdminBookingsDto) {
    const { items, page, limit, total } =
      await this.adminService.findBookings(query);
    return {
      message: 'Lấy danh sách đơn đặt tour thành công',
      data: items,
      meta: { page, limit, total },
    };
  }

  @Get('reviews')
  async reviews(@Query() query: QueryAdminReviewsDto) {
    const { items, page, limit, total } =
      await this.adminService.findReviews(query);
    return {
      message: 'Lấy danh sách đánh giá thành công',
      data: items,
      meta: { page, limit, total },
    };
  }

  @Get('users')
  async users(@Query() query: QueryAdminUsersDto) {
    const { items, page, limit, total } =
      await this.adminService.findUsers(query);
    return {
      message: 'Lấy danh sách người dùng thành công',
      data: items,
      meta: { page, limit, total },
    };
  }

  @Patch('users/:id')
  async updateUser(
    @CurrentUser() actor: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    const data = await this.adminService.updateUser(actor.id, id, dto);
    return { message: 'Cập nhật người dùng thành công', data };
  }
}
