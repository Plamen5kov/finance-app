import { IsNumber, IsString, Matches, Min } from 'class-validator';

export class RecordProgressDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be YYYY-MM format' })
  month!: string;

  @IsNumber()
  @Min(0)
  amount!: number;
}
