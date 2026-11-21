'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BackButton, BrandMark } from '@/components/ui';
import { SignaturePad } from '@/components/SignaturePad';
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
      <main className="shell stack-lg">
        <div className="topbar">
          <BackButton href="/promises" />
          <BrandMark />
          <span style={{ width: 42 }} />
        </div>
        <section className="card stack">
          <strong>{doneMessage}</strong>
          <p className="muted">잠시 후 약속 목록으로 이동합니다.</p>
          <Link className="btn btn-primary" href="/promises">
            지금 목록으로
          </Link>
        </section>
      </main>
    );
  }

  if (!row || !me) {
    return (
      <main className="shell">
        <p className="muted">{error || '불러오는 중…'}</p>
      </main>
    );
  }

  const isAuthor = row.authorId === me.id;
  const isPartner = row.partnerId === me.id;
  const canPartnerSign = row.status === 'AWAITING_PARTNER' && isPartner;
  const canAuthorResign = row.status === 'AWAITING_AUTHOR' && isAuthor;
  const canPartnerEditAgain =
    row.status === 'AWAITING_AUTHOR' && isPartner;
  const statusLabel = promiseStatusLabelForMe(row, me.id);
  const editing = partnerMode === 'edit';

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BackButton href="/promises" />
        <BrandMark />
        <span style={{ width: 42 }} />
      </div>

      <section className="stack">
        <h1 className="hero-title">{row.title}</h1>
        <p className="muted">
          {PROMISE_CATEGORY_LABEL[row.category]} · {statusLabel}
        </p>
      </section>

      {!editing ? (
        <section className="card stack">
          <div>
            <div className="muted">내용</div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{row.content}</p>
          </div>
          {row.condition ? (
            <div>
              <div className="muted">미이행 시 조건</div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{row.condition}</p>
            </div>
          ) : null}
          <div className="meta">
            <span>작성자</span>
            <span>{row.author.name || row.author.email}</span>
          </div>
          <div className="meta">
            <span>상대</span>
            <span>{row.partner.name || row.partner.email}</span>
          </div>
          {row.authorSignature ? (
            <div className="stack">
              <div className="muted">작성자 서명</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="signature-preview" src={row.authorSignature} alt="작성자 서명" />
            </div>
          ) : null}
          {row.partnerSignature ? (
            <div className="stack">
              <div className="muted">상대 서명</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="signature-preview" src={row.partnerSignature} alt="상대 서명" />
            </div>
          ) : null}
          {row.status === 'COMPLETED' ? (
            <div className="card-soft stack">
              <strong>확정된 기록</strong>
              <p className="muted">인증번호 {row.documentCode}</p>
              <p className="muted">
                확정{' '}
                {row.completedAt
                  ? new Date(row.completedAt).toLocaleString('ko-KR')
                  : '-'}
              </p>
              {row.documentCode ? (
                <Link className="btn btn-secondary" href={`/promises/export/${row.documentCode}`}>
                  내보내기
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : (
        <form className="card stack" onSubmit={onEdit}>
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

      {/* 받은 쪽: 서명 vs 수정 — 한 번에 하나만 */}
      {canPartnerSign && partnerMode === 'choose' ? (
        <section className="stack">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setPartnerMode('sign')}
          >
            서명하기
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setPartnerMode('edit')}
          >
            내용 수정 후 재전송
          </button>
        </section>
      ) : null}

      {canPartnerSign && partnerMode === 'sign' ? (
        <section className="card stack">
          <strong>내용 확인 후 서명</strong>
          <SignaturePad
            actionLabel={busy ? '처리 중…' : '서명완료'}
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

      {/* 작성자 재서명 */}
      {canAuthorResign ? (
        <section className="card stack">
          <strong>수정본에 재서명</strong>
          <SignaturePad
            actionLabel={busy ? '처리 중…' : '서명완료'}
            busy={busy}
            onAction={submitSignature}
          />
        </section>
      ) : null}

      {/* 수정 재전송 후, 상대 서명 대기 중에도 다시 수정 가능 */}
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
      <Link className="btn btn-ghost" href="/promises">
        목록으로
      </Link>
    </main>
  );
}
