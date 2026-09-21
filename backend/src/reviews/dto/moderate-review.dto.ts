import { IsIn } from 'class-validator';

export class ModerateReviewDto {
  @IsIn(['APPROVED', 'HIDDEN'])
  status: 'APPROVED' | 'HIDDEN';
}
