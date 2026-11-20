import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CoupleAccessService } from '../common/couple-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionsService } from '../submissions/submissions.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coupleAccess: CoupleAccessService,
    private readonly submissionsService: SubmissionsService,
  ) {}

  private statusNote(s: {
    status: string;
    verification: {
      resultSummary: string | null;
      revisionRequest: string | null;
      unverifiableReason: string | null;
    } | null;
  }) {
    if (s.status === 'VERIFIED') return s.verification?.resultSummary ?? null;
    if (s.status === 'NEEDS_REVISION') return s.verification?.revisionRequest ?? null;
    if (s.status === 'UNVERIFIABLE') return s.verification?.unverifiableReason ?? null;
    if (
      s.status === 'SUBMITTED' ||
      s.status === 'RESUBMITTED' ||
      s.status === 'UNDER_REVIEW'
    ) {
      return '공식 검증 경로가 확보되기 전까지 미검증(검토 대기)으로 관리됩니다.';
    }
    return null;
  }

  async myReport(userId: string) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    const paid = await this.prisma.order.findFirst({
      where: { coupleRoomId: membership.coupleRoomId, status: 'PAID' },
    });
    if (!paid) {
      throw new ForbiddenException('결제 완료 후 보고서를 확인할 수 있습니다.');
    }

    const completeness = await this.submissionsService.getCompleteness(
      membership.coupleRoomId,
      userId,
    );

    const submissions = await this.prisma.submission.findMany({
      where: { coupleRoomId: membership.coupleRoomId, userId },
      include: {
        verificationItem: true,
        verification: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      coupleRoomId: membership.coupleRoomId,
      generatedAt: new Date(),
      allSubmitted: completeness.allSubmitted,
      completeness,
      items: submissions.map((s) => ({
        verificationItemId: s.verificationItemId,
        title: s.verificationItem.title,
        submitted: this.submissionsService.isSubmissionComplete(s.status),
        status: s.status,
        statusNote: this.statusNote(s),
        submittedAt: s.submittedAt,
        updatedAt: s.updatedAt,
      })),
    };
  }

  async mutualReport(userId: string) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    const roomId = membership.coupleRoomId;

    const consents = await this.prisma.disclosureConsent.findMany({
      where: { coupleRoomId: roomId },
    });
    const members = membership.coupleRoom.members;
    const allConsented = members.every((m) =>
      consents.some((c) => c.userId === m.userId && c.status === 'CONSENTED'),
    );
    if (!allConsented) {
      throw new ForbiddenException(
        '양측 모두 공개에 동의한 뒤에만 상호 보고서를 열람할 수 있습니다.',
      );
    }

    for (const m of members) {
      await this.submissionsService.assertAllSubmitted(roomId, m.userId);
    }

    const submissions = await this.prisma.submission.findMany({
      where: { coupleRoomId: roomId },
      include: {
        verificationItem: true,
        user: { select: { id: true, name: true, email: true } },
        verification: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const buildPerson = (memberUserId: string) => {
      const member = members.find((m) => m.userId === memberUserId);
      const rows = submissions.filter((s) => s.userId === memberUserId);
      return {
        userId: memberUserId,
        name: member?.user.name ?? null,
        email: member?.user.email ?? rows[0]?.user.email ?? '',
        items: rows.map((s) => ({
          verificationItemId: s.verificationItemId,
          title: s.verificationItem.title,
          status: s.status,
          statusNote: this.statusNote(s),
          submittedAt: s.submittedAt,
        })),
      };
    };

    const partner = members.find((m) => m.userId !== userId);

    return {
      coupleRoomId: roomId,
      disclosedAt: new Date(),
      note: '확인 결과는 점수화하거나 위험 등급으로 표현하지 않습니다.',
      partner: partner ? buildPerson(partner.userId) : null,
      me: buildPerson(userId),
    };
  }
}
