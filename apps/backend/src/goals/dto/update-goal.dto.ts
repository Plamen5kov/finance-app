import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  targetAmount?: number;

  @IsOptional()
  @IsString()
  targetDate?: string | null;

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

export class UpdateGoalStatusDto {
  @IsString()
  @IsIn(['active', 'at_risk', 'completed', 'archived'])
  status!: string;
}
