'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarPair, BrandMark } from '@/components/ui';
import { BottomNav } from '@/components/BottomNav';
import { ErrorBlock, LoadingBlock } from '@/components/StateBlock';
import { api, getToken, setToken } from '@/lib/api';
import { fetchJourneyStatus, type JourneyStatus } from '@/lib/progress';
import type { AuthUser, CoupleRoom } from '@/lib/types';

const VERIFY_STEPS = [
  { key: 'scope', label: '항목선택' },
  { key: 'pay', label: '합의완료' },
  { key: 'submit', label: '자료제출' },
  { key: 'report', label: '결과확인' },
] as const;

function verifyProgress(journey: JourneyStatus | null) {
  if (!journey) return { percent: 0, currentIndex: 0, done: false };
  if (journey.mutualReady || journey.verifyComplete) {
    return { percent: 100, currentIndex: 4, done: true };
  }
  const order = ['connect', 'scope', 'pay', 'submit', 'report'] as const;
  const step = journey.verifyStep || 'connect';
  const raw = Math.max(0, order.indexOf(step));
  // UI 4스텝: connect/scope → 0, pay → 1, submit → 2, report → 3
  const currentIndex = raw <= 1 ? 0 : raw - 1;
  const percent = Math.min(100, Math.round(((currentIndex + 1) / 4) * 100));
  return { percent, currentIndex, done: false };
}

/** 앱 홈: 서로확인 진행 + 약속 + 공간 허브 */
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

  const progress = useMemo(() => verifyProgress(journey), [journey]);
  const ringStyle = useMemo(() => {
    const p = progress.percent;
    return {
      background: `conic-gradient(var(--accent) ${p * 3.6}deg, #e8edf7 0deg)`,
    };
  }, [progress.percent]);

  if (loading) return <LoadingBlock />;

  const meLabel = user?.name || user?.email || '나';
  const partner = room?.members.find((m) => m.userId !== user?.id);
  const partnerLabel = partner?.name || partner?.email || '상대';
  const unlocked = Boolean(journey?.promiseUnlocked);
  const statusText =
    journey?.statusMessage ||
    (progress.done
      ? '확인이 완료됐어요. 결과를 다시 볼 수 있어요.'
      : '서로의 정보를 안전하게 확인하는 중이에요.');

  return (
    <main className="shell app-home">
      <div className="app-home__glow" aria-hidden />

      <header className="app-home__top">
        <BrandMark wordmark />
        <button className="icon-btn" type="button" aria-label="알림" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <section className="app-home__hero">
        <h1 className="app-home__headline">
          서로를 확인하고,
          <br />
          더 확실한 미래를 준비하세요.
        </h1>
        <p className="muted app-home__sub">
          중요한 약속 전에, 서로의 정보를 안전하게 확인해요.
        </p>
      </section>

      <section className="app-home-card app-home-card--progress">
        <div className="app-home-progress__row">
          <div className="app-home-ring" style={ringStyle} aria-hidden>
            <div className="app-home-ring__inner">
              <strong>{progress.percent}%</strong>
            </div>
          </div>
          <div className="app-home-progress__copy">
            <Link className="app-home-progress__title" href="/home">
              서로 확인하기
              <span aria-hidden>›</span>
            </Link>
            <p className="muted">{statusText}</p>
          </div>
        </div>

        <ol className="app-home-steps">
          {VERIFY_STEPS.map((step, i) => {
            const done = progress.done || i < progress.currentIndex;
            const current = !progress.done && i === progress.currentIndex;
            return (
              <li
                key={step.key}
                className={
                  done ? 'is-done' : current ? 'is-current' : 'is-todo'
                }
              >
                <span className="app-home-steps__dot">
                  {done ? '✓' : i + 1}
                </span>
                <span className="app-home-steps__label">{step.label}</span>
              </li>
            );
          })}
        </ol>

        <Link className="btn btn-primary app-home-progress__cta" href="/home">
          진행 상황 보기 ›
        </Link>
      </section>

      {unlocked ? (
        <section className="app-home-card app-home-card--promise">
          <div className="app-home-promise__icon" aria-hidden>
            <svg viewBox="0 0 48 48" width="44" height="44">
              <rect x="8" y="18" width="32" height="22" rx="4" fill="currentColor" opacity="0.15" />
              <rect x="8" y="18" width="32" height="8" rx="2" fill="currentColor" />
              <path
                d="M24 10c-3 0-5 2.2-5 5v3h10v-3c0-2.8-2-5-5-5z"
                fill="currentColor"
                opacity="0.85"
              />
              <rect x="22" y="18" width="4" height="22" fill="#fff" opacity="0.9" />
            </svg>
          </div>
          <strong className="app-home-promise__title">우리의 약속</strong>
          <Link className="app-home-promise__btn" href="/promises/new">
            약속 만들기
          </Link>
        </section>
      ) : (
        <section className="app-home-card app-home-card--promise is-locked">
          <div className="app-home-promise__icon" aria-hidden>
            <svg viewBox="0 0 48 48" width="44" height="44">
              <rect x="8" y="18" width="32" height="22" rx="4" fill="currentColor" opacity="0.15" />
              <rect x="8" y="18" width="32" height="8" rx="2" fill="currentColor" />
            </svg>
          </div>
          <strong className="app-home-promise__title">우리의 약속</strong>
          <span className="app-home-promise__btn is-disabled">곧 열려요</span>
        </section>
      )}

      <section className="app-home-card app-home-card--space">
        <div className="app-home-space__head">
          <strong>우리의 공간</strong>
          <Link href={room?.status === 'ACTIVE' ? '/diary' : '/home'}>
            바로가기 ›
          </Link>
        </div>
        <Link
          className="app-home-space__body"
          href={room?.status === 'ACTIVE' ? '/diary' : '/home'}
        >
          <div className="app-home-space__avatars">
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
          </div>
          <p className="app-home-space__caption">지금, 더 알아가요</p>
        </Link>
      </section>

      {error ? <ErrorBlock message={error} /> : null}
      <BottomNav />
    </main>
  );
}
