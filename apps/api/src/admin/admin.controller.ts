import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

class UpdatePlanDto {
  @IsInt()
  @Min(0)
  totalAmount!: number;

  @IsInt()
  @Min(0)
  perPersonAmount!: number;
}

class UpdateItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(['AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as const)
  legalAvailabilityStatus?: 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';
}

class ReviewDto {
  @IsEnum(['UNDER_REVIEW', 'NEEDS_REVISION', 'VERIFIED', 'UNVERIFIABLE'] as const)
  status!: 'UNDER_REVIEW' | 'NEEDS_REVISION' | 'VERIFIED' | 'UNVERIFIABLE';

  @IsOptional()
  @IsString()
  revisionRequest?: string;

  @IsOptional()
  @IsString()
  resultSummary?: string;

  @IsOptional()
  @IsString()
  unverifiableReason?: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  users() {
    return this.adminService.listUsers();
  }

  @Get('rooms')
  rooms() {
    return this.adminService.listRooms();
  }

  @Get('orders')
  orders() {
    return this.adminService.listOrders();
  }

  @Get('items')
  items() {
    return this.adminService.listItems();
  }

  @Get('plans')
  plans() {
    return this.adminService.listPlans();
  }

  @Patch('plans/:id')
  updatePlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.adminService.updatePlanPrice(
      user.id,
      id,
      dto.totalAmount,
      dto.perPersonAmount,
    );
  }

  @Patch('items/:id')
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.adminService.updateItem(user.id, id, dto);
  }

  @Get('submissions')
  submissions() {
    return this.adminService.listSubmissions();
  }

  @Patch('submissions/:id/review')
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewDto,
  ) {
    return this.adminService.reviewSubmission(user.id, id, dto);
  }

  @Get('disclosure')
  disclosure() {
    return this.adminService.listDisclosure();
  }

  @Get('logs')
  logs() {
    return this.adminService.listLogs();
  }
}
