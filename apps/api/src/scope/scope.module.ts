import { Module } from '@nestjs/common';
import { CoupleAccessService } from '../common/couple-access.service';
import { ScopeController } from './scope.controller';
import { ScopeService } from './scope.service';

@Module({
  controllers: [ScopeController],
  providers: [ScopeService, CoupleAccessService],
  exports: [ScopeService],
})
export class ScopeModule {}
