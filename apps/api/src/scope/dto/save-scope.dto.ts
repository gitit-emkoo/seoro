import { ProductCode } from '@prisma/client';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class SaveScopeDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  itemIds!: string[];

  @IsOptional()
  @IsEnum(ProductCode)
  planCode?: ProductCode;
}
