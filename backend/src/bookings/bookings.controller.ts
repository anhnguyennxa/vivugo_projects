import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { BookingsService } from './bookings.service';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('checkout')
  async checkout(
    @CurrentUser() user: RequestUser,
    @Body() dto: CheckoutDto,
    @Req() request: Request,
  ) {
    const data = await this.bookingsService.checkout(
      user.id,
      dto,
      request.ip ?? '0.0.0.0',
    );
    return { message: 'Tạo đơn đặt tour thành công', data };
  }

  @Get()
  async findAll(@CurrentUser() user: RequestUser) {
    const data = await this.bookingsService.findAllForUser(user);
    return { message: 'Lấy danh sách đơn đặt tour thành công', data };
  }

  @Get(':code')
  async findOne(@Param('code') code: string, @CurrentUser() user: RequestUser) {
    const data = await this.bookingsService.findByCode(code, user);
    return { message: 'Lấy chi tiết đơn đặt tour thành công', data };
  }

  @Roles(Role.ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    const data = await this.bookingsService.updateStatus(id, dto);
    return { message: 'Cập nhật trạng thái đơn thành công', data };
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    await this.bookingsService.cancel(user.id, id);
    return { message: 'Huỷ đơn thành công', data: null };
  }
}
