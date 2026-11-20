import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreatePromiseDto,
  SignPromiseDto,
  UpdatePromiseDto,
} from './dto/promise.dto';
import { PromisesService } from './promises.service';

@Controller()
export class PromisesController {
  constructor(private readonly promisesService: PromisesService) {}

  @Get('promises/verify/:documentCode')
  verify(@Param('documentCode') documentCode: string) {
    return this.promisesService.verifyByCode(documentCode);
  }

  @UseGuards(JwtAuthGuard)
  @Get('promises')
  list(@CurrentUser() user: AuthUser) {
    return this.promisesService.list(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('promises/:id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promisesService.getOne(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('promises')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePromiseDto) {
    return this.promisesService.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('promises/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePromiseDto,
  ) {
    return this.promisesService.updateContent(user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('promises/:id/sign')
  sign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SignPromiseDto,
  ) {
    return this.promisesService.sign(user.id, id, dto);
  }
}
