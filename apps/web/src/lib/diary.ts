export type EmotionCode =
  | 'HAPPY'
  | 'LOVE'
  | 'CALM'
  | 'SAD'
  | 'ANGRY'
  | 'ANXIOUS'
  | 'EXCITED'
  | 'LONELY'
  | 'GRATEFUL'
  | 'NUMB';

export type TriggerCode =
  | 'ACTIVITY'
  | 'FAMILY'
  | 'FRIEND'
  | 'HEALTH'
  | 'PARTNER'
  | 'SOCIETY'
  | 'PARTICIPATION'
  | 'RELATIONSHIP'
  | 'IDENTITY'
  | 'WORK'
  | 'TRAVEL'
  | 'SHOW'
  | 'EXERCISE'
  | 'STYLE'
  | 'EXAM'
  | 'FOOD';

export type EmotionDiary = {
  id: string;
  coupleRoomId: string;
  userId: string;
  entryDate: string;
  emotionCode: EmotionCode | string;
  triggerCodes: string[];
  comment?: string;
  isMine: boolean;
  createdAt: string;
  updatedAt: string;
};

export const EMOTIONS: { code: EmotionCode; label: string; color: string }[] = [
  { code: 'HAPPY', label: '행복', color: '#FFE179' },
  { code: 'LOVE', label: '사랑', color: '#FFB3C6' },
  { code: 'CALM', label: '평온', color: '#A6E3E9' },
  { code: 'SAD', label: '슬픔', color: '#B8C9F0' },
  { code: 'ANGRY', label: '화남', color: '#FF8A80' },
  { code: 'ANXIOUS', label: '불안함', color: '#D7BCE8' },
  { code: 'EXCITED', label: '신남', color: '#FFBC8C' },
  { code: 'LONELY', label: '외로움', color: '#A4D1EB' },
  { code: 'GRATEFUL', label: '감사함', color: '#F7C9B6' },
  { code: 'NUMB', label: '무감각함', color: '#DADADA' },
];

export const TRIGGERS: { code: TriggerCode; label: string }[] = [
  { code: 'ACTIVITY', label: '활동' },
  { code: 'FAMILY', label: '가족' },
  { code: 'FRIEND', label: '친구' },
  { code: 'HEALTH', label: '건강' },
  { code: 'PARTNER', label: '파트너' },
  { code: 'SOCIETY', label: '사회' },
  { code: 'PARTICIPATION', label: '참여' },
  { code: 'RELATIONSHIP', label: '관계' },
  { code: 'IDENTITY', label: '정체성' },
  { code: 'WORK', label: '일' },
  { code: 'TRAVEL', label: '여행' },
  { code: 'SHOW', label: '공연' },
  { code: 'EXERCISE', label: '운동' },
  { code: 'STYLE', label: '스타일' },
  { code: 'EXAM', label: '시험' },
  { code: 'FOOD', label: '음식' },
];

export const MAX_TRIGGERS = 3;

export function emotionMeta(code: string) {
  return EMOTIONS.find((e) => e.code === code) ?? { code, label: code, color: '#DADADA' };
}

export function triggerLabel(code: string) {
  return TRIGGERS.find((t) => t.code === code)?.label ?? code;
}

/** Asia/Seoul YYYY-MM-DD */
export function kstToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function monthRange(year: number, monthIndex0: number) {
  const from = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const to = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { from, to };
}
