'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BackButton, BrandMark } from '@/components/ui';
import { SignaturePad } from '@/components/SignaturePad';
import { LoadingBlock } from '@/components/StateBlock';
import { api, getToken } from '@/lib/api';
import {
  PROMISE_CATEGORY_LABEL,
  promiseStatusLabelForMe,
  type CouplePromise,
  type PromiseCategory,
} from '@/lib/promises';
import type { AuthUser } from '@/lib/types';

type PartnerMode = 'choose' | 'sign' | 'edit';

export default function PromiseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [me, setMe] = useState<AuthUser | null>(null);
  const [row, setRow] = useState<CouplePromise | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [partnerMode, setPartnerMode] = useState<PartnerMode>('choose');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [condition, setCondition] = useState('');
  const [category, setCategory] = useState<PromiseCategory>('FREE');
  const [doneMessage, setDoneMessage] = useState('');

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  async function load() {
    const [user, promise] = await Promise.all([
      api<AuthUser>('/api/auth/me'),
      api<CouplePromise>(`/api/promises/${id}`),
    ]);
    setMe(user);
    setRow(promise);
    setTitle(promise.title);
    setContent(promise.content);
    setCondition(promise.condition);
    setCategory(promise.category);
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void load().catch((err) => setError(err instanceof Error ? err.message : '불러오기 실패'));
  }, [router, id]);

  function goToListSoon(message: string) {
    setDoneMessage(message);
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
    redirectTimer.current = setTimeout(() => {
      router.replace('/promises');
    }, 1800);
  }

  async function submitSignature(signature: string) {
    setBusy(true);
    setError('');
    try {
      const updated = await api<CouplePromise>(`/api/promises/${id}/sign`, {
        body: { signature },
      });
      setRow(updated);
      if (updated.status === 'COMPLETED') {
        goToListSoon('양쪽 서명이 완료됐어요. 목록으로 이동합니다.');
      } else {
        goToListSoon('서명을 전송했어요. 목록으로 이동합니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '서명 실패');
    } finally {
      setBusy(false);
    }
  }

  async function onEdit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const updated = await api<CouplePromise>(`/api/promises/${id}`, {
        method: 'PATCH',
        body: { title, content, condition, category },
      });
      setRow(updated);
      setPartnerMode('choose');
      goToListSoon('수정본을 재전송했어요. 목록으로 이동합니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 실패');
    } finally {
      setBusy(false);
    }
  }

  if (doneMessage) {
    return (
      <main className="shell promise-done">
        <div className="promise-done__mark" aria-hidden>
          <svg width="36" height="36" viewBox="0 0 24 24">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <strong className="promise-done__title">{doneMessage}</strong>
        <p className="muted">잠시 후 약속 목록으로 이동합니다.</p>
        <Link className="btn btn-primary" href="/promises">
          지금 목록으로
        </Link>
      </main>
    );
  }

  if (!row || !me) {
    if (error) {
      return (
        <main className="shell">
          <p className="error">{error}</p>
        </main>
      );
    }
    return <LoadingBlock />;
  }

  const isAuthor = row.authorId === me.id;
  const isPartner = row.partnerId === me.id;
  const canPartnerSign = row.status === 'AWAITING_PARTNER' && isPartner;
  const canAuthorResign = row.status === 'AWAITING_AUTHOR' && isAuthor;
  const canPartnerEditAgain = row.status === 'AWAITING_AUTHOR' && isPartner;
  const statusLabel = promiseStatusLabelForMe(row, me.id);
  const editing = partnerMode === 'edit';
  const signing =
    (canPartnerSign && partnerMode === 'sign') || canAuthorResign;

  return (
    <main className={`shell stack-lg${signing ? ' promise-signing' : ''}`}>
      <div className="topbar">
        <BackButton href="/promises" />
        <BrandMark />
        <span style={{ width: 42 }} />
      </div>

      {!editing ? (
        <article className="promise-sheet promise-enter">
          {row.status === 'COMPLETED' && row.documentCode ? (
            <div className="promise-stamp" aria-label={`인증번호 ${row.documentCode}`}>
              <span className="promise-stamp__label">확정</span>
              <span className="promise-stamp__code">{row.documentCode}</span>
            </div>
          ) : null}

          <header className="promise-sheet__head">
            <p className="promise-sheet__eyebrow">
              {PROMISE_CATEGORY_LABEL[row.category]}
            </p>
            <h1 className="promise-sheet__title">{row.title}</h1>
            <p className="promise-sheet__status">{statusLabel}</p>
          </header>

          <div className="promise-sheet__body">
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{row.content}</p>
            {row.condition ? (
              <div className="promise-sheet__condition">
                <span className="muted">미이행 시</span>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{row.condition}</p>
              </div>
            ) : null}
          </div>

          <div className="promise-sign-grid">
            <div className="promise-sign-cell">
              <span className="muted">
                {row.author.name || row.author.email || '작성자'}
              </span>
              {row.authorSignature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="promise-sign-img"
                  src={row.authorSignature}
                  alt="작성자 서명"
                />
              ) : (
                <div className="promise-sign-empty">서명 대기</div>
              )}
            </div>
            <div className="promise-sign-cell">
              <span className="muted">
                {row.partner.name || row.partner.email || '상대'}
              </span>
              {row.partnerSignature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="promise-sign-img"
                  src={row.partnerSignature}
                  alt="상대 서명"
                />
              ) : (
                <div className="promise-sign-empty">서명 대기</div>
              )}
            </div>
          </div>

          {row.status === 'COMPLETED' && row.documentCode ? (
            <div className="promise-sheet__actions">
              <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                확정{' '}
                {row.completedAt
                  ? new Date(row.completedAt).toLocaleString('ko-KR')
                  : '-'}
              </p>
              <Link
                className="btn btn-secondary"
                href={`/promises/export/${row.documentCode}`}
              >
                내보내기
              </Link>
            </div>
          ) : null}
        </article>
      ) : (
        <form className="promise-sheet stack" onSubmit={onEdit}>
          <div className="field">
            <label htmlFor="category">카테고리</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as PromiseCategory)}
            >
              {(Object.keys(PROMISE_CATEGORY_LABEL) as PromiseCategory[]).map((c) => (
                <option key={c} value={c}>
                  {PROMISE_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="title">제목</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="content">내용</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={5}
            />
          </div>
          <div className="field">
            <label htmlFor="condition">미이행 시 조건</label>
            <textarea
              id="condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              rows={3}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? '전송 중…' : '수정본 재전송'}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setPartnerMode('choose')}
          >
            취소
          </button>
        </form>
      )}

      {canPartnerSign && partnerMode === 'choose' ? (
        <section className="stack promise-enter">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setPartnerMode('sign')}
          >
            서명하기
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setPartnerMode('edit')}
          >
            내용 수정 후 재전송
          </button>
        </section>
      ) : null}

      {canPartnerSign && partnerMode === 'sign' ? (
        <section className="promise-sign-stage stack promise-enter">
          <strong>내용 확인 후 서명</strong>
          <SignaturePad
            actionLabel={busy ? '처리 중…' : '밀어 서명 확정'}
            busy={busy}
            onAction={submitSignature}
          />
          <button
            className="btn btn-ghost"
            type="button"
            disabled={busy}
            onClick={() => setPartnerMode('choose')}
          >
            뒤로
          </button>
        </section>
      ) : null}

      {canAuthorResign ? (
        <section className="promise-sign-stage stack promise-enter">
          <strong>수정본에 재서명</strong>
          <SignaturePad
            actionLabel={busy ? '처리 중…' : '밀어 서명 확정'}
            busy={busy}
            onAction={submitSignature}
          />
        </section>
      ) : null}

      {canPartnerEditAgain && partnerMode === 'choose' ? (
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => setPartnerMode('edit')}
        >
          내용 다시 수정하고 재전송
        </button>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
      {!signing ? (
        <Link className="btn btn-ghost" href="/promises">
          목록으로
        </Link>
      ) : null}
    </main>
  );
}
