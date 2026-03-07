import { IsString, IsOptional, IsIn, MaxLength, Matches } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsString()
  @IsIn(['income', 'expense', 'goal', 'required'])
  type!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color e.g. #FF6B6B' })
  color?: string;

}
