import { Module } from '@nestjs/common';
import { CouplesController } from './couples.controller';
import { CouplesService } from './couples.service';
import { InvitePreviewController } from './invite-preview.controller';

@Module({
  controllers: [CouplesController, InvitePreviewController],
  providers: [CouplesService],
  exports: [CouplesService],
})
export class CouplesModule {}
