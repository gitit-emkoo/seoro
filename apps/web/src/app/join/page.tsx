'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingBlock } from '@/components/StateBlock';

/** 기존 /join 경로는 /invite 로 통합합니다. */
export default function JoinRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/invite');
  }, [router]);
  return <LoadingBlock message="초대 참여 화면으로 이동 중…" />;
}
