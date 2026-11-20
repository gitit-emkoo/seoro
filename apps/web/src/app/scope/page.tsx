'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton, BrandMark } from '@/components/ui';
import { ProgressSteps } from '@/components/ProgressSteps';
import { api, getToken } from '@/lib/api';

type Item = {
  id: string;
  code: string;
  title: string;
  description: string;
  legalAvailabilityStatus: string;
};

type Plan = {
  id: string;
  code: 'BASIC' | 'EXTENDED';
  name: string;
  description: string;
  totalAmount: number;
  perPersonAmount: number;
  items: Array<{ verificationItem: Item }>;
};

type Selection = {
  itemIds: string[];
  planCode?: 'BASIC' | 'EXTENDED' | null;
  status?: 'DRAFT' | 'SUBMITTED';
  submittedAt?: string | null;
};

export default function ScopePage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [planCode, setPlanCode] = useState<'BASIC' | 'EXTENDED'>('BASIC');
  const [selectionStatus, setSelectionStatus] = useState<'DRAFT' | 'SUBMITTED' | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [itemList, planList, me] = await Promise.all([
      api<Item[]>('/api/verification-items'),
      api<Plan[]>('/api/product-plans'),
      api<{ selection: Selection | null }>('/api/scope/me'),
    ]);
    setItems(itemList);
    setPlans(planList);
    if (me.selection?.itemIds?.length) {
      setSelected(me.selection.itemIds);
      setSelectionStatus(me.selection.status ?? null);
    } else if (planList[0]) {
      const basic = planList.find((p) => p.code === 'BASIC') ?? planList[0];
      setSelected(basic.items.map((i) => i.verificationItem.id));
      setSelectionStatus(null);
    }
    if (me.selection?.planCode) setPlanCode(me.selection.planCode);
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void load().catch((err) => setError(err instanceof Error ? err.message : '불러오기 실패'));
  }, [router]);

  const activePlan = useMemo(
    () => plans.find((p) => p.code === planCode),
    [plans, planCode],
  );
  const isSubmitted = selectionStatus === 'SUBMITTED';

  function applyPlan(code: 'BASIC' | 'EXTENDED') {
    const plan = plans.find((p) => p.code === code);
    if (!plan) return;
    setPlanCode(code);
    setSelected(plan.items.map((i) => i.verificationItem.id));
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function submit() {
    setBusy(true);
    setError('');
    setToast('');
    try {
      await api('/api/scope', { body: { itemIds: selected, planCode } });
      setSelectionStatus('SUBMITTED');
      setToast('선택이 저장되었습니다.');
      router.push('/scope/compare');
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  async function resetSelection() {
    setBusy(true);
    setError('');
    setToast('');
    try {
      const res = await api<{ message: string; selection: Selection | null }>(
        '/api/scope/reset',
        { method: 'POST' },
      );
      setSelectionStatus('DRAFT');
      setToast(res.message || '선택이 취소되었습니다. 다시 고를 수 있어요.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '선택 취소에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BackButton href="/home" />
        <BrandMark />
        <span style={{ width: 42 }} />
      </div>
      <ProgressSteps current="scope" />

      <section className="stack">
        <h1 className="hero-title">
          {isSubmitted ? '선택 수정하기' : '다음 할 일: 확인 항목 선택'}
        </h1>
        <p className="muted">
          {isSubmitted
            ? '이미 선택 완료된 상태입니다. 항목을 바꾼 뒤 다시 저장하거나, 선택을 취소할 수 있어요. 바꾸면 기존 합의는 다시 받아야 합니다.'
            : '상대방과 같은 기준으로 진행돼요. 지금은 나만의 선택을 남겨 주세요.'}
        </p>
      </section>

      {isSubmitted ? (
        <section className="card stack">
          <strong>내 선택 상태: 완료됨</strong>
          <p className="muted">결제 전이라면 언제든 다시 고를 수 있습니다.</p>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={busy}
            onClick={() => void resetSelection()}
          >
            {busy ? '처리 중…' : '선택 취소하고 다시 고르기'}
          </button>
          <Link className="btn btn-ghost" href="/scope/compare">
            합의 화면으로
          </Link>
        </section>
      ) : null}

      <section className="stack">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            className={`card card-row ${planCode === plan.code ? 'card-soft' : ''}`}
            onClick={() => applyPlan(plan.code)}
            style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
          >
            <div className="icon-bubble">{plan.code === 'BASIC' ? '①' : '②'}</div>
            <div style={{ flex: 1 }}>
              <strong>{plan.name}</strong>
              <p className="muted">{plan.description}</p>
              <p className="muted">
                1인 {plan.perPersonAmount.toLocaleString()}원 · 총{' '}
                {plan.totalAmount.toLocaleString()}원
              </p>
            </div>
          </button>
        ))}
      </section>

      <section className="stack">
        <div className="section-head">
          <h2>세부 항목</h2>
          <span className="link-quiet">{selected.length}개 선택</span>
        </div>
        {items.map((item) => {
          const on = selected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className="list-card"
              onClick={() => toggle(item.id)}
              style={{ width: '100%', border: 'none', textAlign: 'left' }}
            >
              <div className="icon-bubble">{on ? '✓' : '+'}</div>
              <div className="label">
                <div>{item.title}</div>
                <div className="muted" style={{ fontWeight: 500 }}>
                  {item.description}
                </div>
                {item.legalAvailabilityStatus !== 'AVAILABLE' ? (
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    현재 공식 검증 경로는 제한적/미확보 상태입니다.
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </section>

      {activePlan ? (
        <p className="muted">
          추천 구성: {activePlan.name}. 항목은 직접 조정할 수 있어요.
        </p>
      ) : null}
      {toast ? <p className="muted">{toast}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <button className="btn btn-primary" onClick={submit} disabled={busy || !selected.length}>
        {busy ? '저장 중…' : isSubmitted ? '다시 저장하고 합의로' : '선택 완료'}
      </button>
      <Link className="btn btn-ghost" href="/home">
        홈으로
      </Link>
    </main>
  );
}
