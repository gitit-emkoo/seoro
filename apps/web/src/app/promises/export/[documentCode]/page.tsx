'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { BackButton, BrandMark } from '@/components/ui';
import { api, getToken } from '@/lib/api';

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

export default function PromiseExportPage() {
  const router = useRouter();
  const params = useParams<{ documentCode: string }>();
  const documentCode = params.documentCode;
  const [data, setData] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [toast, setToast] = useState('');

  const verifyUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/promises/verify/${documentCode}`;
  }, [documentCode]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void api<VerifyResult>(`/api/promises/verify/${documentCode}`, { auth: false })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : '불러오기 실패'));
  }, [documentCode, router]);

  useEffect(() => {
    if (!verifyUrl) return;
    void QRCode.toDataURL(verifyUrl, { margin: 1, width: 220 }).then(setQrDataUrl);
  }, [verifyUrl]);

  function onDownload() {
    window.print();
  }

  async function onEmail() {
    if (!data) return;
    const subject = encodeURIComponent(`[SEORO] 약속 기록 — ${data.title}`);
    const body = encodeURIComponent(
      [
        'SEORO에서 확정된 약속 기록입니다.',
        '',
        `제목: ${data.title}`,
        `인증번호: ${data.documentCode}`,
        `작성자: ${data.authorName}`,
        `상대: ${data.partnerName}`,
        `확정: ${data.completedAt ? new Date(data.completedAt).toLocaleString('ko-KR') : '-'}`,
        '',
        '내용:',
        data.content,
        data.condition ? '' : null,
        data.condition ? `조건: ${data.condition}` : null,
        '',
        '진위 확인:',
        verifyUrl,
      ]
        .filter((line) => line != null)
        .join('\n'),
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setToast('메일 작성 창을 열었습니다.');
  }

  return (
    <main className="shell stack-lg export-page">
      <div className="topbar no-print">
        <BackButton href="/promises" />
        <BrandMark />
        <span style={{ width: 42 }} />
      </div>

      <section className="stack no-print">
        <h1 className="hero-title">내보내기</h1>
        <p className="muted">인증된 약속을 문서로 내보낼 수 있어요</p>
      </section>

      {error ? <p className="error no-print">{error}</p> : null}

      {data ? (
        <section className="card stack export-sheet" id="export-sheet">
          <p className="eyebrow">SEORO Promise Record</p>
          <strong style={{ fontSize: '1.25rem' }}>{data.title}</strong>

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

          {/* 인증 메타+QR: 인쇄 시 한 덩어리로 유지 (본문은 여러 페이지 허용) */}
          <div className="export-attest stack">
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
                {data.completedAt
                  ? new Date(data.completedAt).toLocaleString('ko-KR')
                  : '-'}
              </span>
            </div>
            <div className="meta">
              <span>버전</span>
              <span>{data.version}</span>
            </div>
            {data.contentHash ? (
              <p className="muted">원본 해시 {data.contentHash.slice(0, 16)}…</p>
            ) : null}

            <div className="export-qr stack">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="진위 확인 QR" width={180} height={180} />
              ) : (
                <p className="muted">QR 생성 중…</p>
              )}
              <p className="muted" style={{ textAlign: 'center' }}>
                QR을 스캔하면 이 문서의 진위를 확인할 수 있습니다.
              </p>
              <p className="muted" style={{ textAlign: 'center', wordBreak: 'break-all' }}>
                {verifyUrl}
              </p>
            </div>
          </div>
        </section>
      ) : !error ? (
        <p className="muted">불러오는 중…</p>
      ) : null}

      <section className="stack no-print">
        <button className="btn btn-primary" type="button" disabled={!data} onClick={onDownload}>
          다운로드
        </button>
        <button className="btn btn-secondary" type="button" disabled={!data} onClick={() => void onEmail()}>
          이메일
        </button>
        {toast ? <p className="muted">{toast}</p> : null}
        <Link className="btn btn-ghost" href="/promises">
          목록으로
        </Link>
      </section>
    </main>
  );
}
