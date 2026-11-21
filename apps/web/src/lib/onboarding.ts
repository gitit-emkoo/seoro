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
        q1: [],
        q2: [],
        q3: parsed.answers?.q3 ?? null,
        q4: null,
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
  localStorage.removeItem('seoro_onboarding_v1');
}

export function buildSurveyPayload(answers: SurveyAnswers) {
  const selectedCodes = new Set<string>();
  if (answers.q3) selectedCodes.add(answers.q3);

  const surveyNote = JSON.stringify({
    version: 3,
    answers: { q3: answers.q3 },
  });

  return {
    selectedCodes: Array.from(selectedCodes),
    surveyNote,
  };
}

export type SurveyQuestion = {
  id: 'q3';
  multi: boolean;
  title: string;
  hint: string;
  options: { code: string; label: string }[];
};

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
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
];
