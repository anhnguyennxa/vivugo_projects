import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';
import { effectiveDiscountPrice } from '../tours/promo.util';
import {
  serializeDepartures,
  UPCOMING_DEPARTURES_INCLUDE,
} from '../tours/upcoming-departures.util';
import type { CreateBlogPostDto } from './dto/create-blog-post.dto';
import type { QueryAdminBlogPostsDto } from './dto/query-admin-blog-posts.dto';
import type { QueryBlogPostsDto } from './dto/query-blog-posts.dto';
import type { UpdateBlogPostDto } from './dto/update-blog-post.dto';

function serializeRelatedTours<
  T extends {
    relatedTours?: {
      basePrice: Prisma.Decimal;
      discountPrice: Prisma.Decimal | null;
      promoStartAt: Date | null;
      promoEndAt: Date | null;
      avgRating: Prisma.Decimal;
      departures?: { priceOverride: Prisma.Decimal | null }[];
    }[];
  },
>(post: T) {
  return {
    ...post,
    ...(post.relatedTours && {
      relatedTours: post.relatedTours.map((t) => ({
        ...t,
        basePrice: Number(t.basePrice),
        discountPrice: effectiveDiscountPrice(t),
        avgRating: Number(t.avgRating),
        ...(t.departures && { departures: serializeDepartures(t.departures) }),
      })),
    }),
  };
}

const LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  region: true,
  status: true,
  publishedAt: true,
  viewCount: true,
  createdAt: true,
  author: { select: { fullName: true, avatarUrl: true } },
} satisfies Prisma.BlogPostSelect;

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryBlogPostsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const where: Prisma.BlogPostWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
      ...(query.region && { region: query.region }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { excerpt: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return { items, page, limit, total };
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      include: {
        author: { select: { fullName: true, avatarUrl: true } },
        relatedTours: {
          where: { status: 'PUBLISHED', deletedAt: null },
          include: {
            category: true,
            // Để thẻ tour liên quan trong bài cẩm nang hiện được ngày khởi hành.
            departures: UPCOMING_DEPARTURES_INCLUDE,
          },
        },
      },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');

    await this.prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });

    return serializeRelatedTours({ ...post, viewCount: post.viewCount + 1 });
  }

  async findAllAdmin(query: QueryAdminBlogPostsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const where: Prisma.BlogPostWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.region && { region: query.region }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { excerpt: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return { items, page, limit, total };
  }

  async findByIdAdmin(id: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { id, deletedAt: null },
      include: { relatedTours: { select: { id: true } } },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');

    return {
      ...post,
      relatedTourIds: post.relatedTours.map((t) => t.id),
    };
  }

  async create(dto: CreateBlogPostDto, authorId: string) {
    const { relatedTourIds, ...rest } = dto;
    const status = dto.status ?? 'DRAFT';

    const post = await this.prisma.blogPost.create({
      data: {
        ...rest,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        authorId,
        ...(relatedTourIds && {
          relatedTours: { connect: relatedTourIds.map((id) => ({ id })) },
        }),
      },
    });
    return post;
  }

  async update(id: string, dto: UpdateBlogPostDto) {
    const existing = await this.ensureExists(id);
    const { relatedTourIds, ...rest } = dto;

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...rest,
        ...(dto.status === 'PUBLISHED' &&
          !existing.publishedAt && { publishedAt: new Date() }),
        ...(relatedTourIds && {
          relatedTours: { set: relatedTourIds.map((tid) => ({ id: tid })) },
        }),
      },
    });
    return post;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.blogPost.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async ensureExists(id: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { id, deletedAt: null },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');
    return post;
  }
}
