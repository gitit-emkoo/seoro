import { api, getToken } from '@/lib/api';

export type JourneyStatus = {
  path: string;
  reason?: string;
  verifyStep?: 'connect' | 'scope' | 'pay' | 'submit' | 'report';
  verifyComplete?: boolean;
  mutualReady?: boolean;
  promiseUnlocked?: boolean;
  coupleRoomId?: string;
  cta?: { label: string; href: string } | null;
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
  if (!res) return getToken() ? fallback : '/onboarding';
  return res.path || fallback;
}

export function promisePromptStorageKey(coupleRoomId: string) {
  return `seoro_hide_promise_prompt_${coupleRoomId}`;
}
