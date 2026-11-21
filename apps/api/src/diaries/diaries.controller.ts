import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DiariesService, DiaryScope } from './diaries.service';
import { UpdateDiaryDto, UpsertDiaryDto } from './dto/diary.dto';

class ListDiariesQuery {
  @IsOptional()
  @IsIn(['mine', 'partner', 'both'])
  scope?: DiaryScope;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

@Controller()
export class DiariesController {
  constructor(private readonly diariesService: DiariesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('diaries')
  list(@CurrentUser() user: AuthUser, @Query() query: ListDiariesQuery) {
    return this.diariesService.list(user.id, {
      scope: query.scope,
      from: query.from,
      to: query.to,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('diaries/:date')
  getByDate(@CurrentUser() user: AuthUser, @Param('date') date: string) {
    return this.diariesService.getByDate(user.id, date);
  }

  @UseGuards(JwtAuthGuard)
  @Post('diaries')
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertDiaryDto) {
    return this.diariesService.upsert(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('diaries/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDiaryDto,
  ) {
    return this.diariesService.update(user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('diaries/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.diariesService.remove(user.id, id);
  }
}
