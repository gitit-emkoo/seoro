'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/ui';
import { api, getToken, setToken } from '@/lib/api';

type Submission = {
  id: string;
  status: string;
  user: { email: string; name: string | null };
  verificationItem: { title: string };
};

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<unknown[]>([]);
  const [rooms, setRooms] = useState<unknown[]>([]);
  const [orders, setOrders] = useState<unknown[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; totalAmount: number; perPersonAmount: number }>>([]);
  const [logs, setLogs] = useState<unknown[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    const [u, r, o, s, p, l] = await Promise.all([
      api('/api/admin/users'),
      api('/api/admin/rooms'),
      api('/api/admin/orders'),
      api<Submission[]>('/api/admin/submissions'),
      api<Array<{ id: string; name: string; totalAmount: number; perPersonAmount: number }>>(
        '/api/admin/plans',
      ),
      api('/api/admin/logs'),
    ]);
    setUsers(u as unknown[]);
    setRooms(r as unknown[]);
    setOrders(o as unknown[]);
    setSubmissions(s);
    setPlans(p);
    setLogs(l as unknown[]);
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void (async () => {
      try {
        const me = await api<{ role: string }>('/api/auth/me');
        if (me.role !== 'ADMIN') {
          setError('관리자만 접근할 수 있습니다.');
          return;
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : '접근 실패');
      }
    })();
  }, [router]);

  async function review(id: string, status: 'UNDER_REVIEW' | 'NEEDS_REVISION' | 'VERIFIED' | 'UNVERIFIABLE') {
    setBusy(id);
    setError('');
    try {
      await api(`/api/admin/submissions/${id}/review`, {
        method: 'PATCH',
        body: {
          status,
          revisionRequest: status === 'NEEDS_REVISION' ? '추가 서류를 제출해 주세요.' : undefined,
          resultSummary:
            status === 'VERIFIED'
              ? '관리자 검토 반영(공식 기관 진위 확인 아님)'
              : undefined,
          unverifiableReason:
            status === 'UNVERIFIABLE' ? '현재 확인 가능한 경로가 없습니다.' : undefined,
        },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경 실패');
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="shell stack-lg" style={{ maxWidth: 720 }}>
      <div className="topbar">
        <BrandMark />
        <button
          className="btn-chip btn"
          type="button"
          onClick={() => {
            setToken(null);
            router.replace('/login');
          }}
        >
          로그아웃
        </button>
      </div>

      <section className="stack">
        <h1 className="hero-title">관리자</h1>
        <p className="muted">운영 현황 · 제출 검토 · 상품/항목 관리</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="card stack">
        <strong>요약</strong>
        <div className="meta"><span>회원</span><span>{users.length}</span></div>
        <div className="meta"><span>커플 공간</span><span>{rooms.length}</span></div>
        <div className="meta"><span>주문</span><span>{orders.length}</span></div>
        <div className="meta"><span>제출</span><span>{submissions.length}</span></div>
        <div className="meta"><span>감사 로그</span><span>{logs.length}</span></div>
      </section>

      <section className="stack">
        <h2>상품 가격</h2>
        {plans.map((p) => (
          <div className="list-card" key={p.id}>
            <div className="label">{p.name}</div>
            <span className="muted">
              총 {p.totalAmount.toLocaleString()} / 1인 {p.perPersonAmount.toLocaleString()}
            </span>
          </div>
        ))}
      </section>

      <section className="stack">
        <h2>제출 자료 검토</h2>
        {submissions.map((s) => (
          <div className="card stack" key={s.id}>
            <strong>{s.verificationItem.title}</strong>
            <p className="muted">{s.user.name || s.user.email}</p>
            <div className="meta"><span>상태</span><span>{s.status}</span></div>
            <div className="stack">
              <button className="btn btn-secondary" disabled={busy === s.id} onClick={() => void review(s.id, 'UNDER_REVIEW')}>
                검토 대기
              </button>
              <button className="btn btn-secondary" disabled={busy === s.id} onClick={() => void review(s.id, 'NEEDS_REVISION')}>
                보완 요청
              </button>
              <button className="btn btn-secondary" disabled={busy === s.id} onClick={() => void review(s.id, 'VERIFIED')}>
                확인 완료(관리자 검토)
              </button>
              <button className="btn btn-ghost" disabled={busy === s.id} onClick={() => void review(s.id, 'UNVERIFIABLE')}>
                확인 불가
              </button>
            </div>
          </div>
        ))}
        {!submissions.length ? <p className="muted">제출된 자료가 없습니다.</p> : null}
      </section>
    </main>
  );
}
