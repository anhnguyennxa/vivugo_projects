import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CheckoutDto {
  @IsString()
  cartItemId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contactName: string;

  @Matches(/^(0|\+84)\d{9,10}$/, { message: 'Số điện thoại không hợp lệ' })
  contactPhone: string;

  @IsEmail({}, { message: 'Email không đúng định dạng' })
  contactEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
