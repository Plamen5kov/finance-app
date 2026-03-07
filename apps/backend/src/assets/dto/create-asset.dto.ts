import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ALL_FINANCIAL_TYPES } from '@finances/shared';

export class CreateAssetDto {
  @IsString()
  @IsIn([...ALL_FINANCIAL_TYPES])
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
