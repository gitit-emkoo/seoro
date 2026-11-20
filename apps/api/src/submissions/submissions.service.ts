import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoupleAccessService } from '../common/couple-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coupleAccess: CoupleAccessService,
    private readonly storage: StorageService,
  ) {}

  private async requirePaidOrder(coupleRoomId: string) {
    const order = await this.prisma.order.findFirst({
      where: { coupleRoomId, status: 'PAID' },
      orderBy: { createdAt: 'desc' },
    });
    if (!order) {
      throw new ForbiddenException('양측 결제 완료 후 자료를 제출할 수 있습니다.');
    }
    return order;
  }

  /** 미제출·보완요청이 있으면 아직 제출 미완료로 본다 */
  isSubmissionComplete(status: string) {
    return status !== 'NOT_SUBMITTED' && status !== 'NEEDS_REVISION';
  }

  async getCompleteness(coupleRoomId: string, userId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { coupleRoomId, userId },
      include: { verificationItem: { select: { title: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const pending = submissions.filter((s) => !this.isSubmissionComplete(s.status));
    return {
      total: submissions.length,
      completed: submissions.length - pending.length,
      allSubmitted: submissions.length > 0 && pending.length === 0,
      pendingTitles: pending.map((s) => s.verificationItem.title),
    };
  }

  async assertAllSubmitted(coupleRoomId: string, userId: string) {
    const completeness = await this.getCompleteness(coupleRoomId, userId);
    if (!completeness.allSubmitted) {
      const names =
        completeness.pendingTitles.length > 0
          ? ` (미완료: ${completeness.pendingTitles.join(', ')})`
          : '';
      throw new BadRequestException(
        `합의된 항목을 모두 제출한 뒤에 진행할 수 있습니다.${names}`,
      );
    }
    return completeness;
  }

  async listMine(userId: string) {
    const membership = await this.coupleAccess.requireActiveMembership(userId);
    await this.requirePaidOrder(membership.coupleRoomId);

    return this.prisma.submission.findMany({
      where: { coupleRoomId: membership.coupleRoomId, userId },
      include: {
        verificationItem: true,
        verification: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async upload(
    userId: string,
    verificationItemId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('파일이 필요합니다.');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('PDF 또는 이미지 파일만 업로드할 수 있습니다.');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('파일 크기는 10MB 이하여야 합니다.');
    }

    const membership = await this.coupleAccess.requireActiveMembership(userId);
    await this.requirePaidOrder(membership.coupleRoomId);

    const submission = await this.prisma.submission.findUnique({
      where: {
        coupleRoomId_userId_verificationItemId: {
          coupleRoomId: membership.coupleRoomId,
          userId,
          verificationItemId,
        },
      },
    });
    if (!submission) {
      throw new NotFoundException('해당 확인 항목의 제출 대상이 없습니다.');
    }

    const saved = await this.storage.savePrivate(
      userId,
      file.originalname,
      file.buffer,
    );

    const nextStatus =
      submission.status === 'NEEDS_REVISION' ? 'RESUBMITTED' : 'SUBMITTED';

    return this.prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: nextStatus,
        originalFileName: file.originalname,
        storedFileKey: saved.key,
        mimeType: file.mimetype,
        fileSize: file.size,
        submittedAt: new Date(),
        verification: {
          upsert: {
            create: {
              method: 'MANUAL_REVIEW',
              officialCheckStatus: 'NONE',
              adminReviewStatus: 'PENDING',
            },
            update: {
              adminReviewStatus: 'PENDING',
              revisionRequest: null,
              resultSummary: null,
              unverifiableReason: null,
              verifiedAt: null,
            },
          },
        },
      },
      include: {
        verificationItem: true,
        verification: true,
      },
    });
  }

  async getOwnFile(userId: string, submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission || submission.userId !== userId) {
      throw new ForbiddenException('파일에 접근할 수 없습니다.');
    }
    if (!submission.storedFileKey) {
      throw new NotFoundException('파일이 없습니다.');
    }
    return submission;
  }
}
