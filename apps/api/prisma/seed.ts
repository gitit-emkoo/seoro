import {
  PrismaClient,
  ProductCode,
  VerificationAvailability,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const items = [
    {
      code: 'IDENTITY',
      title: '본인 신원',
      description: '본인 확인에 필요한 기본 신원 정보',
      category: 'identity',
      requiredDocumentType: '신분증 사본',
      verificationMethod: 'MANUAL_REVIEW',
      legalAvailabilityStatus: VerificationAvailability.LIMITED,
      sortOrder: 1,
    },
    {
      code: 'MARRIAGE_HISTORY',
      title: '혼인 이력',
      description: '혼인 관련 이력 확인',
      category: 'family',
      requiredDocumentType: '혼인관계증명서 등',
      verificationMethod: 'MANUAL_REVIEW',
      legalAvailabilityStatus: VerificationAvailability.LIMITED,
      sortOrder: 2,
    },
    {
      code: 'ASSETS',
      title: '자산',
      description: '주요 자산 현황 확인',
      category: 'finance',
      requiredDocumentType: '자산 관련 증빙',
      verificationMethod: 'MANUAL_REVIEW',
      legalAvailabilityStatus: VerificationAvailability.LIMITED,
      sortOrder: 3,
    },
    {
      code: 'LIABILITIES',
      title: '부채',
      description: '부채 및 경제적 책임 확인',
      category: 'finance',
      requiredDocumentType: '부채 관련 증빙',
      verificationMethod: 'MANUAL_REVIEW',
      legalAvailabilityStatus: VerificationAvailability.LIMITED,
      sortOrder: 4,
    },
    {
      code: 'EDUCATION_CAREER',
      title: '학력 및 경력',
      description: '학력·경력 관련 정보 확인',
      category: 'career',
      requiredDocumentType: '졸업증명서/경력증명서 등',
      verificationMethod: 'MANUAL_REVIEW',
      legalAvailabilityStatus: VerificationAvailability.LIMITED,
      sortOrder: 5,
    },
    {
      code: 'ADDITIONAL_FINANCE',
      title: '추가 경제적 책임',
      description: '부양·보증 등 추가 경제적 책임',
      category: 'finance',
      requiredDocumentType: '관련 증빙 자료',
      verificationMethod: 'MANUAL_REVIEW',
      legalAvailabilityStatus: VerificationAvailability.UNAVAILABLE,
      sortOrder: 6,
    },
  ];

  for (const item of items) {
    await prisma.verificationItem.upsert({
      where: { code: item.code },
      update: item,
      create: item,
    });
  }

  const allItems = await prisma.verificationItem.findMany();
  const byCode = Object.fromEntries(allItems.map((i) => [i.code, i.id]));

  const basic = await prisma.productPlan.upsert({
    where: { code: ProductCode.BASIC },
    update: {
      name: '기본형',
      description: '핵심 확인 항목 추천 구성',
      totalAmount: 59000,
      perPersonAmount: 29500,
      isActive: true,
    },
    create: {
      code: ProductCode.BASIC,
      name: '기본형',
      description: '핵심 확인 항목 추천 구성',
      totalAmount: 59000,
      perPersonAmount: 29500,
    },
  });

  const extended = await prisma.productPlan.upsert({
    where: { code: ProductCode.EXTENDED },
    update: {
      name: '확장형',
      description: '기본형 + 추가 확인 항목',
      totalAmount: 99000,
      perPersonAmount: 49500,
      isActive: true,
    },
    create: {
      code: ProductCode.EXTENDED,
      name: '확장형',
      description: '기본형 + 추가 확인 항목',
      totalAmount: 99000,
      perPersonAmount: 49500,
    },
  });

  const basicCodes = ['IDENTITY', 'MARRIAGE_HISTORY', 'ASSETS', 'LIABILITIES'];
  const extendedCodes = [...basicCodes, 'EDUCATION_CAREER', 'ADDITIONAL_FINANCE'];

  await prisma.productPlanItem.deleteMany({
    where: { productPlanId: { in: [basic.id, extended.id] } },
  });

  for (const code of basicCodes) {
    await prisma.productPlanItem.create({
      data: {
        productPlanId: basic.id,
        verificationItemId: byCode[code],
      },
    });
  }
  for (const code of extendedCodes) {
    await prisma.productPlanItem.create({
      data: {
        productPlanId: extended.id,
        verificationItemId: byCode[code],
      },
    });
  }

  // 공감 카드 4장. 공포 마케팅·임의 통계 없이, 출처 확인된 수치만 사용합니다.
  const cards = [
    {
      title:
        '사랑하는 사람과 평생을 약속하기 전,\n우리는 서로에 대해 얼마나 알고 있을까요?',
      body: '함께 살아갈 사람의 과거와 현재, 경제적인 상황과 중요한 사실들.\n\n사랑한다는 이유로 미처 묻지 못하고 지나친 것들이 있을 수 있습니다.',
      question: '결혼은 사랑만으로 결정할 수 없습니다.',
      statisticText: null,
      sourceName: null,
      sourceUrl: null,
      surveyYear: null,
      displayOrder: 1,
    },
    {
      title: '결혼 후에야 알게 된 사실이\n두 사람의 미래를 흔들 수도 있습니다.',
      body: '생각하지 못했던 빚과 경제적 책임, 말하지 못했던 과거의 혼인 이력, 서로 다르게 알고 있었던 중요한 사실들.\n\n그때 알게 되는 것과 결혼 전에 함께 확인하는 것은 다릅니다.',
      question: '모르는 채 시작한 결혼, 나중에 알게 된다면?',
      statisticText: null,
      sourceName: null,
      sourceUrl: null,
      surveyYear: null,
      displayOrder: 2,
    },
    {
      title: '결혼은 시작할 때보다\n함께 살아가는 과정에서 더 많은 현실을 마주합니다.',
      body: '한국가정법률상담소의 2024년 이혼상담 분석에서도 경제적 갈등, 장기 별거, 성격 차이 등 다양한 현실적인 문제가 상담 사유로 나타났습니다.\n\n모든 문제가 사전에 확인할 수 있는 것은 아닙니다. 하지만 중요한 사실을 서로 확인하는 일은 적어도 불필요한 오해와 정보의 차이를 줄이는 출발점이 될 수 있습니다.',
      question: '실제로 결혼생활의 문제는 존재합니다.',
      statisticText: '91,151건 · 2024년 국내 이혼 건수',
      sourceName: '국가데이터처 「2024년 혼인·이혼 통계」 · 보조: 한국가정법률상담소 「2024년도 상담통계」',
      sourceUrl: 'https://kostat.go.kr',
      surveyYear: '2024',
      displayOrder: 3,
    },
    {
      title: '한 사람만 확인하는 것이 아닙니다.\n우리 둘이 함께 확인하는 것입니다.',
      body: '나도 나에 대해 투명하게 보여주고, 상대방도 나에게 같은 기준으로 보여주는 것.\n\n누군가를 의심하기 위해서가 아니라 앞으로 함께할 사람에게 더 솔직해지기 위해.\n\n결혼을 결정하기 전, 서로를 확인하는 새로운 방법.',
      question: '의심이 아니라, 서로를 위한 확인입니다.',
      statisticText: null,
      sourceName: null,
      sourceUrl: null,
      surveyYear: null,
      displayOrder: 4,
    },
  ];

  await prisma.contentCard.deleteMany({});
  await prisma.contentCard.createMany({ data: cards });

  // 개발 전용 시드. 운영에서는 SEED_ADMIN=true 와 별도 비밀번호를 강제합니다.
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ADMIN !== 'true') {
    console.log('Skip admin seed in production (SEED_ADMIN!=true)');
    return;
  }

  const adminPasswordRaw =
    process.env.SEED_ADMIN_PASSWORD ||
    (process.env.NODE_ENV === 'production' ? '' : 'admin1234!');
  if (!adminPasswordRaw || adminPasswordRaw.length < 10) {
    throw new Error('SEED_ADMIN_PASSWORD 가 없거나 너무 짧습니다.');
  }

  const adminPassword = await bcrypt.hash(adminPasswordRaw, 10);
  await prisma.user.upsert({
    where: { email: 'admin@seoro.local' },
    update: {
      role: 'ADMIN',
      passwordHash: adminPassword,
      name: '관리자',
      status: 'ACTIVE',
    },
    create: {
      email: 'admin@seoro.local',
      passwordHash: adminPassword,
      name: '관리자',
      role: 'ADMIN',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
