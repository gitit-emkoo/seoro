'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUBMISSION_STATUS_LABEL, type SubmissionStatus } from '@seoro/shared';
import { BackButton, BrandMark } from '@/components/ui';
import { api, getToken } from '@/lib/api';

type ReportItem = {
  title: string;
  status: SubmissionStatus;
  statusNote: string | null;
  submittedAt?: string | null;
};

type MyReport = {
  allSubmitted: boolean;
  completeness?: {
    total: number;
    completed: number;
    allSubmitted: boolean;
    pendingTitles: string[];
  };
  items: Array<ReportItem & { submitted: boolean }>;
};

type Disclosure = {
  mutualReady: boolean;
  submissionCompleteness?: {
    pendingTitles: string[];
  };
  members: Array<{
    userId: string;
    name: string | null;
    email: string;
    status: string;
    isMe: boolean;
  }>;
};

type PersonReport = {
  userId: string;
  name: string | null;
  email: string;
  items: ReportItem[];
};

type Mutual = {
  note: string;
  partner: PersonReport | null;
  me: PersonReport;
};

function PersonSection({
  title,
  person,
}: {
  title: string;
  person: PersonReport;
}) {
  return (
    <section className="stack">
      <div className="section-head">
        <h2>{title}</h2>
      </div>
      <p className="muted">{person.name || person.email}</p>
      {person.items.map((item) => (
        <div className="card stack" key={`${person.userId}-${item.title}`}>
          <strong>{item.title}</strong>
          <div className="meta">
            <span>상태</span>
            <span>
              {SUBMISSION_STATUS_LABEL[item.status as SubmissionStatus] ?? item.status}
            </span>
          </div>
          {item.statusNote ? <p className="muted">{item.statusNote}</p> : null}
        </div>
      ))}
    </section>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [report, setReport] = useState<MyReport | null>(null);
  const [disclosure, setDisclosure] = useState<Disclosure | null>(null);
  const [mutual, setMutual] = useState<Mutual | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [myReport, disc] = await Promise.all([
      api<MyReport>('/api/reports/me'),
      api<Disclosure>('/api/disclosure/me'),
    ]);
    setReport(myReport);
    setDisclosure(disc);

    if (!myReport.allSubmitted) {
      setMutual(null);
      return;
    }

    if (disc.mutualReady) {
      const mutualReport = await api<Mutual>('/api/reports/mutual');
      setMutual(mutualReport);
    } else {
      setMutual(null);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void load().catch((err) => setError(err instanceof Error ? err.message : '불러오기 실패'));
  }, [router]);

  async function consent() {
    setBusy(true);
    setError('');
    try {
      await api('/api/disclosure/consent', { method: 'POST' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '공개 동의 실패');
    } finally {
      setBusy(false);
    }
  }

  const allSubmitted = report?.allSubmitted ?? false;
  const pendingTitles =
    report?.completeness?.pendingTitles ??
    disclosure?.submissionCompleteness?.pendingTitles ??
    [];
  const myConsented =
    disclosure?.members.find((m) => m.isMe)?.status === 'CONSENTED';
  const mutualReady = Boolean(disclosure?.mutualReady);

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BackButton href="/home" />
        <BrandMark />
        <span style={{ width: 42 }} />
      </div>

      <section className="stack">
        <h1 className="hero-title">확인 결과</h1>
        <p className="muted">점수로 환산하지 않으며, 미검증은 미검증으로 표시합니다.</p>
      </section>

      {!allSubmitted ? (
        <section className="card stack">
          <strong>합의 항목을 모두 제출해 주세요</strong>
          <p className="muted">
            모든 자료를 첨부한 뒤에 내 보고서를 확인하고, 상대방에게 공개할 수 있어요.
            {pendingTitles.length ? ` 남은 항목: ${pendingTitles.join(', ')}` : ''}
          </p>
          <Link className="btn btn-primary" href="/submissions">
            제출하러 가기
          </Link>
        </section>
      ) : mutualReady && mutual ? (
        <>
          {mutual.partner ? (
            <PersonSection title="상대방 결과" person={mutual.partner} />
          ) : null}
          <PersonSection title="나의 결과" person={mutual.me} />
          <p className="muted">{mutual.note}</p>
        </>
      ) : (
        <>
          <section className="stack">
            <div className="section-head">
              <h2>나의 결과</h2>
            </div>
            {report?.items.map((item, idx) => (
              <div className="card stack" key={`${item.title}-${idx}`}>
                <strong>{item.title}</strong>
                <div className="meta">
                  <span>상태</span>
                  <span>{SUBMISSION_STATUS_LABEL[item.status]}</span>
                </div>
                {item.statusNote ? <p className="muted">{item.statusNote}</p> : null}
              </div>
            ))}
          </section>

          {!myConsented ? (
            <section className="card stack">
              <strong>상대방에게 결과 공개</strong>
              <p className="muted">양측이 모두 동의한 뒤에만 서로의 결과를 볼 수 있어요.</p>
              {disclosure?.members.map((m) => (
                <div className="list-card" key={m.userId}>
                  <div className="icon-bubble">{m.status === 'CONSENTED' ? '✓' : '…'}</div>
                  <div className="label">
                    {m.name || m.email}
                    {m.isMe ? ' (나)' : ''}
                  </div>
                  <span className="muted">
                    {m.status === 'CONSENTED' ? '공개 동의' : '대기'}
                  </span>
                </div>
              ))}
              <button className="btn btn-primary" disabled={busy} onClick={() => void consent()}>
                {busy ? '처리 중…' : '내 결과 공개에 동의'}
              </button>
            </section>
          ) : (
            <section className="card stack">
              <strong>상대방 공개를 기다리는 중</strong>
              <p className="muted">
                나의 공개는 완료됐어요. 상대방도 공개하면 서로의 결과를 볼 수 있습니다.
              </p>
            </section>
          )}
        </>
      )}

      {error ? <p className="error">{error}</p> : null}
      <Link className="btn btn-ghost" href="/home">
        서로확인 메인으로
      </Link>
      {mutualReady ? (
        <Link className="btn btn-secondary" href="/app">
          앱 홈으로
        </Link>
      ) : null}
    </main>
  );
}
