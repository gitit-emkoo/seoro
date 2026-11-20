import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type VerifyStep = 'connect' | 'scope' | 'pay' | 'submit' | 'report';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  listCards() {
    return this.prisma.contentCard.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async complete(
    userId: string,
    dto: {
      selectedCodes: string[];
      source?: 'SELF' | 'INVITE' | 'SKIPPED';
      note?: string;
    },
  ) {
    const source = dto.source ?? 'SELF';
    await this.prisma.onboardingSurvey.upsert({
      where: { userId },
      update: {
        selectedCodes: dto.selectedCodes ?? [],
        note: dto.note,
        completedAt: new Date(),
      },
      create: {
        userId,
        selectedCodes: dto.selectedCodes ?? [],
        note: dto.note,
      },
    });

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompletedAt: new Date(),
        onboardingSource: source,
      },
      select: {
        id: true,
        onboardingCompletedAt: true,
        onboardingSource: true,
      },
    });
  }

  async getSurvey(userId: string) {
    return this.prisma.onboardingSurvey.findUnique({ where: { userId } });
  }

  /**
   * 서버 기준 다음 단계 + 서로공개 허브용 상태.
   * path: 로그인/재접속 시 보낼 기본 경로
   */
  async resolveNextPath(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        onboardingCompletedAt: true,
      },
    });
    if (!user) return { path: '/login' };
    if (user.role === 'ADMIN') return { path: '/admin' };

    if (!user.onboardingCompletedAt) {
      return {
        path: '/onboarding',
        reason: 'ONBOARDING_REQUIRED',
        verifyStep: 'connect' as VerifyStep,
        verifyComplete: false,
        mutualReady: false,
        promiseUnlocked: false,
        cta: null,
      };
    }

    const membership = await this.prisma.coupleMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { coupleRoom: true },
    });

    if (!membership) {
      return {
        path: '/home',
        reason: 'NEED_COUPLE_ROOM',
        verifyStep: 'connect' as VerifyStep,
        verifyComplete: false,
        mutualReady: false,
        promiseUnlocked: false,
        cta: { label: '우리 공간 만들기', href: '/home' },
      };
    }

    if (membership.coupleRoom.status === 'WAITING_PARTNER') {
      return {
        path: '/home',
        reason: 'WAITING_PARTNER',
        verifyStep: 'connect' as VerifyStep,
        verifyComplete: false,
        mutualReady: false,
        promiseUnlocked: false,
        cta: { label: '상대방 초대하기', href: '/home' },
      };
    }

    const agreement = await this.prisma.scopeAgreement.findFirst({
      where: {
        coupleRoomId: membership.coupleRoomId,
        status: 'AGREED',
      },
      orderBy: { version: 'desc' },
    });
    if (!agreement) {
      const mySelection = await this.prisma.scopeSelection.findUnique({
        where: {
          coupleRoomId_userId: {
            coupleRoomId: membership.coupleRoomId,
            userId,
          },
        },
      });
      if (!mySelection || mySelection.status !== 'SUBMITTED') {
        return {
          path: '/scope',
          reason: 'NEED_SCOPE_SELECTION',
          verifyStep: 'scope' as VerifyStep,
          verifyComplete: false,
          mutualReady: false,
          promiseUnlocked: false,
          cta: { label: '확인 항목 선택하기', href: '/scope' },
        };
      }
      return {
        path: '/scope/compare',
        reason: 'NEED_SCOPE_AGREEMENT',
        verifyStep: 'scope' as VerifyStep,
        verifyComplete: false,
        mutualReady: false,
        promiseUnlocked: false,
        cta: { label: '항목 합의하기', href: '/scope/compare' },
      };
    }

    const order = await this.prisma.order.findFirst({
      where: {
        coupleRoomId: membership.coupleRoomId,
        status: { in: ['AWAITING_PAYMENT', 'PARTIALLY_PAID', 'PAID'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { payments: true },
    });
    if (!order || order.status !== 'PAID') {
      return {
        path: '/order',
        reason: 'NEED_PAYMENT',
        verifyStep: 'pay' as VerifyStep,
        verifyComplete: false,
        mutualReady: false,
        promiseUnlocked: false,
        cta: { label: '결제하러 가기', href: '/order' },
      };
    }

    const mySubs = await this.prisma.submission.findMany({
      where: { coupleRoomId: membership.coupleRoomId, userId },
    });
    const needSubmit = mySubs.some(
      (s) => s.status === 'NOT_SUBMITTED' || s.status === 'NEEDS_REVISION',
    );
    if (needSubmit) {
      return {
        path: '/submissions',
        reason: 'NEED_SUBMISSION',
        verifyStep: 'submit' as VerifyStep,
        verifyComplete: false,
        mutualReady: false,
        promiseUnlocked: false,
        cta: { label: '자료 제출하기', href: '/submissions' },
      };
    }

    const consent = await this.prisma.disclosureConsent.findUnique({
      where: {
        coupleRoomId_userId: {
          coupleRoomId: membership.coupleRoomId,
          userId,
        },
      },
    });
    if (!consent || consent.status !== 'CONSENTED') {
      return {
        path: '/reports',
        reason: 'NEED_DISCLOSURE',
        verifyStep: 'report' as VerifyStep,
        verifyComplete: false,
        mutualReady: false,
        promiseUnlocked: false,
        cta: { label: '결과 확인하고 공개하기', href: '/reports' },
      };
    }

    const members = await this.prisma.coupleMember.findMany({
      where: { coupleRoomId: membership.coupleRoomId, status: 'ACTIVE' },
    });
    const consents = await this.prisma.disclosureConsent.findMany({
      where: { coupleRoomId: membership.coupleRoomId },
    });
    const mutualReady = members.every((m) =>
      consents.some((c) => c.userId === m.userId && c.status === 'CONSENTED'),
    );

    if (mutualReady) {
      return {
        path: '/app',
        reason: 'MUTUAL_READY',
        verifyStep: 'report' as VerifyStep,
        verifyComplete: true,
        mutualReady: true,
        promiseUnlocked: true,
        cta: { label: '보고서 보기', href: '/reports' },
        coupleRoomId: membership.coupleRoomId,
      };
    }

    return {
      path: '/home',
      reason: 'WAITING_PARTNER_DISCLOSURE',
      verifyStep: 'report' as VerifyStep,
      verifyComplete: false,
      mutualReady: false,
      promiseUnlocked: false,
      cta: { label: '결과 확인하기', href: '/reports' },
      coupleRoomId: membership.coupleRoomId,
    };
  }
}
