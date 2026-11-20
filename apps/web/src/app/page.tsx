'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingBlock } from '@/components/StateBlock';
import { getToken } from '@/lib/api';
import { goToNextStep } from '@/lib/progress';

/**
 * 외부 랜딩은 별도.
 * 앱 `/` 는 신규면 온보딩(통계카드), 기존 로그인이면 진행 단계로 보냅니다.
 */
export default function AppEntryPage() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      if (!getToken()) {
        router.replace('/onboarding');
        return;
      }
      const path = await goToNextStep('/home');
      router.replace(path);
    })();
  }, [router]);

  return <LoadingBlock message="시작 화면으로 이동 중…" />;
}
