import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoupleAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireActiveMembership(userId: string) {
    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        coupleRoom: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              include: {
                user: { select: { id: true, email: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('활성 커플 공간이 없습니다.');
    }

    if (membership.coupleRoom.status !== 'ACTIVE') {
      throw new ForbiddenException('커플 연결이 완료된 후 이용할 수 있습니다.');
    }

    return membership;
  }

  async requireMemberOfRoom(userId: string, coupleRoomId: string) {
    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId, coupleRoomId, status: 'ACTIVE' },
    });
    if (!membership) {
      throw new ForbiddenException('해당 커플 공간에 접근할 수 없습니다.');
    }
    return membership;
  }
}
