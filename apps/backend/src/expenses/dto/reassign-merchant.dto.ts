import { IsString } from 'class-validator';

export class ReassignMerchantDto {
  @IsString()
  merchant!: string;

  @IsString()
  categoryId!: string;
}
