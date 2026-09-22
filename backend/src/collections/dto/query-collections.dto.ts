import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Danh sách bộ sưu tập công khai: ít khi cần lọc/phân trang vì số lượng nhỏ,
// chỉ hỗ trợ limit để trang chủ lấy vài bộ sưu tập mới nhất.
export class QueryCollectionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
