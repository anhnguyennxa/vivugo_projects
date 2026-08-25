import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';

import { CreateDepartureDto } from './create-departure.dto';

export class UpdateDepartureDto extends PartialType(CreateDepartureDto) {
  @IsOptional()
  @IsIn(['OPEN', 'CLOSED', 'CANCELLED'])
  status?: 'OPEN' | 'CLOSED' | 'CANCELLED';
}
