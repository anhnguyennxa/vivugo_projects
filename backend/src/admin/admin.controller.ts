import { Controller, Get, Query } from '@nestjs/common';

import { Role } from '../../generated/prisma/enums';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { QueryAdminBookingsDto } from './dto/query-admin-bookings.dto';

@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async stats() {
    const data = await this.adminService.getStats();
    return { message: 'Lấy thống kê thành công', data };
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
