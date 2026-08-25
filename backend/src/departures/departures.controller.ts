import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { DeparturesService } from './departures.service';
import { CreateDepartureDto } from './dto/create-departure.dto';
import { UpdateDepartureDto } from './dto/update-departure.dto';

@Controller()
export class DeparturesController {
  constructor(private readonly departuresService: DeparturesService) {}

  @Public()
  @Get('tours/:tourId/departures')
  async findByTour(@Param('tourId') tourId: string) {
    const data = await this.departuresService.findByTour(tourId);
    return { message: 'Lấy lịch khởi hành thành công', data };
  }

  @Roles(Role.ADMIN)
  @Post('tours/:tourId/departures')
  async create(
    @Param('tourId') tourId: string,
    @Body() dto: CreateDepartureDto,
  ) {
    const data = await this.departuresService.create(tourId, dto);
    return { message: 'Tạo đợt khởi hành thành công', data };
  }

  @Roles(Role.ADMIN)
  @Patch('departures/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateDepartureDto) {
    const data = await this.departuresService.update(id, dto);
    return { message: 'Cập nhật đợt khởi hành thành công', data };
  }
}
