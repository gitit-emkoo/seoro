import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PromiseCategory } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { CoupleAccessService } from '../common/couple-access.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePromiseDto,
  SignPromiseDto,
  UpdatePromiseDto,
} from './dto/promise.dto';

const userSelect = { id: true, email: true, name: true } as const;

@Injectable()
export class PromisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coupleAccess: CoupleAccessService,
  ) {}

  private async requirePromiseUnlocked(coupleRoomId: string) {
    const members = await this.prisma.coupleMember.findMany({
      where: { coupleRoomId, status: 'ACTIVE' },
    });
    if (members.length < 2) {
      throw new ForbiddenException('양측 연결 후 약속을 사용할 수 있습니다.');
    }
    const consents = await this.prisma.disclosureConsent.findMany({
      where: { coupleRoomId },
    });
    const mutualReady = members.every((m) =>
      consents.some((c) => c.userId === m.userId && c.status === 'CONSENTED'),
    );
    if (!mutualReady) {
      throw new ForbiddenException('서로 확인을 마친 뒤 약속을 사용할 수 있습니다.');
    }
  }

  private partnerOf(members: Array<{ userId: string }>, userId: string) {
    const partner = members.find((m) => m.userId !== userId);
    if (!partner) throw new BadRequestException('상대방 정보가 없습니다.');
    return partner;
  }

  private contentFingerprint(input: {
    title: string;
    content: string;
    condition: string;
    category: string;
    version: number;
  }) {
    return createHash('sha256')
      .update(
        `${input.category}|${input.title}|${input.content}|${input.condition}|v${input.version}`,
      )
      .digest('hex');
  }

  private documentCode() {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `SEORO-${stamp}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private mapPromise(p: {
    id: string;
    coupleRoomId: string;
    authorId: string;
    partnerId: string;
    category: string;
    title: string;
    content: string;
    condition: string;
    status: string;
    authorSignature: string | null;
    partnerSignature: string | null;
    authorSignedAt: Date | null;
    partnerSignedAt: Date | null;
    documentCode: string | null;
    contentHash: string | null;
    completedAt: Date | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    author?: { id: string; email: string; name: string | null };
    partner?: { id: string; email: string; name: string | null };
  }) {
    return p;
  }

  async list(userId: string) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    await this.requirePromiseUnlocked(membership.coupleRoomId);

    const rows = await this.prisma.couplePromise.findMany({
      where: { coupleRoomId: membership.coupleRoomId },
      include: {
        author: { select: userSelect },
        partner: { select: userSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapPromise(r));
  }

  async getOne(userId: string, id: string) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    await this.requirePromiseUnlocked(membership.coupleRoomId);

    const row = await this.prisma.couplePromise.findFirst({
      where: { id, coupleRoomId: membership.coupleRoomId },
      include: {
        author: { select: userSelect },
        partner: { select: userSelect },
      },
    });
    if (!row) throw new NotFoundException('약속을 찾을 수 없습니다.');
    return this.mapPromise(row);
  }

  async create(userId: string, dto: CreatePromiseDto) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    await this.requirePromiseUnlocked(membership.coupleRoomId);
    const partner = this.partnerOf(membership.coupleRoom.members, userId);

    const version = 1;
    const contentHash = this.contentFingerprint({
      category: dto.category,
      title: dto.title.trim(),
      content: dto.content.trim(),
      condition: (dto.condition ?? '').trim(),
      version,
    });

    const created = await this.prisma.couplePromise.create({
      data: {
        coupleRoomId: membership.coupleRoomId,
        authorId: userId,
        partnerId: partner.userId,
        category: dto.category,
        title: dto.title.trim(),
        content: dto.content.trim(),
        condition: (dto.condition ?? '').trim(),
        status: 'AWAITING_PARTNER',
        authorSignature: dto.authorSignature,
        authorSignedAt: new Date(),
        contentHash,
        version,
      },
      include: {
        author: { select: userSelect },
        partner: { select: userSelect },
      },
    });
    return this.mapPromise(created);
  }

  async updateContent(userId: string, id: string, dto: UpdatePromiseDto) {
    const current = await this.getOne(userId, id);
    if (current.status === 'COMPLETED' || current.status === 'CANCELLED') {
      throw new BadRequestException('확정된 약속은 수정할 수 없습니다. 새 약속을 만들어 주세요.');
    }
    if (current.partnerId !== userId) {
      throw new ForbiddenException('상대방만 내용을 수정해 재전송할 수 있습니다.');
    }

    const version = current.version + 1;
    const title = (dto.title ?? current.title).trim();
    const content = (dto.content ?? current.content).trim();
    const condition = (dto.condition ?? current.condition).trim();
    const category: PromiseCategory =
      dto.category ?? (current.category as PromiseCategory);

    const updated = await this.prisma.couplePromise.update({
      where: { id },
      data: {
        title,
        content,
        condition,
        category: category,
        version,
        status: 'AWAITING_AUTHOR',
        authorSignature: null,
        partnerSignature: null,
        authorSignedAt: null,
        partnerSignedAt: null,
        documentCode: null,
        completedAt: null,
        contentHash: this.contentFingerprint({
          category,
          title,
          content,
          condition,
          version,
        }),
      },
      include: {
        author: { select: userSelect },
        partner: { select: userSelect },
      },
    });
    return this.mapPromise(updated);
  }

  async sign(userId: string, id: string, dto: SignPromiseDto) {
    const current = await this.getOne(userId, id);
    if (current.status === 'COMPLETED') {
      throw new BadRequestException('이미 확정된 약속입니다.');
    }
    if (current.status === 'CANCELLED') {
      throw new BadRequestException('취소된 약속입니다.');
    }

    // 작성자 재서명 (상대가 수정한 뒤)
    if (current.status === 'AWAITING_AUTHOR') {
      if (current.authorId !== userId) {
        throw new ForbiddenException('작성자 재서명이 필요합니다.');
      }
      const updated = await this.prisma.couplePromise.update({
        where: { id },
        data: {
          authorSignature: dto.signature,
          authorSignedAt: new Date(),
          partnerSignature: null,
          partnerSignedAt: null,
          status: 'AWAITING_PARTNER',
        },
        include: {
          author: { select: userSelect },
          partner: { select: userSelect },
        },
      });
      return this.mapPromise(updated);
    }

    // 상대 서명 → 확정
    if (current.status === 'AWAITING_PARTNER') {
      if (current.partnerId !== userId) {
        throw new ForbiddenException('상대방만 서명할 수 있습니다.');
      }
      if (!current.authorSignature) {
        throw new BadRequestException('작성자 서명이 없습니다.');
      }

      const documentCode = this.documentCode();
      const updated = await this.prisma.couplePromise.update({
        where: { id },
        data: {
          partnerSignature: dto.signature,
          partnerSignedAt: new Date(),
          status: 'COMPLETED',
          documentCode,
          completedAt: new Date(),
          contentHash: this.contentFingerprint({
            category: current.category,
            title: current.title,
            content: current.content,
            condition: current.condition,
            version: current.version,
          }),
        },
        include: {
          author: { select: userSelect },
          partner: { select: userSelect },
        },
      });
      return this.mapPromise(updated);
    }

    throw new BadRequestException('현재 상태에서는 서명할 수 없습니다.');
  }

  async verifyByCode(documentCode: string) {
    const row = await this.prisma.couplePromise.findUnique({
      where: { documentCode },
      include: {
        author: { select: userSelect },
        partner: { select: userSelect },
      },
    });
    if (!row || row.status !== 'COMPLETED') {
      throw new NotFoundException('인증된 약속을 찾을 수 없습니다.');
    }
    return {
      documentCode: row.documentCode,
      title: row.title,
      status: row.status,
      completedAt: row.completedAt,
      authorName: row.author.name || row.author.email,
      partnerName: row.partner.name || row.partner.email,
      authorSignedAt: row.authorSignedAt,
      partnerSignedAt: row.partnerSignedAt,
      version: row.version,
      contentHash: row.contentHash,
    };
  }
}
