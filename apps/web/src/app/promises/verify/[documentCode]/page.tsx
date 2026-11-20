'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BrandMark } from '@/components/ui';
import { api } from '@/lib/api';

type VerifyResult = {
  documentCode: string;
  title: string;
  content: string;
  condition: string;
  status: string;
  completedAt: string | null;
  authorName: string;
  partnerName: string;
  authorSignedAt: string | null;
  partnerSignedAt: string | null;
  version: number;
  contentHash: string | null;
};

/** 공개 진위 확인 (QR 랜딩, 로그인 불필요) */
export default function PromiseVerifyPage() {
  const params = useParams<{ documentCode: string }>();
  const [data, setData] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void api<VerifyResult>(`/api/promises/verify/${params.documentCode}`, {
      auth: false,
    })
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : '인증된 문서를 찾을 수 없습니다.'),
      );
  }, [params.documentCode]);

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BrandMark />
        <span style={{ width: 42 }} />
        <span style={{ width: 42 }} />
      </div>

      <section className="stack">
        <h1 className="hero-title">약속 진위 확인</h1>
        <p className="muted">SEORO에 보관된 원본과 일치하는지 확인합니다.</p>
      </section>

      {error ? (
        <section className="card stack">
          <strong>인증된 문서를 찾을 수 없습니다</strong>
          <p className="muted">{error}</p>
        </section>
      ) : null}

      {data ? (
        <section className="card stack">
          <p className="eyebrow">Verified</p>
          <strong>{data.title}</strong>
          <div className="export-body stack">
            <strong>내용</strong>
            <p className="export-body__text">{data.content}</p>
            {data.condition?.trim() ? (
              <>
                <strong>조건</strong>
                <p className="export-body__text">{data.condition}</p>
              </>
            ) : null}
          </div>
          <div className="meta">
            <span>인증번호</span>
            <span>{data.documentCode}</span>
          </div>
          <div className="meta">
            <span>상태</span>
            <span>{data.status === 'COMPLETED' ? '양측 서명 완료 · 유효' : data.status}</span>
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
          <div className="meta">
            <span>작성자 서명</span>
            <span>
              {data.authorSignedAt
                ? new Date(data.authorSignedAt).toLocaleString('ko-KR')
                : '-'}
            </span>
          </div>
          <div className="meta">
            <span>상대 서명</span>
            <span>
              {data.partnerSignedAt
                ? new Date(data.partnerSignedAt).toLocaleString('ko-KR')
                : '-'}
            </span>
          </div>
          <p className="muted">
            버전 {data.version}
            {data.contentHash ? ` · 원본 해시 ${data.contentHash.slice(0, 12)}…` : ''}
          </p>
        </section>
      ) : !error ? (
        <p className="muted">확인 중…</p>
      ) : null}

      <Link className="btn btn-ghost" href="/">
        SEORO로
      </Link>
    </main>
  );
}
