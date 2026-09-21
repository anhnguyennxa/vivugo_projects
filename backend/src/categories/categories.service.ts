import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma/prisma.service';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
    return category;
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Tour xoá mềm vẫn giữ khoá ngoại tới danh mục nên cũng chặn việc xoá.
    const [activeTours, deletedTours] = await Promise.all([
      this.prisma.tour.count({ where: { categoryId: id, deletedAt: null } }),
      this.prisma.tour.count({
        where: { categoryId: id, deletedAt: { not: null } },
      }),
    ]);
    if (activeTours > 0) {
      throw new BadRequestException(
        `Danh mục đang có ${activeTours} tour, hãy chuyển tour sang danh mục khác trước khi xoá`,
      );
    }
    if (deletedTours > 0) {
      throw new BadRequestException(
        'Danh mục còn liên kết với các tour đã xoá nên không thể xoá',
      );
    }
    await this.prisma.category.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
  }
}
