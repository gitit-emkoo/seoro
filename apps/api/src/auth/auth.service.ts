import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { decodeUploadFileName } from '../common/filename.util';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly storage: StorageService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name?.trim() || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarKey: true,
        createdAt: true,
      },
    });

    return {
      user: { ...user, hasAvatar: Boolean(user.avatarKey) },
      accessToken: await this.signToken(user.id, user.email),
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        hasAvatar: Boolean(user.avatarKey),
        createdAt: user.createdAt,
      },
      accessToken: await this.signToken(user.id, user.email),
    };
  }

  /** 로컬 테스트용. 이메일 인증 없이 새 비밀번호로 교체 */
  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE') {
      throw new NotFoundException('해당 이메일의 계정을 찾을 수 없습니다.');
    }
    if (user.role === 'ADMIN') {
      throw new ForbiddenException('관리자 비밀번호는 이 경로로 변경할 수 없습니다.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { ok: true, message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarKey: true,
        role: true,
        phoneVerified: true,
        identityVerified: true,
        onboardingCompletedAt: true,
        onboardingSource: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        coupleRoom: {
          select: {
            id: true,
            status: true,
            connectedAt: true,
            createdAt: true,
          },
        },
      },
    });

    const survey = await this.prisma.onboardingSurvey.findUnique({
      where: { userId },
      select: { selectedCodes: true, completedAt: true },
    });

    const { avatarKey, ...rest } = user;

    return {
      ...rest,
      hasAvatar: Boolean(avatarKey),
      onboardingCompleted: Boolean(user.onboardingCompletedAt),
      survey,
      couple: membership
        ? {
            roomId: membership.coupleRoom.id,
            role: membership.role,
            status: membership.coupleRoom.status,
            connectedAt: membership.coupleRoom.connectedAt,
            createdAt: membership.coupleRoom.createdAt,
          }
        : null,
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }
    if (!AVATAR_MIME.has(file.mimetype)) {
      throw new BadRequestException('JPEG, PNG, WebP 이미지만 올릴 수 있습니다.');
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw new BadRequestException('프로필 사진은 5MB 이하여야 합니다.');
    }

    const stored = await this.storage.savePrivate(
      userId,
      decodeUploadFileName(file.originalname || 'avatar.jpg'),
      file.buffer,
    );

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarKey: stored.key },
      select: { id: true, email: true, name: true, avatarKey: true },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      hasAvatar: true,
    };
  }

  async clearAvatar(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarKey: null },
      select: { id: true, email: true, name: true },
    });
    return { ...user, hasAvatar: false };
  }

  async openAvatar(viewerId: string, targetUserId: string) {
    await this.assertCanViewAvatar(viewerId, targetUserId);

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { avatarKey: true },
    });
    if (!user?.avatarKey) {
      throw new NotFoundException('프로필 사진이 없습니다.');
    }

    return {
      key: user.avatarKey,
      stream: this.storage.openReadStream(user.avatarKey),
    };
  }

  private async assertCanViewAvatar(viewerId: string, targetUserId: string) {
    if (viewerId === targetUserId) return;

    const viewer = await this.prisma.coupleMember.findFirst({
      where: { userId: viewerId, status: 'ACTIVE' },
    });
    if (!viewer) {
      throw new ForbiddenException('프로필 사진을 볼 수 없습니다.');
    }

    const target = await this.prisma.coupleMember.findFirst({
      where: {
        userId: targetUserId,
        status: 'ACTIVE',
        coupleRoomId: viewer.coupleRoomId,
      },
    });
    if (!target) {
      throw new ForbiddenException('프로필 사진을 볼 수 없습니다.');
    }
  }

  private signToken(userId: string, email: string) {
    return this.jwt.signAsync({ sub: userId, email });
  }
}
