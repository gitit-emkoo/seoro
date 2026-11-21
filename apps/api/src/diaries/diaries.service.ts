import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoupleAccessService } from '../common/couple-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDiaryDto, UpsertDiaryDto } from './dto/diary.dto';

export type DiaryScope = 'mine' | 'partner' | 'both';

@Injectable()
export class DiariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coupleAccess: CoupleAccessService,
  ) {}

  private kstToday() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private assertDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('날짜는 YYYY-MM-DD 형식이어야 합니다.');
    }
  }

  private partnerUserId(
    members: Array<{ userId: string }>,
    userId: string,
  ) {
    const partner = members.find((m) => m.userId !== userId);
    if (!partner) throw new BadRequestException('상대방 정보가 없습니다.');
    return partner.userId;
  }

  private mapMine(row: {
    id: string;
    coupleRoomId: string;
    userId: string;
    entryDate: string;
    emotionCode: string;
    triggerCodes: string[];
    comment: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      coupleRoomId: row.coupleRoomId,
      userId: row.userId,
      entryDate: row.entryDate,
      emotionCode: row.emotionCode,
      triggerCodes: row.triggerCodes,
      comment: row.comment,
      isMine: true as const,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapPartner(row: {
    id: string;
    coupleRoomId: string;
    userId: string;
    entryDate: string;
    emotionCode: string;
    triggerCodes: string[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      coupleRoomId: row.coupleRoomId,
      userId: row.userId,
      entryDate: row.entryDate,
      emotionCode: row.emotionCode,
      triggerCodes: row.triggerCodes,
      isMine: false as const,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async list(
    userId: string,
    opts: { scope?: DiaryScope; from?: string; to?: string } = {},
  ) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    const scope: DiaryScope = opts.scope ?? 'both';
    if (opts.from) this.assertDate(opts.from);
    if (opts.to) this.assertDate(opts.to);

    const dateFilter =
      opts.from || opts.to
        ? {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          }
        : undefined;

    const partnerId = this.partnerUserId(
      membership.coupleRoom.members,
      userId,
    );

    const userFilter =
      scope === 'mine'
        ? { userId }
        : scope === 'partner'
          ? { userId: partnerId }
          : { userId: { in: [userId, partnerId] } };

    const rows = await this.prisma.emotionDiary.findMany({
      where: {
        coupleRoomId: membership.coupleRoomId,
        ...userFilter,
        ...(dateFilter ? { entryDate: dateFilter } : {}),
      },
      orderBy: { entryDate: 'desc' },
    });

    return rows.map((row) =>
      row.userId === userId ? this.mapMine(row) : this.mapPartner(row),
    );
  }

  async getByDate(userId: string, date: string) {
    this.assertDate(date);
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    const row = await this.prisma.emotionDiary.findUnique({
      where: {
        coupleRoomId_userId_entryDate: {
          coupleRoomId: membership.coupleRoomId,
          userId,
          entryDate: date,
        },
      },
    });
    if (!row) return null;
    return this.mapMine(row);
  }

  async upsert(userId: string, dto: UpsertDiaryDto) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    const entryDate = dto.entryDate || this.kstToday();
    this.assertDate(entryDate);

    const row = await this.prisma.emotionDiary.upsert({
      where: {
        coupleRoomId_userId_entryDate: {
          coupleRoomId: membership.coupleRoomId,
          userId,
          entryDate,
        },
      },
      create: {
        coupleRoomId: membership.coupleRoomId,
        userId,
        entryDate,
        emotionCode: dto.emotionCode,
        triggerCodes: dto.triggerCodes,
        comment: dto.comment?.trim() ?? '',
      },
      update: {
        emotionCode: dto.emotionCode,
        triggerCodes: dto.triggerCodes,
        comment: dto.comment?.trim() ?? '',
      },
    });

    return this.mapMine(row);
  }

  async update(userId: string, id: string, dto: UpdateDiaryDto) {
    await this.coupleAccess.requireActiveMembership(userId);
    const existing = await this.prisma.emotionDiary.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('일기를 찾을 수 없습니다.');
    if (existing.userId !== userId) {
      throw new ForbiddenException('본인 일기만 수정할 수 있습니다.');
    }

    const row = await this.prisma.emotionDiary.update({
      where: { id },
      data: {
        ...(dto.emotionCode ? { emotionCode: dto.emotionCode } : {}),
        ...(dto.triggerCodes ? { triggerCodes: dto.triggerCodes } : {}),
        ...(dto.comment !== undefined ? { comment: dto.comment.trim() } : {}),
      },
    });
    return this.mapMine(row);
  }

  async remove(userId: string, id: string) {
    await this.coupleAccess.requireActiveMembership(userId);
    const existing = await this.prisma.emotionDiary.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('일기를 찾을 수 없습니다.');
    if (existing.userId !== userId) {
      throw new ForbiddenException('본인 일기만 삭제할 수 있습니다.');
    }
    await this.prisma.emotionDiary.delete({ where: { id } });
    return { ok: true };
  }
}
