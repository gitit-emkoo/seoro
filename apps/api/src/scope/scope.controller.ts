import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApproveScopeDto } from './dto/approve-scope.dto';
import { SaveScopeDto } from './dto/save-scope.dto';
import { ScopeService } from './scope.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ScopeController {
  constructor(private readonly scopeService: ScopeService) {}

  @Get('verification-items')
  listItems() {
    return this.scopeService.listItems();
  }

  @Get('product-plans')
  listPlans() {
    return this.scopeService.listPlans();
  }

  @Get('product-plans/eligible')
  eligiblePlans(@CurrentUser() user: AuthUser) {
    return this.scopeService.resolveAgreedPlan(user.id);
  }

  @Get('scope/me')
  me(@CurrentUser() user: AuthUser) {
    return this.scopeService.getMySelection(user.id);
  }

  @Post('scope')
  save(@CurrentUser() user: AuthUser, @Body() dto: SaveScopeDto) {
    return this.scopeService.saveSelection(user.id, dto);
  }

  @Post('scope/reset')
  reset(@CurrentUser() user: AuthUser) {
    return this.scopeService.resetSelection(user.id);
  }

  @Get('scope/compare')
  compare(@CurrentUser() user: AuthUser) {
    return this.scopeService.compare(user.id);
  }

  @Post('scope/approve')
  approve(@CurrentUser() user: AuthUser, @Body() dto: ApproveScopeDto) {
    return this.scopeService.approve(user.id, dto.approvedItemIds);
  }
}
