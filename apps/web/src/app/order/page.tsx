'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton, BrandMark } from '@/components/ui';
import { ProgressSteps } from '@/components/ProgressSteps';
import { api, getToken } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';

type Plan = {
  id: string;
  code: string;
  name: string;
  totalAmount: number;
  perPersonAmount: number;
};

type Order = {
  id: string;
  status: string;
  totalAmount: number;
  perPersonAmount: number;
  productPlan: Plan;
  payments: Array<{
    id: string;
    userId: string;
    amount: number;
    status: string;
    user: { id: string; name: string | null; email: string };
  }>;
};

export default function OrderPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [meId, setMeId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setError('');
    const [me, current] = await Promise.all([
      api<{ id: string }>('/api/auth/me'),
      api<Order | null>('/api/orders/current'),
    ]);
    setMeId(me.id);
    setOrder(current);

    if (current) {
      setPlans([]);
      return;
    }

    try {
      const planList = await api<Plan[]>('/api/product-plans/eligible');
      setPlans(planList);
    } catch (err) {
      setPlans([]);
      setError(err instanceof Error ? err.message : '상품을 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void refresh().catch((err) => setError(err instanceof Error ? err.message : '불러오기 실패'));
  }, [router]);

  // 상대방 결제 대기 중 자동 갱신
  usePolling(
    Boolean(order && order.status !== 'PAID' && !busy),
    async () => {
      const current = await api<Order | null>('/api/orders/current');
      setOrder(current);
      if (current?.status === 'PAID') router.push('/submissions');
    },
    3000,
  );

  async function createOrder(productPlanId: string) {
    setBusy(true);
    setError('');
    try {
      const created = await api<Order>('/api/orders', { body: { productPlanId } });
      setOrder(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 생성 실패');
    } finally {
      setBusy(false);
    }
  }

  async function mockPay() {
    setBusy(true);
    setError('');
    try {
      const updated = await api<Order>('/api/payments/mock-pay', { method: 'POST' });
      setOrder(updated);
      if (updated?.status === 'PAID') router.push('/submissions');
    } catch (err) {
      setError(err instanceof Error ? err.message : '결제 실패');
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder() {
    setBusy(true);
    setError('');
    try {
      await api('/api/orders/cancel', { method: 'POST' });
      setOrder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 취소 실패');
    } finally {
      setBusy(false);
    }
  }

  const myPayment = order?.payments.find((p) => p.userId === meId);

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BackButton href="/scope/compare" />
        <BrandMark />
        <span style={{ width: 42 }} />
      </div>
      <ProgressSteps current="pay" />

      <section className="stack">
        <h1 className="hero-title">다음 할 일: 내 몫 결제</h1>
        <p className="muted">양측이 각자 결제해야 자료 제출이 시작됩니다. (목업)</p>
      </section>

      {!order ? (
        <section className="stack">
          {!plans.length ? (
            <p className="muted">
              합의된 상품이 없습니다. 확인 범위 합의를 먼저 완료해 주세요.
            </p>
          ) : null}
          {plans.map((plan) => (
            <div className="card stack" key={plan.id}>
              <strong>{plan.name}</strong>
              <p className="muted">
                총 {plan.totalAmount.toLocaleString()}원 · 1인{' '}
                {plan.perPersonAmount.toLocaleString()}원
              </p>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void createOrder(plan.id)}
              >
                이 상품으로 주문
              </button>
            </div>
          ))}
        </section>
      ) : (
        <section className="card stack">
          <strong>{order.productPlan.name}</strong>
          <p className="muted">
            커플 총액 {order.totalAmount.toLocaleString()}원 · 주문 상태 {order.status}
          </p>
          {order.payments.map((p) => (
            <div className="list-card" key={p.id}>
              <div className="icon-bubble">{p.status === 'PAID' ? '✓' : '…'}</div>
              <div className="label">{p.user.name || p.user.email}</div>
              <span className="muted">
                {p.amount.toLocaleString()}원 · {p.status === 'PAID' ? '결제 완료' : '미결제'}
              </span>
            </div>
          ))}
          {order.status === 'PAID' ? (
            <Link className="btn btn-primary" href="/submissions">
              자료 제출로 이동
            </Link>
          ) : myPayment?.status === 'PAID' ? (
            <p className="muted">나의 결제 완료 · 상대방 결제 대기</p>
          ) : (
            <button className="btn btn-primary" disabled={busy} onClick={() => void mockPay()}>
              {busy ? '처리 중…' : `내 몫 결제하기 (목업 ${order.perPersonAmount.toLocaleString()}원)`}
            </button>
          )}
          <button className="btn btn-secondary" type="button" onClick={() => void refresh()}>
            상태 새로고침
          </button>
          {order.status !== 'PAID' ? (
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void cancelOrder()}>
              주문 취소
            </button>
          ) : null}
        </section>
      )}

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
