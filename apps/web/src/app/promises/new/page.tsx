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
    <main className="shell stack-lg">
      <div className="topbar">
        <BackButton href="/promises" />
        <BrandMark />
        <span style={{ width: 42 }} />
      </div>

      <section className="stack">
        <h1 className="hero-title">약속 만들기</h1>
        <p className="muted">작성 후 서명하면 상대방에게 전달됩니다.</p>
      </section>

      <section className="card stack">
        <div className="field">
          <label htmlFor="category">카테고리</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as PromiseCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {PROMISE_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="title">제목</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="약속 제목"
          />
        </div>
        <div className="field">
          <label htmlFor="content">내용</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={5}
            placeholder="함께 지킬 약속 내용"
          />
        </div>
        <div className="field">
          <label htmlFor="condition">미이행 시 조건 (선택)</label>
          <textarea
            id="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            rows={3}
            placeholder="지키지 못했을 때의 약속/조건"
          />
        </div>

        <div className="stack">
          <strong>서명</strong>
          <SignaturePad
            actionLabel={busy ? '전송 중…' : '서명완료 및 전송'}
            busy={busy}
            onAction={submitWithSignature}
          />
        </div>

        {error ? <p className="error">{error}</p> : null}
      </section>

      <Link className="btn btn-ghost" href="/promises">
        목록으로
      </Link>
    </main>
  );
}
