import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsIn,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @Min(0.01)
  targetAmount!: number;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsIn([null, 'monthly', 'annual'])
  recurringPeriod?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  priority?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}
