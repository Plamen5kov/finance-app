import { IsOptional, IsString } from 'class-validator';

export class CreateInviteDto {
  @IsOptional()
  @IsString()
  role?: string;
}
