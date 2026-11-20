import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';

class CreateOrderDto {
  @IsString()
  productPlanId!: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('orders/current')
  current(@CurrentUser() user: AuthUser) {
    return this.ordersService.getCurrent(user.id);
  }

  @Post('orders')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.createFromAgreement(user.id, dto.productPlanId);
  }

  @Post('payments/mock-pay')
  mockPay(@CurrentUser() user: AuthUser) {
    return this.ordersService.mockPay(user.id);
  }

  @Post('orders/cancel')
  cancel(@CurrentUser() user: AuthUser) {
    return this.ordersService.cancelCurrent(user.id);
  }
}
