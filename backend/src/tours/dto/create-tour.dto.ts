import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTourDto {
  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ gồm chữ thường, số và dấu gạch ngang',
  })
  slug: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsString()
  @MinLength(20)
  description: string;

  @IsArray()
  itinerary: { day: number; title: string; description: string }[];

  @IsString()
  location: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  durationDays: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationNights: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  basePrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  minGuests?: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  maxGuests: number;

  @IsUrl()
  thumbnailUrl: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
