import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  numAdults?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  numChildren?: number;
}
