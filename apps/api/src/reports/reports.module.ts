import { Module } from '@nestjs/common';
import { CoupleAccessService } from '../common/couple-access.service';
import { SubmissionsModule } from '../submissions/submissions.module';
import { DisclosureService } from './disclosure.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [SubmissionsModule],
  controllers: [ReportsController],
  providers: [ReportsService, DisclosureService, CoupleAccessService],
})
export class ReportsModule {}
