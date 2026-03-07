import { IsString, IsNumber, IsOptional, IsDateString, Min, MaxLength } from 'class-validator';

export class CreateExpenseDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  categoryId!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  merchant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  documentId?: string;
}
