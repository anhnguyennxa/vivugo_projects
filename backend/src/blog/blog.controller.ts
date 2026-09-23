import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { Audit } from '../common/decorators/audit.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { QueryAdminBlogPostsDto } from './dto/query-admin-blog-posts.dto';
import { QueryBlogPostsDto } from './dto/query-blog-posts.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Roles(Role.ADMIN)
  @Get('admin')
  async findAllAdmin(@Query() query: QueryAdminBlogPostsDto) {
    const { items, page, limit, total } =
      await this.blogService.findAllAdmin(query);
    return {
      message: 'Lấy danh sách bài viết thành công',
      data: items,
      meta: { page, limit, total },
    };
  }

  @Roles(Role.ADMIN)
  @Get('admin/:id')
  async findOneAdmin(@Param('id') id: string) {
    const data = await this.blogService.findByIdAdmin(id);
    return { message: 'Lấy chi tiết bài viết thành công', data };
  }

  @Public()
  @Get()
  async findAll(@Query() query: QueryBlogPostsDto) {
    const { items, page, limit, total } = await this.blogService.findAll(query);
    return {
      message: 'Lấy danh sách bài viết thành công',
      data: items,
      meta: { page, limit, total },
    };
  }

  @Public()
  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const data = await this.blogService.findBySlug(slug);
    return { message: 'Lấy chi tiết bài viết thành công', data };
  }

  @Roles(Role.ADMIN)
  @Audit('BlogPost', 'CREATE')
  @Post()
  async create(
    @Body() dto: CreateBlogPostDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.blogService.create(dto, user.id);
    return { message: 'Tạo bài viết thành công', data };
  }

  @Roles(Role.ADMIN)
  @Audit('BlogPost', 'UPDATE')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    const data = await this.blogService.update(id, dto);
    return { message: 'Cập nhật bài viết thành công', data };
  }

  @Roles(Role.ADMIN)
  @Audit('BlogPost', 'DELETE')
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.blogService.remove(id);
    return { message: 'Xoá bài viết thành công', data: null };
  }
}
