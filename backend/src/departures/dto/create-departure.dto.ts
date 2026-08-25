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

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  priceOverride?: number;
}
