import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { id: true, email: true, name: true },
  });
  console.log('USER accounts to remove:', users);

  // 커플 진행 데이터부터 정리 (FK 순서)
  await prisma.couplePromise.deleteMany({});
  await prisma.verificationRecord.deleteMany({});
  await prisma.submission.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.disclosureConsent.deleteMany({});
  await prisma.scopeAgreementApproval.deleteMany({});
  await prisma.scopeAgreement.deleteMany({});
  await prisma.scopeSelection.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.coupleMember.deleteMany({});
  await prisma.coupleRoom.deleteMany({});
  await prisma.onboardingSurvey.deleteMany({});
  await prisma.adminAuditLog.deleteMany({});

  const deleted = await prisma.user.deleteMany({ where: { role: 'USER' } });
  console.log('Deleted USER accounts:', deleted.count);

  const remaining = await prisma.user.findMany({
    select: { email: true, role: true },
  });
  console.log('Remaining users:', remaining);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
