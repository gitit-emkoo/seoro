import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ApproveScopeDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  approvedItemIds!: string[];
}
