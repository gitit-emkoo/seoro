import { Module } from '@nestjs/common';
import { CoupleAccessService } from '../common/couple-access.service';
import { StorageService } from '../storage/storage.service';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  controllers: [SubmissionsController],
  providers: [SubmissionsService, CoupleAccessService, StorageService],
  exports: [SubmissionsService, StorageService],
})
export class SubmissionsModule {}
