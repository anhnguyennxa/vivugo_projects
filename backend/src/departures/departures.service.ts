import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';
import type { CreateDepartureDto } from './dto/create-departure.dto';
import type { UpdateDepartureDto } from './dto/update-departure.dto';

function serializeDeparture<T extends { priceOverride: Prisma.Decimal | null }>(
  departure: T,
) {
  return {
    ...departure,
    priceOverride:
      departure.priceOverride != null ? Number(departure.priceOverride) : null,
  };
}

@Injectable()
export class DeparturesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTour(tourId: string) {
    await this.ensureTourExists(tourId);
    const departures = await this.prisma.departure.findMany({
      where: { tourId },
      orderBy: { departureDate: 'asc' },
    });
    return departures.map(serializeDeparture);
  }

  async create(tourId: string, dto: CreateDepartureDto) {
    await this.ensureTourExists(tourId);

    if (new Date(dto.returnDate) < new Date(dto.departureDate)) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày khởi hành');
    }

    const departure = await this.prisma.departure.create({
      data: {
        tourId,
        departureDate: new Date(dto.departureDate),
        returnDate: new Date(dto.returnDate),
        totalSlots: dto.totalSlots,
        priceOverride: dto.priceOverride,
      },
    });
    return serializeDeparture(departure);
  }

  async update(id: string, dto: UpdateDepartureDto) {
    const departure = await this.prisma.departure.findUnique({ where: { id } });
    if (!departure) throw new NotFoundException('Không tìm thấy đợt khởi hành');

    const departureDate = dto.departureDate
      ? new Date(dto.departureDate)
      : departure.departureDate;
    const returnDate = dto.returnDate
      ? new Date(dto.returnDate)
      : departure.returnDate;
    if (returnDate < departureDate) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày khởi hành');
    }
    if (dto.totalSlots != null && dto.totalSlots < departure.bookedSlots) {
      throw new BadRequestException(
        `Tổng số chỗ không được nhỏ hơn số chỗ đã đặt (${departure.bookedSlots})`,
      );
    }

    const updated = await this.prisma.departure.update({
      where: { id },
      data: {
        departureDate,
        returnDate,
        ...(dto.totalSlots != null && { totalSlots: dto.totalSlots }),
        // priceOverride: null xoá giá riêng, quay về giá gốc của tour
        ...(dto.priceOverride !== undefined && {
          priceOverride: dto.priceOverride,
        }),
        ...(dto.status && { status: dto.status }),
      },
    });
    return serializeDeparture(updated);
  }

  async remove(id: string) {
    const departure = await this.prisma.departure.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!departure) throw new NotFoundException('Không tìm thấy đợt khởi hành');
    if (departure._count.bookings > 0) {
      throw new BadRequestException(
        'Đợt khởi hành đã có đơn đặt, hãy đóng đợt thay vì xoá',
      );
    }
    await this.prisma.departure.delete({ where: { id } });
  }

  private async ensureTourExists(tourId: string) {
    const tour = await this.prisma.tour.findUnique({ where: { id: tourId } });
    if (!tour || tour.deletedAt)
      throw new NotFoundException('Không tìm thấy tour');
  }
}
