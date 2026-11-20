'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BrandMark } from '@/components/ui';
import { api } from '@/lib/api';

type VerifyResult = {
  documentCode: string;
  title: string;
  status: string;
  completedAt: string | null;
  authorName: string;
  partnerName: string;
  authorSignedAt: string | null;
  partnerSignedAt: string | null;
  version: number;
  contentHash: string | null;
};

export default function PromiseVerifyPage() {
  const params = useParams<{ documentCode: string }>();
  const [data, setData] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void api<VerifyResult>(`/api/promises/verify/${params.documentCode}`, {
      auth: false,
    })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : '확인 실패'));
  }, [params.documentCode]);

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BrandMark />
        <span style={{ width: 42 }} />
        <span style={{ width: 42 }} />
      </div>

      <section className="stack">
        <h1 className="hero-title">약속 인증 확인</h1>
        <p className="muted">서로에 보관된 약속 기록의 진위를 확인합니다.</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      {data ? (
        <section className="card stack">
          <strong>{data.title}</strong>
          <div className="meta">
            <span>인증번호</span>
            <span>{data.documentCode}</span>
          </div>
          <div className="meta">
            <span>상태</span>
            <span>{data.status === 'COMPLETED' ? '양측 서명 완료' : data.status}</span>
          </div>
          <div className="meta">
            <span>작성자</span>
            <span>{data.authorName}</span>
          </div>
          <div className="meta">
            <span>상대</span>
            <span>{data.partnerName}</span>
          </div>
          <div className="meta">
            <span>확정 시각</span>
            <span>
              {data.completedAt ? new Date(data.completedAt).toLocaleString('ko-KR') : '-'}
            </span>
          </div>
          <p className="muted">버전 {data.version} · 원본 해시 {data.contentHash?.slice(0, 12)}…</p>
        </section>
      ) : !error ? (
        <p className="muted">확인 중…</p>
      ) : null}

      <Link className="btn btn-ghost" href="/">
        서로로
      </Link>
    </main>
  );
}
