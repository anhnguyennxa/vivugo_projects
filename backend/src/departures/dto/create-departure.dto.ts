import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateDepartureDto {
  @IsDateString()
  departureDate: string;

  @IsDateString()
  returnDate: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  totalSlots: number;

  // null (khi cập nhật) = xoá giá riêng của đợt, quay về giá gốc của tour
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  priceOverride?: number | null;
}
