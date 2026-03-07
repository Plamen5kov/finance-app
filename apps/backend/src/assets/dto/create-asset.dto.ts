import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @IsIn(['mortgage', 'etf', 'crypto', 'gold'])
  type!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costBasis?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}
