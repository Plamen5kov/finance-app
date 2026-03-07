import { IsString, IsNumber, IsOptional, IsIn, Min, MaxLength, IsObject } from 'class-validator';
import { LIABILITY_TYPES } from '@finances/shared';

export class CreateLiabilityDto {
  @IsString()
  @IsIn([...LIABILITY_TYPES])
  type!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}
