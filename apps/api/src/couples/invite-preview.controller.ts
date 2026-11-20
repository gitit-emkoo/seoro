import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { hashToken } from '../common/crypto.util';
import { PrismaService } from '../prisma/prisma.service';

@Controller('couples/invites')
export class InvitePreviewController {
  constructor(private readonly prisma: PrismaService) {}

  /** 초대받은 사람을 위한 공개 프리뷰. 개인정보는 노출하지 않습니다. */
  @Get('preview')
  async preview(
    @Query('token') token?: string,
    @Query('code') code?: string,
  ) {
    if (!token && !code) {
      throw new NotFoundException('초대 정보가 필요합니다.');
    }

    const invite = await this.prisma.invitation.findFirst({
      where: token
        ? { tokenHash: hashToken(token.trim()) }
        : { invitationCode: code!.trim() },
      select: {
        status: true,
        expiresAt: true,
        invitationCode: true,
        coupleRoom: { select: { status: true } },
      },
    });

    if (!invite) {
      throw new NotFoundException('유효하지 않은 초대입니다.');
    }

    const expired = invite.expiresAt.getTime() < Date.now();
    const usable =
      invite.status === 'PENDING' &&
      !expired &&
      invite.coupleRoom.status === 'WAITING_PARTNER';

    return {
      usable,
      status: expired && invite.status === 'PENDING' ? 'EXPIRED' : invite.status,
      expiresAt: invite.expiresAt,
      maskedCode: invite.invitationCode.replace(/^(\d{2})\d+(\d{2})$/, '$1****$2'),
      principles: [
        '한 사람만 확인하는 구조가 아닙니다.',
        '두 사람이 같은 기준으로 함께 확인합니다.',
        '서로의 자료는 동의 없이 공개되지 않습니다.',
      ],
    };
  }
}
