import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Họ tên tối thiểu 2 ký tự' })
  @MaxLength(100)
  fullName?: string;

  // null hoặc chuỗi rỗng => xoá số điện thoại
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @Matches(/^(0|\+84)\d{9,10}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string | null;

  // null => xoá ảnh đại diện, trở về mặc định
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl()
  avatarUrl?: string | null;
}
