import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DisclosureService } from './disclosure.service';
import { ReportsService } from './reports.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly disclosureService: DisclosureService,
  ) {}

  @Get('reports/me')
  myReport(@CurrentUser() user: AuthUser) {
    return this.reportsService.myReport(user.id);
  }

  @Get('reports/mutual')
  mutual(@CurrentUser() user: AuthUser) {
    return this.reportsService.mutualReport(user.id);
  }

  @Get('disclosure/me')
  disclosureMe(@CurrentUser() user: AuthUser) {
    return this.disclosureService.me(user.id);
  }

  @Post('disclosure/consent')
  consent(@CurrentUser() user: AuthUser) {
    return this.disclosureService.consent(user.id);
  }
}
