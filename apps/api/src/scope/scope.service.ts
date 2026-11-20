import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ProductCode } from '@prisma/client';
import { CoupleAccessService } from '../common/couple-access.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScopeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coupleAccess: CoupleAccessService,
  ) {}

  async listItems() {
    return this.prisma.verificationItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listPlans() {
    return this.prisma.productPlan.findMany({
      where: { isActive: true },
      include: {
        items: {
          include: { verificationItem: true },
        },
      },
      orderBy: { totalAmount: 'asc' },
    });
  }

  async getMySelection(userId: string) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    const selection = await this.prisma.scopeSelection.findUnique({
      where: {
        coupleRoomId_userId: {
          coupleRoomId: membership.coupleRoomId,
          userId,
        },
      },
    });
    const agreement = await this.prisma.scopeAgreement.findFirst({
      where: {
        coupleRoomId: membership.coupleRoomId,
        status: { in: ['PENDING', 'AGREED'] },
      },
      orderBy: { version: 'desc' },
      include: { approvals: true },
    });

    return { selection, agreement };
  }

  async saveSelection(
    userId: string,
    dto: { itemIds: string[]; planCode?: ProductCode },
  ) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    if (!dto.itemIds?.length) {
      throw new BadRequestException('확인 항목을 1개 이상 선택해 주세요.');
    }

    const items = await this.prisma.verificationItem.findMany({
      where: { id: { in: dto.itemIds }, isActive: true },
    });
    if (items.length !== dto.itemIds.length) {
      throw new BadRequestException('유효하지 않은 확인 항목이 포함되어 있습니다.');
    }

    const paidOrder = await this.prisma.order.findFirst({
      where: {
        coupleRoomId: membership.coupleRoomId,
        status: 'PAID',
      },
    });
    if (paidOrder) {
      throw new ForbiddenException('결제가 완료된 뒤에는 확인 범위를 변경할 수 없습니다.');
    }

    await this.prisma.scopeAgreement.updateMany({
      where: {
        coupleRoomId: membership.coupleRoomId,
        status: { in: ['PENDING', 'AGREED'] },
      },
      data: { status: 'INVALIDATED' },
    });

    await this.cancelOpenOrders(membership.coupleRoomId);

    const selection = await this.prisma.scopeSelection.upsert({
      where: {
        coupleRoomId_userId: {
          coupleRoomId: membership.coupleRoomId,
          userId,
        },
      },
      update: {
        itemIds: dto.itemIds,
        planCode: dto.planCode,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      create: {
        coupleRoomId: membership.coupleRoomId,
        userId,
        itemIds: dto.itemIds,
        planCode: dto.planCode,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    return selection;
  }

  /** 내 선택 완료를 취소하고 다시 고를 수 있는 상태로 되돌립니다. */
  async resetSelection(userId: string) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);

    const paidOrder = await this.prisma.order.findFirst({
      where: {
        coupleRoomId: membership.coupleRoomId,
        status: 'PAID',
      },
    });
    if (paidOrder) {
      throw new ForbiddenException('결제가 완료된 뒤에는 확인 범위 선택을 취소할 수 없습니다.');
    }

    await this.prisma.scopeAgreement.updateMany({
      where: {
        coupleRoomId: membership.coupleRoomId,
        status: { in: ['PENDING', 'AGREED'] },
      },
      data: { status: 'INVALIDATED' },
    });

    await this.cancelOpenOrders(membership.coupleRoomId);

    const existing = await this.prisma.scopeSelection.findUnique({
      where: {
        coupleRoomId_userId: {
          coupleRoomId: membership.coupleRoomId,
          userId,
        },
      },
    });

    if (!existing) {
      return {
        selection: null,
        message: '저장된 선택이 없습니다.',
      };
    }

    const selection = await this.prisma.scopeSelection.update({
      where: { id: existing.id },
      data: {
        status: 'DRAFT',
        submittedAt: null,
        // 항목은 남겨 두면 다시 고르기 편함
      },
    });

    return {
      selection,
      message: '선택이 취소되었습니다. 항목을 다시 고른 뒤 선택 완료를 눌러 주세요.',
    };
  }

  private async cancelOpenOrders(coupleRoomId: string) {
    const openOrders = await this.prisma.order.findMany({
      where: {
        coupleRoomId,
        status: { in: ['AWAITING_PAYMENT', 'PARTIALLY_PAID'] },
      },
      select: { id: true },
    });
    if (!openOrders.length) return;

    const ids = openOrders.map((o) => o.id);
    await this.prisma.payment.updateMany({
      where: { orderId: { in: ids }, status: 'UNPAID' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    await this.prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { status: 'CANCELLED' },
    });
  }

  async compare(userId: string) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    const roomId = membership.coupleRoomId;
    const members = membership.coupleRoom.members;
    if (members.length < 2) {
      throw new BadRequestException('양측 연결 후 비교할 수 있습니다.');
    }

    const selections = await this.prisma.scopeSelection.findMany({
      where: { coupleRoomId: roomId },
    });

    const items = await this.prisma.verificationItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const byUser = Object.fromEntries(
      selections.map((s) => [s.userId, new Set(s.itemIds)]),
    );

    const [a, b] = members;
    const aSet = byUser[a.userId] ?? new Set<string>();
    const bSet = byUser[b.userId] ?? new Set<string>();

    const bothSelected: string[] = [];
    const onlyA: string[] = [];
    const onlyB: string[] = [];

    for (const item of items) {
      const inA = aSet.has(item.id);
      const inB = bSet.has(item.id);
      if (inA && inB) bothSelected.push(item.id);
      else if (inA) onlyA.push(item.id);
      else if (inB) onlyB.push(item.id);
    }

    const bothReady =
      selections.filter((s) => s.status === 'SUBMITTED').length >= 2;

    let agreement = await this.prisma.scopeAgreement.findFirst({
      where: {
        coupleRoomId: roomId,
        status: { in: ['PENDING', 'AGREED'] },
      },
      orderBy: { version: 'desc' },
      include: { approvals: true },
    });

    // 선택이 어긋난 채 AGREED 된 이전 데이터는 무효화
    if (
      agreement?.status === 'AGREED' &&
      (onlyA.length > 0 || onlyB.length > 0)
    ) {
      await this.prisma.scopeAgreement.update({
        where: { id: agreement.id },
        data: { status: 'INVALIDATED' },
      });
      agreement = null;
    }

    return {
      bothReady,
      members: members.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        submitted: selections.some(
          (s) => s.userId === m.userId && s.status === 'SUBMITTED',
        ),
        itemIds: [...(byUser[m.userId] ?? [])],
      })),
      items,
      bothSelected,
      onlyA,
      onlyB,
      awaitingAgreement: [...onlyA, ...onlyB],
      agreement,
      meUserId: userId,
    };
  }

  async approve(userId: string, approvedItemIds: string[]) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    const roomId = membership.coupleRoomId;
    const compare = await this.compare(userId);

    if (!compare.bothReady) {
      throw new BadRequestException('양측 모두 선택을 완료한 뒤 합의할 수 있습니다.');
    }

    if (compare.onlyA.length || compare.onlyB.length) {
      throw new BadRequestException(
        '양측이 선택한 항목이 다릅니다. 선택을 맞춘 뒤 다시 합의해 주세요.',
      );
    }

    const unique = [...new Set(approvedItemIds)].sort();
    if (!unique.length) {
      throw new BadRequestException('합의할 항목을 선택해 주세요.');
    }

    const sharedKey = [...compare.bothSelected].sort().join(',');
    const approvedKey = unique.join(',');
    if (approvedKey !== sharedKey) {
      throw new BadRequestException(
        '합의 목록은 양측이 모두 선택한 항목과 같아야 합니다.',
      );
    }

    const activeItems = await this.prisma.verificationItem.findMany({
      where: { id: { in: unique }, isActive: true },
    });
    if (activeItems.length !== unique.length) {
      throw new BadRequestException('유효하지 않은 항목이 포함되어 있습니다.');
    }

    const selections = await this.prisma.scopeSelection.findMany({
      where: { coupleRoomId: roomId, status: 'SUBMITTED' },
    });
    const memberIds = membership.coupleRoom.members.map((m) => m.userId);
    const selectionsAligned = memberIds.every((id) => {
      const sel = selections.find((s) => s.userId === id);
      if (!sel) return false;
      return [...sel.itemIds].sort().join(',') === approvedKey;
    });
    if (!selectionsAligned) {
      throw new BadRequestException(
        '양측 선택이 동일한 목록이어야 합의할 수 있습니다.',
      );
    }

    let agreement = await this.prisma.scopeAgreement.findFirst({
      where: { coupleRoomId: roomId, status: 'PENDING' },
      orderBy: { version: 'desc' },
      include: { approvals: true },
    });

    if (!agreement) {
      const last = await this.prisma.scopeAgreement.findFirst({
        where: { coupleRoomId: roomId },
        orderBy: { version: 'desc' },
      });
      agreement = await this.prisma.scopeAgreement.create({
        data: {
          coupleRoomId: roomId,
          agreedItemIds: unique,
          version: (last?.version ?? 0) + 1,
          status: 'PENDING',
        },
        include: { approvals: true },
      });
    } else {
      const sortedExisting = [...agreement.agreedItemIds].sort().join(',');
      if (sortedExisting !== approvedKey) {
        // 다른 목록으로 승인 시도 시, 기존 PENDING 무효화 후 새 버전
        await this.prisma.scopeAgreement.update({
          where: { id: agreement.id },
          data: { status: 'INVALIDATED' },
        });
        agreement = await this.prisma.scopeAgreement.create({
          data: {
            coupleRoomId: roomId,
            agreedItemIds: unique,
            version: agreement.version + 1,
            status: 'PENDING',
          },
          include: { approvals: true },
        });
      }
    }

    await this.prisma.scopeAgreementApproval.upsert({
      where: {
        scopeAgreementId_userId: {
          scopeAgreementId: agreement.id,
          userId,
        },
      },
      update: {
        approvedItemIds: unique,
        approvedAt: new Date(),
      },
      create: {
        scopeAgreementId: agreement.id,
        userId,
        approvedItemIds: unique,
      },
    });

    const approvals = await this.prisma.scopeAgreementApproval.findMany({
      where: { scopeAgreementId: agreement.id },
    });

    const allApproved =
      memberIds.every((id) => approvals.some((a) => a.userId === id)) &&
      approvals.every(
        (a) => [...a.approvedItemIds].sort().join(',') === approvedKey,
      );

    if (allApproved) {
      agreement = await this.prisma.scopeAgreement.update({
        where: { id: agreement.id },
        data: {
          status: 'AGREED',
          agreedAt: new Date(),
          agreedItemIds: unique,
        },
        include: { approvals: true },
      });
    } else {
      agreement = await this.prisma.scopeAgreement.findUniqueOrThrow({
        where: { id: agreement.id },
        include: { approvals: true },
      });
    }

    return agreement;
  }

  /** 합의된 항목/선택 planCode 기준으로 결제에 쓸 상품만 반환 */
  async resolveAgreedPlan(userId: string) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    const roomId = membership.coupleRoomId;

    const agreement = await this.prisma.scopeAgreement.findFirst({
      where: { coupleRoomId: roomId, status: 'AGREED' },
      orderBy: { version: 'desc' },
    });
    if (!agreement) {
      throw new BadRequestException('확인 범위 합의가 완료되어야 상품을 확인할 수 있습니다.');
    }

    const compare = await this.compare(userId);
    if (compare.onlyA.length || compare.onlyB.length || !compare.agreement || compare.agreement.status !== 'AGREED') {
      throw new BadRequestException(
        '양측 선택이 일치하고 합의가 완료된 뒤에만 상품을 확인할 수 있습니다.',
      );
    }

    const selections = await this.prisma.scopeSelection.findMany({
      where: { coupleRoomId: roomId, status: 'SUBMITTED' },
    });
    const planCodes = [
      ...new Set(
        selections
          .map((s) => s.planCode)
          .filter((c): c is ProductCode => c != null),
      ),
    ];

    const plans = await this.prisma.productPlan.findMany({
      where: { isActive: true },
      include: {
        items: { include: { verificationItem: true } },
      },
      orderBy: { totalAmount: 'asc' },
    });

    const agreedKey = [...agreement.agreedItemIds].sort().join(',');

    if (planCodes.length === 1) {
      const matched = plans.find((p) => p.code === planCodes[0]);
      if (matched) return [matched];
    }

    const byItems = plans.filter((p) => {
      const key = p.items.map((i) => i.verificationItemId).sort().join(',');
      return key === agreedKey;
    });
    if (byItems.length) return byItems;

    // 합의 항목을 모두 포함하는 가장 저렴한 플랜
    const covering = plans
      .filter((p) => {
        const set = new Set(p.items.map((i) => i.verificationItemId));
        return agreement.agreedItemIds.every((id) => set.has(id));
      })
      .sort((a, b) => a.totalAmount - b.totalAmount);

    if (!covering.length) {
      throw new BadRequestException('합의 항목에 맞는 상품을 찾을 수 없습니다.');
    }
    return [covering[0]];
  }
}
