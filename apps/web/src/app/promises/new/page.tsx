'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton, BrandMark } from '@/components/ui';
import { SignaturePad } from '@/components/SignaturePad';
import { LoadingBlock } from '@/components/StateBlock';
import { api, getToken } from '@/lib/api';
import { fetchJourneyStatus } from '@/lib/progress';
import {
  PROMISE_CATEGORY_LABEL,
  type CouplePromise,
  type PromiseCategory,
} from '@/lib/promises';

const CATEGORIES = Object.keys(PROMISE_CATEGORY_LABEL) as PromiseCategory[];

export default function PromiseCreatePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [category, setCategory] = useState<PromiseCategory>('FREE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [condition, setCondition] = useState('');
  const [showCondition, setShowCondition] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void (async () => {
      const status = await fetchJourneyStatus();
      if (!status?.promiseUnlocked) {
        router.replace(status?.path || '/home');
        return;
      }
      setReady(true);
    })();
  }, [router]);

  async function submitWithSignature(authorSignature: string) {
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api<CouplePromise>('/api/promises', {
        body: {
          category,
          title: title.trim(),
          content: content.trim(),
          condition: condition.trim(),
          authorSignature,
        },
      });
      router.replace('/promises');
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성 실패');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <LoadingBlock />;

  return (
    <main className="shell promise-compose">
      <div className="topbar">
        <BackButton href="/promises" />
        <BrandMark />
        <span style={{ width: 42 }} />
      </div>

      <article className="promise-compose__sheet promise-enter">
        <div className="promise-chip-row" role="listbox" aria-label="카테고리">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={category === c}
              className={`promise-chip${category === c ? ' is-active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {PROMISE_CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        <input
          className="promise-compose__title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="약속 제목을 적어 주세요"
          aria-label="제목"
        />

        <textarea
          className="promise-compose__body"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="함께 지킬 내용을 자유롭게 적어요."
          rows={7}
          aria-label="내용"
        />

        {showCondition ? (
          <textarea
            className="promise-compose__condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="지키지 못했을 때의 조건 (선택)"
            rows={3}
            aria-label="미이행 시 조건"
          />
        ) : (
          <button
            type="button"
            className="promise-compose__add-condition"
            onClick={() => setShowCondition(true)}
          >
            + 미이행 조건 추가
          </button>
        )}

        <div className="promise-compose__signers" aria-hidden>
          <div className="promise-compose__signer">
            <span>나</span>
            <em>서명 예정</em>
          </div>
          <div className="promise-compose__signer">
            <span>상대</span>
            <em>대기</em>
          </div>
        </div>
      </article>

      <section className="promise-compose__dock promise-enter">
        <p className="promise-compose__dock-label">서명하면 상대에게 전달됩니다</p>
        <SignaturePad
          actionLabel={busy ? '전송 중…' : '밀어 서명·전송'}
          busy={busy}
          onAction={submitWithSignature}
        />
        {error ? <p className="error">{error}</p> : null}
        <Link className="btn btn-ghost" href="/promises">
          목록으로
        </Link>
      </section>
    </main>
  );
}
