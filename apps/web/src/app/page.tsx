'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingBlock } from '@/components/StateBlock';
import { getToken, isKnownUser } from '@/lib/api';
import { goToNextStep } from '@/lib/progress';

/**
 * 외부 랜딩은 별도.
 * 앱 `/` : 신규는 온보딩, 이 기기에서 가입/로그인 이력이 있으면 로그인,
 * 이미 로그인 중이면 서로확인 허브(/home)로.
 */
export default function AppEntryPage() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      if (!getToken()) {
        router.replace(isKnownUser() ? '/login' : '/onboarding');
        return;
      }
      const path = await goToNextStep('/home');
      router.replace(path);
    })();
  }, [router]);

  return <LoadingBlock message="시작 화면으로 이동 중…" />;
}
