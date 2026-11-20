'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarPair, BrandMark } from '@/components/ui';
import { BottomNav } from '@/components/BottomNav';
import { ErrorBlock, LoadingBlock } from '@/components/StateBlock';
import { api, getToken, setToken } from '@/lib/api';
import { fetchJourneyStatus, type JourneyStatus } from '@/lib/progress';
import type { AuthUser, CoupleRoom } from '@/lib/types';

/** 앱 홈: 약속(지속) + 서로확인(일회성 허브) 통로 */
export default function AppHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [room, setRoom] = useState<CoupleRoom | null>(null);
  const [journey, setJourney] = useState<JourneyStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }

    void (async () => {
      try {
        const me = await api<AuthUser>('/api/auth/me');
        if (!me.onboardingCompleted) {
          router.replace('/onboarding');
          return;
        }
        setUser(me);
        const myRoom = await api<CoupleRoom | null>('/api/couples/me');
        setRoom(myRoom);
        const status = await fetchJourneyStatus();
        setJourney(status);

        // 서로확인이 끝나기 전에는 앱 홈 대신 서로확인 허브/다음 단계로
        if (!status?.mutualReady) {
          router.replace(status?.path && status.path !== '/app' ? status.path : '/home');
          return;
        }
      } catch {
        setToken(null);
        router.replace('/login');
        return;
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function logout() {
    setToken(null);
    router.replace('/login');
  }

  if (loading) return <LoadingBlock />;

  const meLabel = user?.name || user?.email || '나';
  const partner = room?.members.find((m) => m.userId !== user?.id);
  const partnerLabel = partner?.name || partner?.email || '상대';
  const unlocked = Boolean(journey?.promiseUnlocked);

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BrandMark />
        <button className="icon-btn" onClick={logout} aria-label="로그아웃" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <section className="stack">
        <h1 className="hero-title">우리 사랑이 더 단단해 지고있어요</h1>
        <AvatarPair
          left={{
            label: meLabel,
            userId: user?.id,
            hasAvatar: Boolean(user?.hasAvatar),
          }}
          right={{
            label: partnerLabel,
            userId: partner?.userId,
            hasAvatar: Boolean(partner?.hasAvatar),
          }}
          meUserId={user?.id}
          onMineUpdated={() => {
            void api<AuthUser>('/api/auth/me').then(setUser);
            void api<CoupleRoom | null>('/api/couples/me').then(setRoom);
          }}
        />
      </section>

      <section className="stack">
        {unlocked ? (
          <Link className="card feature-card" href="/promises">
            <strong>우리의 약속</strong>
            <p className="muted">약속을 만들고 전자서명 기록으로 쌓아가요</p>
            <span className="sub-badge">무료 구독 중</span>
          </Link>
        ) : (
          <div className="card feature-card feature-card--locked">
            <strong>우리의 약속</strong>
            <p className="muted">서로 확인을 마치면 열립니다.</p>
          </div>
        )}

        <Link className="card secondary-card" href="/home">
          <strong>서로 확인</strong>
          <p className="muted">확인이 완료됐어요. 언제든 다시 볼 수 있어요</p>
        </Link>
      </section>

      {error ? <ErrorBlock message={error} /> : null}
      <BottomNav />
    </main>
  );
}
