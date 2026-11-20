'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarPair } from '@/components/ui';
import { BottomNav } from '@/components/BottomNav';
import { LoadingBlock } from '@/components/StateBlock';
import { api, getToken, setToken } from '@/lib/api';
import { fetchJourneyStatus, type JourneyStatus } from '@/lib/progress';
import type { AuthUser, CoupleRoom } from '@/lib/types';

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [room, setRoom] = useState<CoupleRoom | null>(null);
  const [journey, setJourney] = useState<JourneyStatus | null>(null);
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
        const [myRoom, status] = await Promise.all([
          api<CoupleRoom | null>('/api/couples/me'),
          fetchJourneyStatus(),
        ]);
        setRoom(myRoom);
        setJourney(status);
        if (!status?.mutualReady) {
          router.replace(status?.path && status.path !== '/my' ? status.path : '/home');
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

  const promiseFree = Boolean(journey?.promiseUnlocked || journey?.mutualReady);
  const meLabel = user?.name || user?.email || '나';
  const partner = room?.members.find((m) => m.userId !== user?.id);
  const partnerLabel = partner?.name || partner?.email || '상대';

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <h1 className="my-page-title">마이</h1>
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

      {/* 1. 프로필단 */}
      <section className="my-profile stack">
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
        <div className="my-profile__name">{meLabel}</div>
        <p className="muted my-profile__sub">{partnerLabel}님과 연결됨</p>
      </section>

      {/* 2. 무료구독 안내단 */}
      <section className="card my-benefit stack">
        <div className="my-benefit__head">
          <span className="sub-badge">무료 구독 중</span>
          <strong>우리의 약속</strong>
        </div>
        {promiseFree ? (
          <p className="muted">
            서로확인 패키지 혜택으로 이 커플 공간에서 약속 디지털 인증을 평생 무료로
            이용 중이에요.
          </p>
        ) : (
          <p className="muted">서로확인을 마치면 약속 기능이 열려요.</p>
        )}
        <Link className="btn btn-primary" href="/promises">
          약속 보러가기
        </Link>
      </section>

      {/* 3. 설정 · 메뉴단 */}
      <section className="card my-menu">
        <Link className="my-menu__row" href="/home">
          <span>서로 확인 기록</span>
          <span className="muted">보기</span>
        </Link>
        <div className="my-menu__row is-soon">
          <span>결제 내역</span>
          <span className="muted">준비 중</span>
        </div>
        <div className="my-menu__row is-soon">
          <div>
            <div>이용약관</div>
            <div className="muted" style={{ fontSize: '0.82rem', fontWeight: 500 }}>
              서비스 이용 기준
            </div>
          </div>
          <span className="muted">준비 중</span>
        </div>
        <div className="my-menu__row is-soon">
          <div>
            <div>개인정보 처리방침</div>
            <div className="muted" style={{ fontSize: '0.82rem', fontWeight: 500 }}>
              데이터 보호 안내
            </div>
          </div>
          <span className="muted">준비 중</span>
        </div>
        <button className="my-menu__row my-menu__button" type="button" onClick={logout}>
          <span>로그아웃</span>
          <span className="muted"> </span>
        </button>
      </section>

      <BottomNav />
    </main>
  );
}
