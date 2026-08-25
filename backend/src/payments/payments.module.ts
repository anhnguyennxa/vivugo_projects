import { Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { VnpayService } from './vnpay.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, VnpayService],
  exports: [VnpayService, PaymentsService],
})
export class PaymentsModule {}
