import { Controller, Get, Param, Query } from '@nestjs/common';

import { Role } from '../../generated/prisma/enums';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { QueryAdminBookingsDto } from './dto/query-admin-bookings.dto';
import { QueryAdminToursDto } from './dto/query-admin-tours.dto';

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
}
