import { PromiseCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePromiseDto {
  @IsEnum(PromiseCategory)
  category!: PromiseCategory;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsString()
  @MinLength(20)
  authorSignature!: string;
}

export class SignPromiseDto {
  @IsString()
  @MinLength(20)
  signature!: string;
}

export class UpdatePromiseDto {
  @IsOptional()
  @IsEnum(PromiseCategory)
  category?: PromiseCategory;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsString()
  condition?: string;
}
