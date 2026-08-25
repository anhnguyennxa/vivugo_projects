import { Controller, Get, Param, Query } from '@nestjs/common';

import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RawResponse } from '../common/decorators/raw-response.decorator';
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
}
