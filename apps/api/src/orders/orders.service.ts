import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoupleAccessService } from '../common/couple-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../scope/scope.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coupleAccess: CoupleAccessService,
    private readonly scopeService: ScopeService,
  ) {}

  async getCurrent(userId: string) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    const order = await this.prisma.order.findFirst({
      where: {
        coupleRoomId: membership.coupleRoomId,
        status: { in: ['AWAITING_PAYMENT', 'PARTIALLY_PAID', 'PAID'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        productPlan: true,
        payments: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
        scopeAgreement: true,
      },
    });
    return order;
  }

  async createFromAgreement(userId: string, productPlanId: string) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    const roomId = membership.coupleRoomId;

    const agreement = await this.prisma.scopeAgreement.findFirst({
      where: { coupleRoomId: roomId, status: 'AGREED' },
      orderBy: { version: 'desc' },
    });
    if (!agreement) {
      throw new BadRequestException('확인 범위 합의가 완료되어야 주문할 수 있습니다.');
    }

    const existing = await this.getCurrent(userId);
    if (existing) {
      return existing;
    }

    const eligible = await this.scopeService.resolveAgreedPlan(userId);
    const plan = eligible.find((p) => p.id === productPlanId);
    if (!plan) {
      throw new BadRequestException('합의된 확인 범위에 맞는 상품만 주문할 수 있습니다.');
    }

    const members = membership.coupleRoom.members;
    if (members.length < 2) {
      throw new BadRequestException('양측 연결 후 주문이 가능합니다.');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          coupleRoomId: roomId,
          productPlanId: plan.id,
          scopeAgreementId: agreement.id,
          totalAmount: plan.totalAmount,
          perPersonAmount: plan.perPersonAmount,
          status: 'AWAITING_PAYMENT',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          payments: {
            create: members.map((m) => ({
              userId: m.userId,
              amount: plan.perPersonAmount,
              status: 'UNPAID',
              paymentProvider: 'MOCK',
            })),
          },
        },
        include: {
          productPlan: true,
          payments: {
            include: {
              user: { select: { id: true, email: true, name: true } },
            },
          },
          scopeAgreement: true,
        },
      });
      return created;
    });

    return order;
  }

  async cancelCurrent(userId: string) {
    const order = await this.getCurrent(userId);
    if (!order) {
      throw new NotFoundException('진행 중인 주문이 없습니다.');
    }
    if (order.status === 'PAID') {
      throw new BadRequestException('결제 완료된 주문은 취소할 수 없습니다. 환불 정책을 확인해 주세요.');
    }
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      return order;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { orderId: order.id, status: 'UNPAID' },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
    });

    return this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        productPlan: true,
        payments: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
        scopeAgreement: true,
      },
    });
  }

  async mockPay(userId: string) {
    const order = await this.getCurrent(userId);
    if (!order) {
      throw new NotFoundException('진행 중인 주문이 없습니다.');
    }
    if (order.status === 'PAID') {
      return order;
    }
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      throw new BadRequestException('결제할 수 없는 주문 상태입니다.');
    }

    const myPayment = order.payments.find((p) => p.userId === userId);
    if (!myPayment) {
      throw new ForbiddenPayment();
    }
    if (myPayment.status === 'PAID') {
      return this.getCurrent(userId);
    }

    await this.prisma.payment.update({
      where: { id: myPayment.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        providerTransactionId: `mock_${Date.now()}_${userId.slice(-6)}`,
      },
    });

    const payments = await this.prisma.payment.findMany({
      where: { orderId: order.id },
    });
    const paidCount = payments.filter((p) => p.status === 'PAID').length;
    const nextStatus =
      paidCount === payments.length
        ? 'PAID'
        : paidCount > 0
          ? 'PARTIALLY_PAID'
          : 'AWAITING_PAYMENT';

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        paidAt: nextStatus === 'PAID' ? new Date() : null,
      },
    });

    if (nextStatus === 'PAID') {
      await this.bootstrapSubmissions(order.coupleRoomId, order.scopeAgreementId);
    }

    return this.getCurrent(userId);
  }

  private async bootstrapSubmissions(
    coupleRoomId: string,
    scopeAgreementId: string,
  ) {
    const agreement = await this.prisma.scopeAgreement.findUnique({
      where: { id: scopeAgreementId },
    });
    if (!agreement) return;

    const members = await this.prisma.coupleMember.findMany({
      where: { coupleRoomId, status: 'ACTIVE' },
    });

    for (const member of members) {
      for (const itemId of agreement.agreedItemIds) {
        await this.prisma.submission.upsert({
          where: {
            coupleRoomId_userId_verificationItemId: {
              coupleRoomId,
              userId: member.userId,
              verificationItemId: itemId,
            },
          },
          update: {},
          create: {
            coupleRoomId,
            userId: member.userId,
            verificationItemId: itemId,
            status: 'NOT_SUBMITTED',
          },
        });
      }
    }
  }
}

class ForbiddenPayment extends BadRequestException {
  constructor() {
    super('이 주문에 대한 결제 권한이 없습니다.');
  }
}
