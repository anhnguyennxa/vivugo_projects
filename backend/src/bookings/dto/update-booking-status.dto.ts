import { IsIn } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsIn(['CONFIRMED', 'CANCELLED', 'COMPLETED'])
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}
