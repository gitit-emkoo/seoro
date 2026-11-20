import { Injectable, NotFoundException } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async log(
    actorId: string,
    action: string,
    targetType: string,
    targetId?: string,
    metadata?: object,
  ) {
    await this.prisma.adminAuditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        metadata: metadata ?? undefined,
      },
    });
  }

  listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listRooms() {
    return this.prisma.coupleRoom.findMany({
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
        _count: {
          select: { orders: true, submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  listOrders() {
    return this.prisma.order.findMany({
      include: {
        productPlan: true,
        payments: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
        coupleRoom: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  listItems() {
    return this.prisma.verificationItem.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  listPlans() {
    return this.prisma.productPlan.findMany({
      include: { items: { include: { verificationItem: true } } },
    });
  }

  async updatePlanPrice(
    actorId: string,
    planId: string,
    totalAmount: number,
    perPersonAmount: number,
  ) {
    const plan = await this.prisma.productPlan.update({
      where: { id: planId },
      data: { totalAmount, perPersonAmount },
    });
    await this.log(actorId, 'UPDATE_PLAN_PRICE', 'ProductPlan', planId, {
      totalAmount,
      perPersonAmount,
    });
    return plan;
  }

  async updateItem(
    actorId: string,
    itemId: string,
    data: {
      title?: string;
      description?: string;
      isActive?: boolean;
      legalAvailabilityStatus?: 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';
    },
  ) {
    const item = await this.prisma.verificationItem.update({
      where: { id: itemId },
      data,
    });
    await this.log(actorId, 'UPDATE_ITEM', 'VerificationItem', itemId, data);
    return item;
  }

  listSubmissions() {
    return this.prisma.submission.findMany({
      where: { status: { not: 'NOT_SUBMITTED' } },
      include: {
        user: { select: { id: true, email: true, name: true } },
        verificationItem: true,
        verification: true,
        coupleRoom: { select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async reviewSubmission(
    actorId: string,
    submissionId: string,
    dto: {
      status: Extract<
        SubmissionStatus,
        'UNDER_REVIEW' | 'NEEDS_REVISION' | 'VERIFIED' | 'UNVERIFIABLE'
      >;
      revisionRequest?: string;
      resultSummary?: string;
      unverifiableReason?: string;
    },
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException('제출 자료를 찾을 수 없습니다.');

    // 관리자 육안 확인만으로 공식 진위 완료처럼 처리하지 않도록
    // VERIFIED여도 officialCheckStatus는 NONE 유지 (기관 API 없음)
    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: dto.status,
        verification: {
          upsert: {
            create: {
              method: 'MANUAL_REVIEW',
              officialCheckStatus: 'NONE',
              adminReviewStatus: dto.status,
              revisionRequest: dto.revisionRequest,
              resultSummary: dto.resultSummary,
              unverifiableReason: dto.unverifiableReason,
              reviewerId: actorId,
              verifiedAt: dto.status === 'VERIFIED' ? new Date() : null,
            },
            update: {
              adminReviewStatus: dto.status,
              revisionRequest: dto.revisionRequest,
              resultSummary: dto.resultSummary,
              unverifiableReason: dto.unverifiableReason,
              reviewerId: actorId,
              verifiedAt: dto.status === 'VERIFIED' ? new Date() : null,
              officialCheckStatus: 'NONE',
            },
          },
        },
      },
      include: { verification: true, verificationItem: true },
    });

    await this.log(actorId, 'REVIEW_SUBMISSION', 'Submission', submissionId, dto);
    return updated;
  }

  listDisclosure() {
    return this.prisma.disclosureConsent.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        coupleRoom: { select: { id: true, status: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  listLogs() {
    return this.prisma.adminAuditLog.findMany({
      include: {
        actor: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
