import { IsNumber, IsString, Min, Matches } from 'class-validator';

export class CreateSnapshotDto {
  @IsNumber()
  @Min(0)
  value!: number;

  /** YYYY-MM — the month this snapshot represents */
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;
}
