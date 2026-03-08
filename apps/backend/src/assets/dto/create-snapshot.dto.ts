import { IsNumber, IsOptional, IsString, Min, Matches } from 'class-validator';

export class CreateSnapshotDto {
  @IsNumber()
  @Min(0)
  value!: number;

  /** YYYY-MM-DD — the specific date this snapshot represents */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;
}
