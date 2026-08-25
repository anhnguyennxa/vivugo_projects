import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class AddCartItemDto {
  @IsString()
  tourId: string;

  @IsString()
  departureId: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  numAdults: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  numChildren?: number;
}
