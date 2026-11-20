const KEY = 'seoro_onboarding_v2';

export type SurveyAnswers = {
  q1: string[];
  q2: string[];
  q3: string | null;
  q4: string | null;
};

export type LocalOnboarding = {
  cardsDone: boolean;
  selectedCodes: string[];
  answers: SurveyAnswers;
  surveyNote: string | null;
  updatedAt: string;
};

const emptyAnswers = (): SurveyAnswers => ({
  q1: [],
  q2: [],
  q3: null,
  q4: null,
});

export function loadOnboarding(): LocalOnboarding {
  if (typeof window === 'undefined') {
    return {
      cardsDone: false,
      selectedCodes: [],
      answers: emptyAnswers(),
      surveyNote: null,
      updatedAt: '',
    };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return {
        cardsDone: false,
        selectedCodes: [],
        answers: emptyAnswers(),
        surveyNote: null,
        updatedAt: '',
      };
    }
    const parsed = JSON.parse(raw) as Partial<LocalOnboarding>;
    return {
      cardsDone: Boolean(parsed.cardsDone),
      selectedCodes: Array.isArray(parsed.selectedCodes) ? parsed.selectedCodes : [],
      answers: {
        q1: parsed.answers?.q1 ?? [],
        q2: parsed.answers?.q2 ?? [],
        q3: parsed.answers?.q3 ?? null,
        q4: parsed.answers?.q4 ?? null,
      },
      surveyNote: parsed.surveyNote ?? null,
      updatedAt: parsed.updatedAt ?? '',
    };
  } catch {
    return {
      cardsDone: false,
      selectedCodes: [],
      answers: emptyAnswers(),
      surveyNote: null,
      updatedAt: '',
    };
  }
}

export function saveOnboarding(patch: Partial<LocalOnboarding>) {
  const prev = loadOnboarding();
  const next: LocalOnboarding = {
    ...prev,
    ...patch,
    answers: patch.answers ? { ...prev.answers, ...patch.answers } : prev.answers,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearOnboarding() {
  localStorage.removeItem(KEY);
  // 이전 키도 정리
  localStorage.removeItem('seoro_onboarding_v1');
}

/** Q2 → 기존 확인 항목 코드 매핑 (가입 후 참고용 호환) */
const Q2_TO_VERIFICATION: Record<string, string[]> = {
  Q2_ASSETS: ['ASSETS', 'LIABILITIES'],
  Q2_FAMILY: ['IDENTITY', 'MARRIAGE_HISTORY'],
  Q2_CAREER: ['EDUCATION_CAREER'],
  Q2_PAST: ['ADDITIONAL_FINANCE'],
  Q2_NONE: [],
};

export function buildSurveyPayload(answers: SurveyAnswers) {
  const selectedCodes = new Set<string>();
  for (const code of answers.q1) selectedCodes.add(code);
  for (const code of answers.q2) {
    selectedCodes.add(code);
    for (const mapped of Q2_TO_VERIFICATION[code] ?? []) selectedCodes.add(mapped);
  }
  if (answers.q3) selectedCodes.add(answers.q3);
  if (answers.q4) selectedCodes.add(answers.q4);

  const surveyNote = JSON.stringify({
    version: 2,
    answers,
  });

  return {
    selectedCodes: Array.from(selectedCodes),
    surveyNote,
  };
}

export type SurveyQuestion = {
  id: 'q1' | 'q2' | 'q3' | 'q4';
  multi: boolean;
  title: string;
  hint: string;
  options: { code: string; label: string }[];
};

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'q1',
    multi: true,
    title: '결혼을 생각할 때, 가장 중요하게 생각하는 것은 무엇인가요?',
    hint: '마음에 와닿는 것을 골라 주세요. 여러 개 선택해도 괜찮아요.',
    options: [
      { code: 'Q1_TRUST', label: '서로에 대한 믿음과 신뢰' },
      { code: 'Q1_ECONOMY', label: '경제적인 안정과 현실적인 준비' },
      { code: 'Q1_VALUES', label: '성격과 가치관의 조화' },
      { code: 'Q1_HONESTY', label: '서로의 과거와 현재를 솔직하게 아는 것' },
      { code: 'Q1_FUTURE', label: '함께 살아갈 미래에 대한 계획' },
    ],
  },
  {
    id: 'q2',
    multi: true,
    title: '결혼을 앞두고 상대방에 대해 더 알고 싶은 부분이 있나요?',
    hint: '궁금한 것만 골라 보세요. 없어도 괜찮아요.',
    options: [
      { code: 'Q2_ASSETS', label: '현재의 자산과 부채' },
      { code: 'Q2_FAMILY', label: '혼인 이력이나 가족관계' },
      { code: 'Q2_CAREER', label: '학력과 경력 등 개인 이력' },
      { code: 'Q2_PAST', label: '서로에게 중요한 과거의 사실' },
      { code: 'Q2_NONE', label: '특별히 궁금한 것은 없어요.' },
    ],
  },
  {
    id: 'q3',
    multi: false,
    title: '이런 부분을 결혼 전에 서로 확인하는 것에 대해 어떻게 생각하세요?',
    hint: '정답은 없어요. 지금 느끼는 그대로 골라 주세요.',
    options: [
      { code: 'Q3_NEED', label: '꼭 필요하다고 생각해요.' },
      { code: 'Q3_AGREE', label: '서로 동의한다면 좋은 방법 같아요.' },
      { code: 'Q3_CAUTIOUS', label: '조금 조심스럽지만 이해는 돼요.' },
      { code: 'Q3_UNSURE', label: '아직 잘 모르겠어요.' },
    ],
  },
  {
    id: 'q4',
    multi: false,
    title: '만약 상대방도 나와 같은 기준으로 자신을 확인한다면 어떨까요?',
    hint: '한쪽만의 확인이 아니라, 서로가 같은 기준으로요.',
    options: [
      { code: 'Q4_RELIEF', label: '오히려 더 안심될 것 같아요.' },
      { code: 'Q4_FAIR', label: '서로에게 공평한 방법이라고 생각해요.' },
      { code: 'Q4_MEANING', label: '조금 부담스럽지만 의미 있을 것 같아요.' },
      { code: 'Q4_THINK', label: '아직은 생각해 봐야 할 것 같아요.' },
    ],
  },
];

/** @deprecated 하위 호환 — 설문 v2 사용 */
export const SURVEY_OPTIONS = SURVEY_QUESTIONS[1].options;
