import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  DEPARTURE_CITIES,
  type DepartureCity,
} from '../constants/departure-city';

export class QueryToursDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['MIEN_BAC', 'MIEN_TRUNG', 'TAY_NGUYEN', 'MIEN_NAM'])
  region?: 'MIEN_BAC' | 'MIEN_TRUNG' | 'TAY_NGUYEN' | 'MIEN_NAM';

  @IsOptional()
  @IsIn(DEPARTURE_CITIES)
  departureCity?: DepartureCity;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lastMinute?: boolean;

  // Chỉ lấy tour đang khuyến mãi (có giá giảm)
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  promo?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsIn(['createdAt', 'basePrice', 'avgRating'])
  sort?: 'createdAt' | 'basePrice' | 'avgRating' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}
