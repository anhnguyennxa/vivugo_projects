import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateAdminUserDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role?: 'USER' | 'ADMIN';
}
