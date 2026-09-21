import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  bookingId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MinLength(10)
  comment: string;
}
