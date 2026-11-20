import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CouplesService } from './couples.service';
import { JoinInviteDto } from './dto/join-invite.dto';

@Controller('couples')
@UseGuards(JwtAuthGuard)
export class CouplesController {
  constructor(private readonly couplesService: CouplesService) {}

  @Get('me')
  getMyRoom(@CurrentUser() user: AuthUser) {
    return this.couplesService.getMyRoom(user.id);
  }

  @Post()
  createRoom(@CurrentUser() user: AuthUser) {
    return this.couplesService.createRoom(user.id);
  }

  @Post('invites/regenerate')
  regenerateInvite(@CurrentUser() user: AuthUser) {
    return this.couplesService.regenerateInvite(user.id);
  }

  @Post('join')
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinInviteDto) {
    if (dto.invitationCode) {
      return this.couplesService.joinByCode(user.id, dto.invitationCode);
    }
    if (dto.token) {
      return this.couplesService.joinByToken(user.id, dto.token);
    }
    throw new BadRequestException('초대번호 또는 토큰이 필요합니다.');
  }
}
