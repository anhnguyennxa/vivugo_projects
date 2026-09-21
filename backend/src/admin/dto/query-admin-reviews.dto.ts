import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryAdminReviewsDto {
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
  limit?: number = 15;

  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'HIDDEN'])
  status?: 'PENDING' | 'APPROVED' | 'HIDDEN';

  // Tìm theo nội dung, tên người đánh giá hoặc tên tour
  @IsOptional()
  @IsString()
  search?: string;
}
