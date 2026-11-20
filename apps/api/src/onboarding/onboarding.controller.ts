import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ArrayUnique, IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OnboardingService } from './onboarding.service';

class CompleteOnboardingDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  selectedCodes!: string[];

  @IsOptional()
  @IsIn(['SELF', 'INVITE', 'SKIPPED'])
  source?: 'SELF' | 'INVITE' | 'SKIPPED';

  @IsOptional()
  @IsString()
  note?: string;
}

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('cards')
  cards() {
    return this.onboardingService.listCards();
  }

  @UseGuards(JwtAuthGuard)
  @Post('complete')
  complete(@CurrentUser() user: AuthUser, @Body() dto: CompleteOnboardingDto) {
    return this.onboardingService.complete(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('survey')
  survey(@CurrentUser() user: AuthUser) {
    return this.onboardingService.getSurvey(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('next')
  next(@CurrentUser() user: AuthUser) {
    return this.onboardingService.resolveNextPath(user.id);
  }
}
