'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton, BrandMark } from '@/components/ui';
import { api, getToken } from '@/lib/api';
import { usePolling } from '@/lib/usePolling';

type CompareData = {
  bothReady: boolean;
  members: Array<{
    userId: string;
    name: string | null;
    email: string;
    submitted: boolean;
    itemIds: string[];
  }>;
  items: Array<{ id: string; title: string }>;
  bothSelected: string[];
  onlyA: string[];
  onlyB: string[];
  awaitingAgreement: string[];
  agreement: {
    id: string;
    status: string;
    agreedItemIds: string[];
    approvals: Array<{ userId: string }>;
  } | null;
  meUserId: string;
};

function selectionKey(ids: string[]) {
  return [...ids].sort().join(',');
}

function draftFrom(res: CompareData) {
  return res.agreement?.agreedItemIds?.length
    ? res.agreement.agreedItemIds
    : res.bothSelected;
}

export default function ScopeComparePage() {
  const router = useRouter();
  const [data, setData] = useState<CompareData | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const prevRef = useRef<CompareData | null>(null);
  const redirectedRef = useRef(false);

  const goToOrder = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    setLive(false);
    router.replace('/order');
  }, [router]);

  const applyCompare = useCallback(
    (res: CompareData, forceDraft: boolean) => {
      const prev = prevRef.current;
      const nextDraft = draftFrom(res);
      const serverChanged =
        !prev ||
        selectionKey(prev.bothSelected) !== selectionKey(res.bothSelected) ||
        selectionKey(prev.awaitingAgreement) !== selectionKey(res.awaitingAgreement) ||
        prev.agreement?.status !== res.agreement?.status ||
        selectionKey(prev.agreement?.agreedItemIds ?? []) !==
          selectionKey(res.agreement?.agreedItemIds ?? []) ||
        prev.agreement?.approvals.length !== res.agreement?.approvals.length ||
        prev.bothReady !== res.bothReady;

      setData(res);
      prevRef.current = res;

      if (forceDraft || serverChanged) {
        setDraft(nextDraft);
      }

      if (res.agreement?.status === 'AGREED') {
        goToOrder();
      }
    },
    [goToOrder],
  );

  const load = useCallback(
    async (forceDraft = false) => {
      const res = await api<CompareData>('/api/scope/compare');
      applyCompare(res, forceDraft);
      setError('');
      return res;
    },
    [applyCompare],
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void load(true)
      .then((res) => {
        if (res.agreement?.status !== 'AGREED') setLive(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : '불러오기 실패'));
  }, [router, load]);

  usePolling(live && !busy, () => load(false), 3000);

  const itemMap = useMemo(() => {
    const map = new Map<string, string>();
    data?.items.forEach((i) => map.set(i.id, i.title));
    return map;
  }, [data]);

  function toggle(id: string) {
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function approve() {
    setBusy(true);
    setError('');
    try {
      const agreement = await api<{ status: string }>('/api/scope/approve', {
        body: { approvedItemIds: draft },
      });
      await load(true);
      if (agreement.status === 'AGREED') {
        goToOrder();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '합의 실패');
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <main className="shell">
        <p className="muted">{error || '불러오는 중…'}</p>
      </main>
    );
  }

  const [memberA, memberB] = data.members;
  const myApproval = data.agreement?.approvals.some((a) => a.userId === data.meUserId);
  const agreedCount =
    data.agreement?.status === 'AGREED'
      ? (data.agreement.agreedItemIds?.length ?? draft.length)
      : data.bothSelected.length;
  const pendingCount =
    data.agreement?.status === 'AGREED' ? 0 : data.awaitingAgreement.length;
  const itemsMatch =
    data.bothReady &&
    data.awaitingAgreement.length === 0 &&
    data.bothSelected.length > 0;

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BackButton href="/scope" />
        <BrandMark />
        <span style={{ width: 42 }} />
      </div>

      <section className="stack">
        <h1 className="hero-title">
          {itemsMatch
            ? '서로 항목이 일치해요'
            : '함께 확인할 항목을 정해 보세요'}
        </h1>
        {!itemsMatch ? (
          <p className="muted">
            {`공통 선택과 아직 합의되지 않은 항목을 구분해 보여 드려요.${
              live ? ' · 상대방 변경은 자동으로 반영돼요.' : ''
            }`}
          </p>
        ) : null}
      </section>

      {!data.bothReady ? (
        <section className="card stack">
          <strong>상대방이 확인 항목을 선택하고 있습니다.</strong>
          <p className="muted">나의 선택 완료 · 상대방 선택 대기 (자동 갱신 중)</p>
          {data.members.map((m) => (
            <div className="list-card" key={m.userId}>
              <div className="icon-bubble">{m.submitted ? '✓' : '…'}</div>
              <div className="label">{m.name || m.email}</div>
              <span className="muted">{m.submitted ? '선택 완료' : '선택 중'}</span>
            </div>
          ))}
        </section>
      ) : (
        <>
          <section className="stack">
            <h2>양측 모두 선택</h2>
            {data.bothSelected.map((id) => (
              <div className="list-card" key={id}>
                <div className="icon-bubble">✓</div>
                <div className="label">{itemMap.get(id)}</div>
              </div>
            ))}
            {!data.bothSelected.length ? <p className="muted">공통 선택 항목이 아직 없어요.</p> : null}
          </section>

          <section className="stack">
            <h2>아직 합의되지 않은 항목</h2>
            {data.awaitingAgreement.map((id) => (
              <button
                key={id}
                type="button"
                className="list-card"
                style={{ width: '100%', border: 'none', textAlign: 'left' }}
                onClick={() => toggle(id)}
              >
                <div className="icon-bubble">{draft.includes(id) ? '✓' : '+'}</div>
                <div className="label">
                  {itemMap.get(id)}
                  <div className="muted" style={{ fontWeight: 500 }}>
                    {data.onlyA.includes(id)
                      ? `${memberA?.name || memberA?.email}만 선택`
                      : `${memberB?.name || memberB?.email}만 선택`}
                  </div>
                </div>
              </button>
            ))}
            {!data.awaitingAgreement.length ? (
              <p className="muted">차이가 있는 항목이 없습니다.</p>
            ) : null}
          </section>

          <section className="card stack">
            <strong>
              합의된 항목 {agreedCount}개, 합의중인 항목 {pendingCount}개
            </strong>
            <p className="muted">
              {data.awaitingAgreement.length
                ? '선택이 다른 항목이 있어요. 양쪽 선택을 맞춘 뒤에만 합의·결제로 넘어갈 수 있어요.'
                : myApproval
                  ? '상대방 승인을 기다리는 중이에요.'
                  : '양측이 같은 목록에 동의해야 다음 단계로 갈 수 있어요.'}
            </p>
            {data.agreement?.status === 'AGREED' ? (
              <button className="btn btn-primary" type="button" disabled>
                결제 화면으로 이동 중…
              </button>
            ) : data.awaitingAgreement.length ? (
              <Link className="btn btn-secondary" href="/scope">
                선택 맞추러 가기
              </Link>
            ) : myApproval ? (
              <button className="btn btn-primary" type="button" disabled>
                승인함 · 상대 대기
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={approve}
                disabled={busy || !draft.length}
              >
                {busy ? '처리 중…' : '이 목록으로 합의하기'}
              </button>
            )}
          </section>
        </>
      )}

      {error ? <p className="error">{error}</p> : null}
      <Link className="btn btn-secondary" href="/scope">
        내 선택 수정 / 다시 고르기
      </Link>
      <p className="muted">
        선택 화면에서 항목을 바꾼 뒤 다시 저장하거나, 선택 취소를 할 수 있어요.
        바꾸면 기존 합의는 다시 진행해야 합니다.
      </p>
    </main>
  );
}
