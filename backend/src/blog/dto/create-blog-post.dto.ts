import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateBlogPostDto {
  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ gồm chữ thường, số và dấu gạch ngang',
  })
  slug: string;

  @IsString()
  @MinLength(10)
  excerpt: string;

  @IsString()
  @MinLength(50)
  content: string;

  @IsUrl()
  coverImageUrl: string;

  @IsOptional()
  @IsIn(['MIEN_BAC', 'MIEN_TRUNG', 'TAY_NGUYEN', 'MIEN_NAM'])
  region?: 'MIEN_BAC' | 'MIEN_TRUNG' | 'TAY_NGUYEN' | 'MIEN_NAM';

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedTourIds?: string[];
}
