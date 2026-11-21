import { api, getToken, isKnownUser } from '@/lib/api';

export type JourneyStatus = {
  path: string;
  reason?: string;
  verifyStep?: 'connect' | 'scope' | 'pay' | 'submit' | 'report';
  verifyComplete?: boolean;
  mutualReady?: boolean;
  promiseUnlocked?: boolean;
  coupleRoomId?: string;
  cta?: { label: string; href: string } | null;
  ctaDisabled?: boolean;
  statusMessage?: string;
};

export async function fetchJourneyStatus(): Promise<JourneyStatus | null> {
  if (!getToken()) return null;
  try {
    return await api<JourneyStatus>('/api/onboarding/next');
  } catch {
    return null;
  }
}

export async function goToNextStep(
  fallback = '/home',
): Promise<string> {
  const res = await fetchJourneyStatus();
  if (!res) {
    if (getToken()) return fallback;
    return isKnownUser() ? '/login' : '/onboarding';
  }

  // 상호공개 완료: 결과 미열람 → 서로확인 메인, 1회 이상 열람 → 앱홈
  if (res.mutualReady && res.coupleRoomId) {
    return hasSeenMutualResult(res.coupleRoomId) ? '/app' : '/home';
  }

  return res.path || fallback;
}

export function promisePromptStorageKey(coupleRoomId: string) {
  return `seoro_hide_promise_prompt_${coupleRoomId}`;
}

export function mutualResultSeenKey(coupleRoomId: string) {
  return `seoro_mutual_result_seen_${coupleRoomId}`;
}

export function hasSeenMutualResult(coupleRoomId: string) {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(mutualResultSeenKey(coupleRoomId)) === '1';
}

export function markMutualResultSeen(coupleRoomId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(mutualResultSeenKey(coupleRoomId), '1');
}
