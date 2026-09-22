import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ gồm chữ thường, số và dấu gạch ngang',
  })
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUrl()
  coverImageUrl: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';

  // Để trống = hiển thị vô thời hạn (kể từ khi đăng)
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  // Danh sách id tour theo đúng thứ tự muốn hiển thị
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tourIds?: string[];
}
