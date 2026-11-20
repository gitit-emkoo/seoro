import { Module } from '@nestjs/common';
import { CoupleAccessService } from '../common/couple-access.service';
import { ScopeModule } from '../scope/scope.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [ScopeModule],
  controllers: [OrdersController],
  providers: [OrdersService, CoupleAccessService],
  exports: [OrdersService],
})
export class OrdersModule {}
