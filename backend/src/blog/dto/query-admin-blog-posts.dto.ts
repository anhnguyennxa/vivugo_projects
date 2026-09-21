import { IsIn, IsOptional } from 'class-validator';

import { QueryBlogPostsDto } from './query-blog-posts.dto';

export class QueryAdminBlogPostsDto extends QueryBlogPostsDto {
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';
}
