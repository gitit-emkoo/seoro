import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const EMOTION_CODES = [
  'HAPPY',
  'LOVE',
  'CALM',
  'SAD',
  'ANGRY',
  'ANXIOUS',
  'EXCITED',
  'LONELY',
  'GRATEFUL',
  'NUMB',
] as const;

export const TRIGGER_CODES = [
  'ACTIVITY',
  'FAMILY',
  'FRIEND',
  'HEALTH',
  'PARTNER',
  'SOCIETY',
  'PARTICIPATION',
  'RELATIONSHIP',
  'IDENTITY',
  'WORK',
  'TRAVEL',
  'SHOW',
  'EXERCISE',
  'STYLE',
  'EXAM',
  'FOOD',
] as const;

export class UpsertDiaryDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10)
  entryDate?: string;

  @IsString()
  @IsIn([...EMOTION_CODES])
  emotionCode!: string;

  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @IsIn([...TRIGGER_CODES], { each: true })
  triggerCodes!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class UpdateDiaryDto {
  @IsOptional()
  @IsString()
  @IsIn([...EMOTION_CODES])
  emotionCode?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @IsIn([...TRIGGER_CODES], { each: true })
  triggerCodes?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
