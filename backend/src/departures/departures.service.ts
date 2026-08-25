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

    const updated = await this.prisma.departure.update({
      where: { id },
      data: {
        ...(dto.departureDate && {
          departureDate: new Date(dto.departureDate),
        }),
        ...(dto.returnDate && { returnDate: new Date(dto.returnDate) }),
        ...(dto.totalSlots != null && { totalSlots: dto.totalSlots }),
        ...(dto.priceOverride != null && { priceOverride: dto.priceOverride }),
        ...(dto.status && { status: dto.status }),
      },
    });
    return serializeDeparture(updated);
  }

  private async ensureTourExists(tourId: string) {
    const tour = await this.prisma.tour.findUnique({ where: { id: tourId } });
    if (!tour || tour.deletedAt)
      throw new NotFoundException('Không tìm thấy tour');
  }
}
