import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class BroadcastNotificationDto {
  @IsOptional()
  @IsBoolean()
  toAll?: boolean;

  @ValidateIf((dto: BroadcastNotificationDto) => !dto.toAll)
  @IsArray()
  @ArrayNotEmpty({
    message: 'Cần chọn ít nhất 1 người dùng, hoặc bật gửi cho tất cả',
  })
  @IsString({ each: true })
  userIds?: string[];

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;
}
