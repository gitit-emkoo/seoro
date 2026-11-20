import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    if (!req.user?.id) {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, status: true },
    });
    if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE') {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }
    return true;
  }
}
