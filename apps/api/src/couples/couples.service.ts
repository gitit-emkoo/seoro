import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateInvitationCode,
  generateInviteToken,
  hashToken,
} from '../common/crypto.util';

const INVITE_TTL_HOURS = 48;

@Injectable()
export class CouplesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyRoom(userId: string) {
    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        coupleRoom: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              include: {
                user: {
                  select: { id: true, email: true, name: true, avatarKey: true },
                },
              },
            },
            invitations: {
              where: { status: 'PENDING' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!membership) {
      return null;
    }

    const room = membership.coupleRoom;
    const activeInvite = room.invitations[0];

    return {
      id: room.id,
      status: room.status,
      role: membership.role,
      createdAt: room.createdAt,
      connectedAt: room.connectedAt,
      members: room.members.map((m) => ({
        userId: m.user.id,
        email: m.user.email,
        name: m.user.name,
        hasAvatar: Boolean(m.user.avatarKey),
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      pendingInvite: activeInvite
        ? {
            invitationCode: activeInvite.invitationCode,
            expiresAt: activeInvite.expiresAt,
            status: activeInvite.status,
          }
        : null,
    };
  }

  async createRoom(userId: string) {
    const existing = await this.prisma.coupleMember.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    if (existing) {
      throw new ConflictException('이미 활성 커플 공간에 참여 중입니다.');
    }

    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);
    const rawToken = generateInviteToken();
    const invitationCode = await this.allocateInvitationCode();

    const result = await this.prisma.$transaction(async (tx) => {
      const room = await tx.coupleRoom.create({
        data: {
          createdById: userId,
          status: 'WAITING_PARTNER',
          members: {
            create: {
              userId,
              role: 'CREATOR',
              status: 'ACTIVE',
            },
          },
        },
      });

      const invitation = await tx.invitation.create({
        data: {
          coupleRoomId: room.id,
          createdById: userId,
          invitationCode,
          tokenHash: hashToken(rawToken),
          expiresAt,
          status: 'PENDING',
        },
      });

      return { room, invitation };
    });

    return {
      room: {
        id: result.room.id,
        status: result.room.status,
        createdAt: result.room.createdAt,
      },
      invite: {
        invitationCode: result.invitation.invitationCode,
        token: rawToken,
        expiresAt: result.invitation.expiresAt,
      },
    };
  }

  async regenerateInvite(userId: string) {
    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId, status: 'ACTIVE', role: 'CREATOR' },
      include: { coupleRoom: true },
    });

    if (!membership) {
      throw new NotFoundException('생성한 커플 공간이 없습니다.');
    }

    if (membership.coupleRoom.status !== 'WAITING_PARTNER') {
      throw new BadRequestException('이미 연결된 공간에서는 초대를 재발급할 수 없습니다.');
    }

    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);
    const rawToken = generateInviteToken();
    const invitationCode = await this.allocateInvitationCode();

    const invitation = await this.prisma.$transaction(async (tx) => {
      await tx.invitation.updateMany({
        where: {
          coupleRoomId: membership.coupleRoomId,
          status: 'PENDING',
        },
        data: { status: 'REVOKED' },
      });

      return tx.invitation.create({
        data: {
          coupleRoomId: membership.coupleRoomId,
          createdById: userId,
          invitationCode,
          tokenHash: hashToken(rawToken),
          expiresAt,
          status: 'PENDING',
        },
      });
    });

    return {
      invitationCode: invitation.invitationCode,
      token: rawToken,
      expiresAt: invitation.expiresAt,
    };
  }

  async joinByCode(userId: string, invitationCode: string) {
    return this.join(userId, { invitationCode: invitationCode.trim() });
  }

  async joinByToken(userId: string, token: string) {
    return this.join(userId, { tokenHash: hashToken(token.trim()) });
  }

  private async join(
    userId: string,
    lookup: { invitationCode?: string; tokenHash?: string },
  ) {
    const existing = await this.prisma.coupleMember.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    if (existing) {
      throw new ConflictException('이미 활성 커플 공간에 참여 중입니다.');
    }

    const invitation = await this.prisma.invitation.findFirst({
      where: {
        ...(lookup.invitationCode
          ? { invitationCode: lookup.invitationCode }
          : { tokenHash: lookup.tokenHash }),
      },
      include: { coupleRoom: true },
    });

    if (!invitation) {
      throw new NotFoundException('유효하지 않은 초대입니다.');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('이미 사용되었거나 만료된 초대입니다.');
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('만료된 초대입니다.');
    }

    if (invitation.createdById === userId) {
      throw new BadRequestException('자신이 만든 초대에는 참여할 수 없습니다.');
    }

    if (invitation.coupleRoom.status !== 'WAITING_PARTNER') {
      throw new BadRequestException('참여할 수 없는 커플 공간입니다.');
    }

    const connectedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.invitation.updateMany({
        where: { id: invitation.id, status: 'PENDING' },
        data: { status: 'USED', usedAt: connectedAt },
      });

      if (updated.count !== 1) {
        throw new BadRequestException('이미 사용된 초대입니다.');
      }

      await tx.coupleMember.create({
        data: {
          coupleRoomId: invitation.coupleRoomId,
          userId,
          role: 'PARTNER',
          status: 'ACTIVE',
        },
      });

      await tx.coupleRoom.update({
        where: { id: invitation.coupleRoomId },
        data: {
          status: 'ACTIVE',
          connectedAt,
        },
      });
    });

    return this.getMyRoom(userId);
  }

  private async allocateInvitationCode(): Promise<string> {
    for (let i = 0; i < 8; i += 1) {
      const code = generateInvitationCode();
      const exists = await this.prisma.invitation.findUnique({
        where: { invitationCode: code },
        select: { id: true },
      });
      if (!exists) {
        return code;
      }
    }
    throw new BadRequestException('초대번호 발급에 실패했습니다. 다시 시도해 주세요.');
  }
}
