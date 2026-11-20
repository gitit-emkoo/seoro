'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarPair, BrandMark } from '@/components/ui';
import { BottomNav } from '@/components/BottomNav';
import { LoadingBlock } from '@/components/StateBlock';
import { api, getToken } from '@/lib/api';
import { fetchJourneyStatus } from '@/lib/progress';
import {
  isPromiseCompleted,
  isPromisePending,
  needsMySignature,
  promiseStatusLabelForMe,
  type CouplePromise,
} from '@/lib/promises';
import type { AuthUser, CoupleRoom } from '@/lib/types';

export default function PromisesHomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [room, setRoom] = useState<CoupleRoom | null>(null);
  const [rows, setRows] = useState<CouplePromise[]>([]);
  const [error, setError] = useState('');
  const [completedOpen, setCompletedOpen] = useState(false);

  const refreshList = useCallback(async () => {
    const list = await api<CouplePromise[]>('/api/promises');
    setRows(list);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void (async () => {
      try {
        const status = await fetchJourneyStatus();
        if (!status?.promiseUnlocked) {
          router.replace(status?.path || '/home');
          return;
        }
        const [me, myRoom, list] = await Promise.all([
          api<AuthUser>('/api/auth/me'),
          api<CoupleRoom | null>('/api/couples/me'),
          api<CouplePromise[]>('/api/promises'),
        ]);
        setUser(me);
        setRoom(myRoom);
        setRows(list);
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : '불러오기 실패');
        setReady(true);
      }
    })();
  }, [router]);

  // 목록이 상태 허브 — 진행 중일 때 짧게 폴링
  useEffect(() => {
    if (!ready || !getToken()) return;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshList().catch(() => undefined);
    };
    const id = window.setInterval(tick, 4000);
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [ready, refreshList]);

  const meId = user?.id ?? '';
  const meLabel = user?.name || user?.email || '나';
  const partnerLabel = useMemo(() => {
    if (!room || !user) return '상대';
    const partner = room.members.find((m) => m.userId !== user.id);
    return partner?.name || partner?.email || '상대';
  }, [room, user]);

  const pending = useMemo(() => rows.filter(isPromisePending), [rows]);
  const completed = useMemo(() => rows.filter(isPromiseCompleted), [rows]);

  if (!ready) return <LoadingBlock />;

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BrandMark />
        <span style={{ width: 42 }} />
        <span style={{ width: 42 }} />
      </div>

      <section className="stack">
        <h1 className="hero-title">우리의 약속</h1>
        <AvatarPair
          left={{
            label: meLabel,
            userId: user?.id,
            hasAvatar: Boolean(user?.hasAvatar),
          }}
          right={{
            label: partnerLabel,
            userId: room?.members.find((m) => m.userId !== user?.id)?.userId,
            hasAvatar: Boolean(
              room?.members.find((m) => m.userId !== user?.id)?.hasAvatar,
            ),
          }}
          meUserId={user?.id}
          onMineUpdated={() => {
            void api<AuthUser>('/api/auth/me').then(setUser);
            void api<CoupleRoom | null>('/api/couples/me').then(setRoom);
          }}
        />
        <p className="muted">함께 서명한 약속을 인증하고 기록으로 남겨요.</p>
      </section>

      <Link className="btn btn-primary" href="/promises/new">
        {rows.length ? '새로운 약속 만들기' : '우리의 첫 약속 만들기'}
      </Link>

      {!rows.length ? (
        <div className="card stack">
          <strong>아직 약속이 없어요</strong>
          <p className="muted">첫 약속을 만들고 양측 서명으로 남겨 보세요.</p>
        </div>
      ) : (
        <>
          <section className="stack">
            <div className="section-head">
              <h2>진행 중</h2>
            </div>
            {!pending.length ? (
              <p className="muted">진행 중인 약속이 없어요.</p>
            ) : (
              pending.map((row) => {
                const needsAction = meId ? needsMySignature(row, meId) : false;
                const status = meId ? promiseStatusLabelForMe(row, meId) : row.status;
                return (
                  <Link
                    className="card promise-list-row"
                    key={row.id}
                    href={`/promises/${row.id}`}
                  >
                    <div className="promise-list-main">
                      <div className="promise-list-title">
                        {needsAction ? (
                          <span className="unread-dot" aria-label="서명 필요" />
                        ) : null}
                        <strong>{row.title}</strong>
                      </div>
                      <p className="muted promise-list-date">
                        {new Date(row.createdAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    <span
                      className={
                        needsAction
                          ? 'promise-status promise-status-action'
                          : 'promise-status'
                      }
                    >
                      {status}
                    </span>
                  </Link>
                );
              })
            )}
          </section>

          <section className="stack">
            <button
              type="button"
              className="completed-toggle"
              onClick={() => setCompletedOpen((v) => !v)}
              aria-expanded={completedOpen}
            >
              <span>서명 완료 {completed.length}건</span>
              <span className="muted">{completedOpen ? '접기' : '펼치기'}</span>
            </button>
            {completedOpen
              ? completed.map((row) => (
                  <Link className="card stack" key={row.id} href={`/promises/${row.id}`}>
                    <strong>{row.title}</strong>
                    <p className="muted">
                      {row.completedAt
                        ? new Date(row.completedAt).toLocaleString('ko-KR')
                        : new Date(row.createdAt).toLocaleString('ko-KR')}{' '}
                      · 서명 완료
                      {row.documentCode ? ` · ${row.documentCode}` : ''}
                    </p>
                  </Link>
                ))
              : null}
          </section>
        </>
      )}

      {error ? <p className="error">{error}</p> : null}
      <BottomNav />
    </main>
  );
}
