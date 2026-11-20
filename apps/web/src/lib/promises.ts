export type PromiseCategory =
  | 'MONEY'
  | 'CHORES'
  | 'CONFLICT'
  | 'FAMILY'
  | 'FUTURE'
  | 'FREE';

export type PromiseStatus =
  | 'AWAITING_PARTNER'
  | 'AWAITING_AUTHOR'
  | 'COMPLETED'
  | 'CANCELLED';

export type CouplePromise = {
  id: string;
  coupleRoomId: string;
  authorId: string;
  partnerId: string;
  category: PromiseCategory;
  title: string;
  content: string;
  condition: string;
  status: PromiseStatus;
  authorSignature: string | null;
  partnerSignature: string | null;
  authorSignedAt: string | null;
  partnerSignedAt: string | null;
  documentCode: string | null;
  contentHash: string | null;
  completedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  author: { id: string; email: string; name: string | null };
  partner: { id: string; email: string; name: string | null };
};

export const PROMISE_CATEGORY_LABEL: Record<PromiseCategory, string> = {
  MONEY: '돈과 경제생활',
  CHORES: '집안일과 생활',
  CONFLICT: '다툼과 갈등',
  FAMILY: '가족과 주변 관계',
  FUTURE: '미래와 중요한 결정',
  FREE: '자유 작성',
};

/** 내가 지금 서명해야 하는가 (안읽음/빨간점) */
export function needsMySignature(row: CouplePromise, meId: string) {
  if (row.status === 'AWAITING_PARTNER' && row.partnerId === meId) return true;
  if (row.status === 'AWAITING_AUTHOR' && row.authorId === meId) return true;
  return false;
}

/**
 * 나 기준 상태 문구 (목록 오른쪽 / 상세 상단)
 * - 상대 서명 대기: 공이 상대에게 있음
 * - 내 서명 필요: 받은 쪽 첫 서명
 * - 재서명 필요: 상대가 수정본을 보낸 뒤 작성자 재서명
 */
export function promiseStatusLabelForMe(row: CouplePromise, meId: string) {
  if (row.status === 'COMPLETED') return '서명 완료';
  if (row.status === 'CANCELLED') return '취소됨';

  if (row.status === 'AWAITING_PARTNER') {
    if (row.partnerId === meId) return '내 서명 필요';
    return '상대 서명 대기';
  }

  if (row.status === 'AWAITING_AUTHOR') {
    if (row.authorId === meId) return '재서명 필요';
    return '상대 서명 대기';
  }

  return row.status;
}

export function isPromisePending(row: CouplePromise) {
  return row.status === 'AWAITING_PARTNER' || row.status === 'AWAITING_AUTHOR';
}

export function isPromiseCompleted(row: CouplePromise) {
  return row.status === 'COMPLETED';
}
