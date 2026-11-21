import { Module } from '@nestjs/common';
import { CoupleAccessService } from '../common/couple-access.service';
import { DiariesController } from './diaries.controller';
import { DiariesService } from './diaries.service';

@Module({
  controllers: [DiariesController],
  providers: [DiariesService, CoupleAccessService],
  exports: [DiariesService],
})
export class DiariesModule {}
