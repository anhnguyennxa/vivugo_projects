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

import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { QueryAdminCollectionsDto } from './dto/query-admin-collections.dto';
import { QueryCollectionsDto } from './dto/query-collections.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Roles(Role.ADMIN)
  @Get('admin')
  async findAllAdmin(@Query() query: QueryAdminCollectionsDto) {
    const { items, page, limit, total } =
      await this.collectionsService.findAllAdmin(query);
    return {
      message: 'Lấy danh sách bộ sưu tập thành công',
      data: items,
      meta: { page, limit, total },
    };
  }

  @Roles(Role.ADMIN)
  @Get('admin/:id')
  async findOneAdmin(@Param('id') id: string) {
    const data = await this.collectionsService.findByIdAdmin(id);
    return { message: 'Lấy chi tiết bộ sưu tập thành công', data };
  }

  @Public()
  @Get()
  async findAll(@Query() query: QueryCollectionsDto) {
    const data = await this.collectionsService.findAll(query);
    return { message: 'Lấy danh sách bộ sưu tập thành công', data };
  }

  @Public()
  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const data = await this.collectionsService.findBySlug(slug);
    return { message: 'Lấy chi tiết bộ sưu tập thành công', data };
  }

  @Roles(Role.ADMIN)
  @Post()
  async create(
    @Body() dto: CreateCollectionDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.collectionsService.create(dto, user.id);
    return { message: 'Tạo bộ sưu tập thành công', data };
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCollectionDto) {
    const data = await this.collectionsService.update(id, dto);
    return { message: 'Cập nhật bộ sưu tập thành công', data };
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.collectionsService.remove(id);
    return { message: 'Xoá bộ sưu tập thành công', data: null };
  }
}
