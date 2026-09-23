import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { Audit } from '../common/decorators/audit.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RawResponse } from '../common/decorators/raw-response.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @RawResponse()
  @Get('vnpay/callback')
  vnpayCallback(@Query() query: Record<string, string>) {
    return this.paymentsService.handleVnpayIpn(query);
  }

  @Get(':bookingId')
  async findOne(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.paymentsService.getByBookingId(bookingId, user);
    return { message: 'Lấy thông tin thanh toán thành công', data };
  }

  @Roles(Role.ADMIN)
  @Audit('Payment', 'REFUND', 'bookingId')
  @Post(':bookingId/refund')
  async refund(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: RequestUser,
    @Req() request: Request,
  ) {
    await this.paymentsService.refund(bookingId, user, request.ip ?? '0.0.0.0');
    return { message: 'Đã hoàn tiền thành công', data: null };
  }
}
