import { Module } from '@nestjs/common';
import { CoupleAccessService } from '../common/couple-access.service';
import { PromisesController } from './promises.controller';
import { PromisesService } from './promises.service';

@Module({
  controllers: [PromisesController],
  providers: [PromisesService, CoupleAccessService],
  exports: [PromisesService],
})
export class PromisesModule {}
