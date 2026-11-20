import { Injectable } from '@nestjs/common';
import { CoupleAccessService } from '../common/couple-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubmissionsService } from '../submissions/submissions.service';

@Injectable()
export class DisclosureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coupleAccess: CoupleAccessService,
    private readonly submissionsService: SubmissionsService,
  ) {}

  async me(userId: string) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    const completeness = await this.submissionsService.getCompleteness(
      membership.coupleRoomId,
      userId,
    );

    const consents = await this.prisma.disclosureConsent.findMany({
      where: { coupleRoomId: membership.coupleRoomId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const mine =
      consents.find((c) => c.userId === userId) ??
      (await this.prisma.disclosureConsent.upsert({
        where: {
          coupleRoomId_userId: {
            coupleRoomId: membership.coupleRoomId,
            userId,
          },
        },
        update: {},
        create: {
          coupleRoomId: membership.coupleRoomId,
          userId,
          status: 'PENDING',
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }));

    const all = await this.prisma.disclosureConsent.findMany({
      where: { coupleRoomId: membership.coupleRoomId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const members = membership.coupleRoom.members;
    const mutualReady = members.every((m) =>
      all.some((c) => c.userId === m.userId && c.status === 'CONSENTED'),
    );

    return {
      mine,
      members: members.map((m) => {
        const c = all.find((x) => x.userId === m.userId);
        return {
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          status: c?.status ?? 'PENDING',
          isMe: m.userId === userId,
        };
      }),
      mutualReady,
      submissionCompleteness: completeness,
    };
  }

  async consent(userId: string) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    await this.submissionsService.assertAllSubmitted(
      membership.coupleRoomId,
      userId,
    );
    return this.prisma.disclosureConsent.upsert({
      where: {
        coupleRoomId_userId: {
          coupleRoomId: membership.coupleRoomId,
          userId,
        },
      },
      update: {
        status: 'CONSENTED',
        consentedAt: new Date(),
        revokedAt: null,
      },
      create: {
        coupleRoomId: membership.coupleRoomId,
        userId,
        status: 'CONSENTED',
        consentedAt: new Date(),
      },
    });
  }
}
