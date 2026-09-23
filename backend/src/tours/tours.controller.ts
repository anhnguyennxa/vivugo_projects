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
import { AddTourImagesDto } from './dto/add-tour-images.dto';
import { CreateTourDto } from './dto/create-tour.dto';
import { QueryToursDto } from './dto/query-tours.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { ToursService } from './tours.service';

@Controller('tours')
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Public()
  @Get()
  async findAll(@Query() query: QueryToursDto) {
    const { items, page, limit, total } =
      await this.toursService.findAll(query);
    return {
      message: 'Lấy danh sách tour thành công',
      data: items,
      meta: { page, limit, total },
    };
  }

  @Public()
  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const data = await this.toursService.findBySlug(slug);
    return { message: 'Lấy chi tiết tour thành công', data };
  }

  @Roles(Role.ADMIN)
  @Audit('Tour', 'CREATE')
  @Post()
  async create(@Body() dto: CreateTourDto, @CurrentUser() user: RequestUser) {
    const data = await this.toursService.create(dto, user.id);
    return { message: 'Tạo tour thành công', data };
  }

  @Roles(Role.ADMIN)
  @Audit('Tour', 'UPDATE')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTourDto) {
    const data = await this.toursService.update(id, dto);
    return { message: 'Cập nhật tour thành công', data };
  }

  @Roles(Role.ADMIN)
  @Audit('Tour', 'DELETE')
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.toursService.remove(id);
    return { message: 'Xoá tour thành công', data: null };
  }

  @Roles(Role.ADMIN)
  @Audit('Tour', 'DELETE_PERMANENT')
  @HttpCode(HttpStatus.OK)
  @Delete(':id/permanent')
  async removePermanently(@Param('id') id: string) {
    await this.toursService.removePermanently(id);
    return { message: 'Đã xoá vĩnh viễn tour', data: null };
  }

  @Roles(Role.ADMIN)
  @Audit('Tour', 'ADD_IMAGES')
  @Post(':id/images')
  async addImages(@Param('id') id: string, @Body() dto: AddTourImagesDto) {
    const data = await this.toursService.addImages(id, dto);
    return { message: 'Thêm ảnh tour thành công', data };
  }

  @Roles(Role.ADMIN)
  @Audit('TourImage', 'DELETE', 'imageId')
  @HttpCode(HttpStatus.OK)
  @Delete(':id/images/:imageId')
  async removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    await this.toursService.removeImage(id, imageId);
    return { message: 'Xoá ảnh tour thành công', data: null };
  }
}
