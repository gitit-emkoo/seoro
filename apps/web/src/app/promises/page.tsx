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
  PROMISE_CATEGORY_LABEL,
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
  const [completedOpen, setCompletedOpen] = useState(true);

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
  const partnerMember = useMemo(() => {
    if (!room || !user) return undefined;
    return room.members.find((m) => m.userId !== user.id);
  }, [room, user]);
  const partnerLabel = partnerMember?.name || partnerMember?.email || '상대';

  const pending = useMemo(() => rows.filter(isPromisePending), [rows]);
  const completed = useMemo(() => rows.filter(isPromiseCompleted), [rows]);

  const actionHero = useMemo(() => {
    if (!meId) return null;
    return pending.find((row) => needsMySignature(row, meId)) ?? null;
  }, [pending, meId]);

  const otherPending = useMemo(() => {
    if (!actionHero) return pending;
    return pending.filter((row) => row.id !== actionHero.id);
  }, [pending, actionHero]);

  const latestCompleted = completed[0] ?? null;

  if (!ready) return <LoadingBlock />;

  return (
    <main className="shell stack-lg promise-home">
      <div className="topbar">
        <BrandMark />
        <span style={{ width: 42 }} />
        <span style={{ width: 42 }} />
      </div>

      <section className="promise-home__intro">
        <div className="promise-home__titles">
          <h1 className="hero-title">우리의 약속</h1>
          <p className="muted" style={{ margin: 0 }}>
            {meLabel} · {partnerLabel}
          </p>
        </div>
        <AvatarPair
          left={{
            label: meLabel,
            userId: user?.id,
            hasAvatar: Boolean(user?.hasAvatar),
          }}
          right={{
            label: partnerLabel,
            userId: partnerMember?.userId,
            hasAvatar: Boolean(partnerMember?.hasAvatar),
          }}
          meUserId={user?.id}
          onMineUpdated={() => {
            void api<AuthUser>('/api/auth/me').then(setUser);
            void api<CoupleRoom | null>('/api/couples/me').then(setRoom);
          }}
        />
      </section>

      {!rows.length ? (
        <section className="promise-empty promise-enter">
          <div className="promise-empty__sheet" aria-hidden>
            <span className="promise-empty__line" />
            <span className="promise-empty__line short" />
            <span className="promise-empty__line" />
          </div>
          <strong>아직 약속이 없어요</strong>
          <p className="muted" style={{ margin: 0 }}>
            첫 문서를 만들고 양측 서명으로 남겨 보세요.
          </p>
          <Link className="btn btn-primary" href="/promises/new">
            첫 약속 쓰기
          </Link>
        </section>
      ) : (
        <>
          {actionHero ? (
            <Link
              className="promise-hero promise-enter"
              href={`/promises/${actionHero.id}`}
            >
              <span className="promise-hero__eyebrow">지금 서명할 약속</span>
              <strong className="promise-hero__title">{actionHero.title}</strong>
              <span className="promise-hero__status">
                {promiseStatusLabelForMe(actionHero, meId)}
              </span>
              <span className="promise-hero__cta">서명하러 가기</span>
            </Link>
          ) : latestCompleted ? (
            <div className="promise-stack promise-enter">
              <div className="promise-stack__back" aria-hidden />
              <div className="promise-stack__mid" aria-hidden />
              <Link
                className="promise-stack__front"
                href={`/promises/${latestCompleted.id}`}
              >
                {latestCompleted.documentCode ? (
                  <span className="promise-stack__stamp" aria-hidden>
                    확정
                  </span>
                ) : null}
                <span className="promise-stack__eyebrow">
                  {PROMISE_CATEGORY_LABEL[latestCompleted.category]}
                </span>
                <strong className="promise-stack__title">
                  {latestCompleted.title}
                </strong>
                <p className="promise-stack__body">
                  {latestCompleted.content.slice(0, 72)}
                  {latestCompleted.content.length > 72 ? '…' : ''}
                </p>
                <span className="promise-stack__meta">
                  서명 완료 {completed.length}건 · 최근 기록 보기
                </span>
              </Link>
            </div>
          ) : null}

          <Link className="promise-create-link" href="/promises/new">
            <span className="promise-create-link__plus" aria-hidden>
              +
            </span>
            <span>새로운 약속 쓰기</span>
          </Link>

          {otherPending.length ? (
            <section className="stack">
              <div className="section-head">
                <h2>진행 중</h2>
              </div>
              {otherPending.map((row) => {
                const needsAction = meId ? needsMySignature(row, meId) : false;
                const status = meId ? promiseStatusLabelForMe(row, meId) : row.status;
                return (
                  <Link
                    className="promise-doc-row promise-enter"
                    key={row.id}
                    href={`/promises/${row.id}`}
                  >
                    <span className="promise-doc-row__mark" aria-hidden />
                    <div className="promise-list-main">
                      <div className="promise-list-title">
                        {needsAction ? (
                          <span className="unread-dot" aria-label="서명 필요" />
                        ) : null}
                        <strong>{row.title}</strong>
                      </div>
                      <p className="muted promise-list-date">
                        {PROMISE_CATEGORY_LABEL[row.category]} ·{' '}
                        {new Date(row.createdAt).toLocaleDateString('ko-KR')}
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
              })}
            </section>
          ) : null}

          {completed.length ? (
            <section className="stack">
              <button
                type="button"
                className="completed-toggle"
                onClick={() => setCompletedOpen((v) => !v)}
                aria-expanded={completedOpen}
              >
                <span>보관함 · 서명 완료 {completed.length}건</span>
                <span className="muted">{completedOpen ? '접기' : '펼치기'}</span>
              </button>
              {completedOpen
                ? completed.map((row) => (
                    <Link
                      className="promise-doc-row promise-enter"
                      key={row.id}
                      href={`/promises/${row.id}`}
                    >
                      <span className="promise-doc-row__seal" aria-hidden>
                        ✓
                      </span>
                      <div className="promise-list-main">
                        <div className="promise-list-title">
                          <strong>{row.title}</strong>
                        </div>
                        <p className="muted promise-list-date">
                          {row.completedAt
                            ? new Date(row.completedAt).toLocaleDateString('ko-KR')
                            : new Date(row.createdAt).toLocaleDateString('ko-KR')}
                          {row.documentCode ? ` · ${row.documentCode}` : ''}
                        </p>
                      </div>
                    </Link>
                  ))
                : null}
            </section>
          ) : null}
        </>
      )}

      {error ? <p className="error">{error}</p> : null}
      <BottomNav />
    </main>
  );
}
